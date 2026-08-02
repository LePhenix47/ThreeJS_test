import CircleTextLayout, {
  type TextRun,
} from "@utils/classes/circle-text-layout";
import type { ScreenCircle } from "@utils/classes/mesh-silhouette-extractor";
import { distance } from "@utils/numbers/math";
import type {
  MeshData,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@utils/types/hologram-layout-worker.types";

type Point2D = {
  x: number;
  y: number;
};

/**
 * Runs the full hologram layout pipeline inside a Web Worker.
 *
 * Owns the text layout and all the silhouette math. Receives raw geometry
 * data from the main thread (Float32Arrays + matrices), produces circles
 * and text runs, and posts them back.
 */
class HologramLayoutWorker {
  private textLayout: CircleTextLayout | null = null;

  constructor() {
    self.onmessage = ({ data }: MessageEvent<WorkerInboundMessage>) => {
      switch (data.type) {
        case "init": {
          const { text, font, lineHeight, horizontalPadding, verticalPadding } =
            data;
          this.textLayout = new CircleTextLayout(
            text,
            font,
            lineHeight,
            horizontalPadding,
            verticalPadding,
          );
          break;
        }
        case "tick": {
          this.tick(data);
          break;
        }
        default: {
          const _exhaustive: never = data;
          console.warn(
            "[hologram-layout.worker] Unknown message type:",
            _exhaustive,
          );
        }
      }
    };
  }

  /**
   * Projects vertex positions to screen pixels using the combined camera+model matrix.
   *
   * Three.js matrices are column-major, so the layout in memory is:
   * [ col0: m0 m1 m2 m3 | col1: m4 m5 m6 m7 | col2: m8 m9 m10 m11 | col3: m12 m13 m14 m15 ]
   * A point (x, y, z, 1) multiplied by this matrix gives:
   *   x' = m[0]*x + m[4]*y + m[8]*z + m[12]
   *   y' = m[1]*x + m[5]*y + m[9]*z + m[13]
   *   w' = m[3]*x + m[7]*y + m[11]*z + m[15]  ← perspective divide
   */
  private projectVertices = (
    positions: Float32Array,
    combinedMatrix: Float32Array,
    stride: number,
    width: number,
    height: number,
  ): Point2D[] => {
    const points: Point2D[] = [];
    const m = combinedMatrix;

    for (let i = 0; i < positions.length; i += stride * 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const w = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (w === 0) continue;

      const ndcX = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
      const ndcY = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
      const ndcZ = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;

      /* z > 1 means vertex is behind the near plane */
      if (ndcZ > 1) continue;

      points.push({
        x: (ndcX * 0.5 + 0.5) * width,
        /* NDC y is flipped relative to screen y */
        y: (-ndcY * 0.5 + 0.5) * height,
      });
    }

    return points;
  };

  private findNearestCentroidIndex = (
    point: Point2D,
    centroids: Point2D[],
  ): number => {
    let nearestIndex = 0;
    let minDist = Infinity;

    for (let i = 0; i < centroids.length; i++) {
      const { x: cx, y: cy } = centroids[i];
      const { x: px, y: py } = point;
      /* squared distance — avoids a sqrt per vertex */
      const dist = distance(px - cx, py - cy, { noSqrt: true });
      if (dist >= minDist) continue;
      minDist = dist;
      nearestIndex = i;
    }

    return nearestIndex;
  };

  private assignToClusters = (
    points: Point2D[],
    centroids: Point2D[],
  ): Point2D[][] => {
    const k = centroids.length;
    const clusters: Point2D[][] = Array.from({ length: k }, () => []);

    for (const point of points) {
      const nearestIdx = this.findNearestCentroidIndex(point, centroids);
      clusters[nearestIdx].push(point);
    }

    return clusters;
  };

  private kMeans = (points: Point2D[], k: number): Point2D[][] => {
    /* seed centroids evenly to avoid all starting at the same spot */
    const step = Math.floor(points.length / k);
    let centroids = Array.from({ length: k }, (_, i) => ({ ...points[i * step] }));

    for (let iteration = 0; iteration < 20; iteration++) {
      const clusters = this.assignToClusters(points, centroids);
      let converged = true;

      for (let idx = 0; idx < k; idx++) {
        const cluster = clusters[idx];
        if (cluster.length === 0) continue;

        const { length } = cluster;
        const newX = cluster.reduce((sum, { x }) => sum + x, 0) / length;
        const newY = cluster.reduce((sum, { y }) => sum + y, 0) / length;
        const { x: oldX, y: oldY } = centroids[idx];

        /* 0.5px threshold — sub-pixel movement is close enough to converged */
        if (Math.abs(newX - oldX) > 0.5 || Math.abs(newY - oldY) > 0.5)
          converged = false;

        centroids[idx] = { x: newX, y: newY };
      }

      if (converged) break;
    }

    return this.assignToClusters(points, centroids).filter(
      (cluster) => cluster.length > 0,
    );
  };

  private boundingCircle = (points: Point2D[]): ScreenCircle => {
    const { length } = points;
    const cx = points.reduce((sum, { x }) => sum + x, 0) / length;
    const cy = points.reduce((sum, { y }) => sum + y, 0) / length;
    const center: Point2D = { x: cx, y: cy };

    let r = 0;
    for (const point of points) {
      const { x: px, y: py } = point;
      const dist = distance(px - center.x, py - center.y);
      if (dist <= r) continue;
      r = dist;
    }

    return { cx, cy, r };
  };

  private extractCircles = (
    meshData: MeshData,
    width: number,
    height: number,
  ): ScreenCircle[] => {
    const { positions, combinedMatrix, stride, k } = meshData;
    const points = this.projectVertices(
      positions,
      combinedMatrix,
      stride,
      width,
      height,
    );

    /* can't form k clusters with fewer points */
    if (points.length < k) return [];

    const clusters = this.kMeans(points, k);
    return clusters.map(this.boundingCircle);
  };

  private tick = (
    data: Extract<WorkerInboundMessage, { type: "tick" }>,
  ): void => {
    const { textLayout } = this;
    if (!textLayout) return;

    const { meshes, width, height } = data;

    const circles: ScreenCircle[] = meshes.flatMap((mesh) =>
      this.extractCircles(mesh, width, height),
    );
    const runs: TextRun[] = textLayout.layout(width, height, circles);

    self.postMessage(
      { type: "result", circles, runs } satisfies WorkerOutboundMessage,
    );
  };
}

new HologramLayoutWorker();
