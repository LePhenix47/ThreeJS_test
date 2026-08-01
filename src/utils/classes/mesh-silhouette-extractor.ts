import * as THREE from "three";

import { distance } from "@utils/numbers/math";

export type ScreenCircle = {
  cx: number;
  cy: number;
  r: number;
};

type Point2D = {
  x: number;
  y: number;
};

/**
 * Approximates a single mesh's screen-space silhouette as `k` circles.
 *
 * Projects a sampled subset of the mesh's vertices to screen space,
 * clusters them with k-means, then fits a bounding circle to each cluster.
 * The resulting circles are used as obstacles for text layout.
 */
class MeshSilhouetteExtractor {
  private readonly k: number;
  private readonly stride: number;

  /**
   * @param k - Number of silhouette circles to produce. Higher = better coverage
   *   for complex shapes, but more expensive layout computation.
   * @param stride - Vertex sampling step. `1` = every vertex; `4` = every 4th.
   *   Increase to reduce cost on high-poly meshes.
   */
  constructor(k = 3, stride = 4) {
    this.k = k;
    this.stride = stride;
  }

  /**
   * Projects the mesh's vertices to screen space and returns `k` bounding circles.
   *
   * @param mesh - The mesh to extract a silhouette from.
   * @param camera - Used to project vertices into NDC.
   * @param width - Viewport width in pixels.
   * @param height - Viewport height in pixels.
   * @returns Up to `k` screen-space circles approximating the mesh silhouette.
   */
  public extract = (
    mesh: THREE.Mesh,
    camera: THREE.Camera,
    width: number,
    height: number,
  ): ScreenCircle[] => {
    const points = this.projectVertices(mesh, camera, width, height);
    /* can't form k clusters with fewer points — mesh likely off-screen or degenerate */
    if (points.length < this.k) return [];

    const clusters = this.kMeans(points);
    return clusters.map((cluster) => this.boundingCircle(cluster));
  };

  /**
   * Samples the mesh's position buffer and projects each vertex to pixel screen space
   * via normalized device coordinates (NDC). Vertices behind the camera are discarded.
   */
  private projectVertices = (
    mesh: THREE.Mesh,
    camera: THREE.Camera,
    width: number,
    height: number,
  ): Point2D[] => {
    const { geometry, matrixWorld } = mesh;
    const positionAttr = geometry.attributes.position;
    if (!positionAttr) return [];

    const points: Point2D[] = [];
    /* reuse one Vector3 across iterations to avoid per-vertex allocations */
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttr.count; i += this.stride) {
      vertex.fromBufferAttribute(positionAttr, i);
      /* local → world space */
      vertex.applyMatrix4(matrixWorld);
      /* world → normalized device coordinates (NDC): x/y/z each in [-1, 1] */
      vertex.project(camera);

      /* z > 1 means vertex is behind the near plane — skip */
      if (vertex.z > 1) continue;

      const { x, y } = vertex;
      points.push({
        /* NDC x [-1,1] → pixel [0, width]; NDC y is inverted relative to screen Y */
        x: (x * 0.5 + 0.5) * width,
        y: (-y * 0.5 + 0.5) * height,
      });
    }

    return points;
  };

  /** Returns the index of the centroid closest to `point`. */
  private findNearestCentroidIndex = (
    point: Point2D,
    centroids: Point2D[],
  ): number => {
    let nearestIndex = 0;
    let minDist = Infinity;

    for (let centroidIdx = 0; centroidIdx < centroids.length; centroidIdx++) {
      const { x: cx, y: cy } = centroids[centroidIdx];
      const { x: px, y: py } = point;
      /* squared distance is sufficient for comparison — avoids a sqrt per vertex */
      const dist = distance(px - cx, py - cy, { noSqrt: true });
      if (dist >= minDist) continue;
      minDist = dist;
      nearestIndex = centroidIdx;
    }

    return nearestIndex;
  };

  /** Assigns each point to the cluster of its nearest centroid. */
  private assignToClusters = (
    points: Point2D[],
    centroids: Point2D[],
  ): Point2D[][] => {
    const { k } = this;
    const clusters: Point2D[][] = Array.from({ length: k }, () => []);

    for (const point of points) {
      const nearestIdx = this.findNearestCentroidIndex(point, centroids);
      clusters[nearestIdx].push(point);
    }

    return clusters;
  };

  /**
   * Runs Lloyd's k-means algorithm on screen-space points and returns the final clusters.
   * Empty clusters (can occur when a centroid drifts away from all points) are filtered out.
   */
  private kMeans = (points: Point2D[]): Point2D[][] => {
    const { k } = this;
    /* seed centroids evenly across the point array to avoid all starting at the same spot */
    const step = Math.floor(points.length / k);
    let centroids = Array.from({ length: k }, (_, i) => ({
      ...points[i * step],
    }));

    for (let iteration = 0; iteration < 20; iteration++) {
      const clusters = this.assignToClusters(points, centroids);
      let converged = true;

      for (let centroidIdx = 0; centroidIdx < k; centroidIdx++) {
        const cluster = clusters[centroidIdx];
        if (cluster.length === 0) continue;

        const { length } = cluster;
        const newX = cluster.reduce((sum, { x }) => sum + x, 0) / length;
        const newY = cluster.reduce((sum, { y }) => sum + y, 0) / length;
        const { x: oldX, y: oldY } = centroids[centroidIdx];

        /* 0.5px threshold — sub-pixel movement is close enough to converged */
        if (Math.abs(newX - oldX) > 0.5 || Math.abs(newY - oldY) > 0.5)
          converged = false;

        centroids[centroidIdx] = { x: newX, y: newY };
      }

      if (converged) break;
    }

    /* final assignment on stable centroids; filter removes any empty clusters */
    return this.assignToClusters(points, centroids).filter(
      (cluster) => cluster.length > 0,
    );
  };

  /**
   * Fits a circle to a cluster of points.
   * Center is the cluster's centroid; radius is the distance to the farthest point.
   *
   * Note: this is a conservative enclosing circle, not the minimum enclosing circle —
   * it may be slightly larger than optimal, but is cheap to compute per frame.
   */
  private boundingCircle = (points: Point2D[]): ScreenCircle => {
    const { length } = points;
    /* centroid = mean position of all cluster points */
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
}

export default MeshSilhouetteExtractor;
