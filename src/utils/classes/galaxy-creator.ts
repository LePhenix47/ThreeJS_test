import * as THREE from "three";
import { randomInRange } from "../numbers/range";

export type GalaxyParams = Partial<{
  count: number;
  size: number;
  radius: number;
  branches: number;
  spin: number;
  randomness: number;
  randomnessPower: number;
  insideColor: string;
  outsideColor: string;
}>;

class GalaxyCreator {
  private points: THREE.Points | null = null;

  count: number;
  size: number;
  radius: number;
  branches: number;
  spin: number;
  randomness: number;
  randomnessPower: number;
  insideColor: string;
  outsideColor: string;

  constructor({
    count = 1_000,
    size = 0.01,
    radius = 5,
    branches = 3,
    spin = 1,
    randomness = 0.2,
    randomnessPower = 3,
    insideColor = "white",
    outsideColor = "#1b3984",
  }: GalaxyParams = {}) {
    this.count = count;
    this.size = size;
    this.radius = radius;
    this.branches = branches;
    this.spin = spin;
    this.randomness = randomness;
    this.randomnessPower = randomnessPower;
    this.insideColor = insideColor;
    this.outsideColor = outsideColor;
  }

  /*
   * SETTERS
   */
  public setCount = (count: number): this => {
    this.count = count;
    return this;
  };

  public setSize = (size: number): this => {
    this.size = size;
    return this;
  };

  public setRadius = (radius: number): this => {
    this.radius = radius;
    return this;
  };

  public setBranches = (branches: number): this => {
    this.branches = branches;
    return this;
  };

  public setSpin = (spin: number): this => {
    this.spin = spin;
    return this;
  };

  public setRandomness = (randomness: number): this => {
    this.randomness = randomness;
    return this;
  };

  public setRandomnessPower = (randomnessPower: number): this => {
    this.randomnessPower = randomnessPower;
    return this;
  };

  /*
   * Methods
   */
  private generateBufferGeometry = () => {
    const geometry = new THREE.BufferGeometry();
    // * In groups of 3 for the X, Y and Z coordinates
    const itemSize: number = 3;
    const positions = new Float32Array(this.count * itemSize);

    const oneRevolution: number = 2 * Math.PI;
    for (let i = 0; i < positions.length; i += itemSize) {
      const radius: number = Math.random() * this.radius;

      const actualIndex: number = i / itemSize;
      const spinAngle: number = radius * this.spin;
      const branchAngle: number =
        ((actualIndex % this.branches) * oneRevolution) / this.branches;

      const additionalRandomness = {
        x: randomInRange([-1, 1]) * this.randomness,
        y: randomInRange([-1, 1]) * this.randomness,
        z: randomInRange([-1, 1]) * this.randomness,
      };

      // * x
      positions[i] =
        Math.cos(branchAngle + spinAngle) * radius + additionalRandomness.x;
      // * y
      positions[i + 1] = additionalRandomness.y;
      // * z
      positions[i + 2] =
        Math.sin(branchAngle + spinAngle) * radius + additionalRandomness.z;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, itemSize),
    );

    return geometry;
  };

  private generateMaterial = () => {
    const material = new THREE.PointsMaterial({
      color: this.insideColor,
      size: this.size,
      sizeAttenuation: true,
      depthWrite: true,
      blending: THREE.AdditiveBlending,
    });

    return material;
  };

  public createPoints = () => {
    const geometry = this.generateBufferGeometry();
    const material = this.generateMaterial();

    this.points = new THREE.Points(geometry, material);
    this.points.name = "galaxy";
    return this.points;
  };

  public dispose = (): void => {
    if (!this.points) return;

    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();

    this.points = null;
  };
}

export default GalaxyCreator;
