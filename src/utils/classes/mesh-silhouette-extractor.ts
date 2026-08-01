import * as THREE from "three";

export type ScreenCircle = {
  cx: number;
  cy: number;
  r: number;
};

type Point2D = {
  x: number;
  y: number;
};

class MeshSilhouetteExtractor {
  private readonly k: number;
  private readonly stride: number;

  constructor(k = 3, stride = 4) {
    this.k = k;
    this.stride = stride;
  }

  public extract = (
    mesh: THREE.Mesh,
    camera: THREE.Camera,
    width: number,
    height: number,
  ): ScreenCircle[] => {
    const points = this.projectVertices(mesh, camera, width, height);
    if (points.length < this.k) return [];

    const clusters = this.kMeans(points);
    return clusters.map((cluster) => this.boundingCircle(cluster));
  };

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
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttr.count; i += this.stride) {
      vertex.fromBufferAttribute(positionAttr, i);
      vertex.applyMatrix4(matrixWorld);
      vertex.project(camera);

      if (vertex.z > 1) continue;

      const { x, y } = vertex;
      points.push({
        x: (x * 0.5 + 0.5) * width,
        y: (-y * 0.5 + 0.5) * height,
      });
    }

    return points;
  };

  private distSq = (pointA: Point2D, pointB: Point2D): number => {
    const { x: ax, y: ay } = pointA;
    const { x: bx, y: by } = pointB;
    return (ax - bx) ** 2 + (ay - by) ** 2;
  };

  private findNearestCentroidIndex = (
    point: Point2D,
    centroids: Point2D[],
  ): number => {
    let nearestIndex = 0;
    let minDist = Infinity;

    for (let centroidIdx = 0; centroidIdx < centroids.length; centroidIdx++) {
      const dist = this.distSq(point, centroids[centroidIdx]);
      if (dist >= minDist) continue;
      minDist = dist;
      nearestIndex = centroidIdx;
    }

    return nearestIndex;
  };

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

  private kMeans = (points: Point2D[]): Point2D[][] => {
    const { k } = this;
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

        if (Math.abs(newX - oldX) > 0.5 || Math.abs(newY - oldY) > 0.5)
          converged = false;

        centroids[centroidIdx] = { x: newX, y: newY };
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
      const dist = Math.sqrt(this.distSq(point, center));
      if (dist <= r) continue;
      r = dist;
    }

    return { cx, cy, r };
  };
}

export default MeshSilhouetteExtractor;
