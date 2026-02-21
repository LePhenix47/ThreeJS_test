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
  insideColor: THREE.Color;
  outsideColor: THREE.Color;

  constructor({
    count = 100_000,
    size = 0.01,
    radius = 5,
    branches = 3,
    spin = 1,
    randomness = 1,
    randomnessPower = 2.5,
    insideColor = "#182a36",
    outsideColor = "#be7b73",
  }: GalaxyParams = {}) {
    this.count = count;
    this.size = size;
    this.radius = radius;
    this.branches = branches;
    this.spin = spin;
    this.randomness = randomness;
    this.randomnessPower = randomnessPower;
    this.insideColor = new THREE.Color(insideColor);
    this.outsideColor = new THREE.Color(outsideColor);
  }

  /*
   * Methods
   */
  private generateRandomRandomness = (): number => {
    const randomnessBase: number = Math.random() * this.randomness;
    const sign: number = Math.random() < 0.5 ? -1 : 1;

    const finalRandomness: number =
      Math.pow(randomnessBase, this.randomnessPower) * sign;

    return finalRandomness;
  };

  private generateBufferGeometry = () => {
    const geometry = new THREE.BufferGeometry();
    // * In groups of 3 for the X, Y and Z coordinates
    const itemSize: number = 3;
    const positions = new Float32Array(this.count * itemSize);
    const colors = new Float32Array(this.count * itemSize);

    const oneRevolution: number = 2 * Math.PI;
    for (let i = 0; i < positions.length; i += itemSize) {
      // * Positions
      const randomRadius: number = Math.random() * this.radius;

      const actualIndex: number = i / itemSize;
      const branchAngle: number =
        ((actualIndex % this.branches) * oneRevolution) / this.branches;

      const spinAngle: number = randomRadius * this.spin;

      const additionalRandomness = {
        x: this.generateRandomRandomness(),
        y: this.generateRandomRandomness(),
        z: this.generateRandomRandomness(),
      } as const;
      // ? x
      positions[i] =
        Math.cos(branchAngle + spinAngle) * randomRadius +
        additionalRandomness.x;
      // ? y
      positions[i + 1] = additionalRandomness.y;
      // ? z
      positions[i + 2] =
        Math.sin(branchAngle + spinAngle) * randomRadius +
        additionalRandomness.z;

      // * Colors
      const mixedColor: THREE.Color = this.insideColor.clone();
      mixedColor.lerp(this.outsideColor, randomRadius / this.radius);
      // ? r
      colors[i] = mixedColor.r;
      // ? g
      colors[i + 1] = mixedColor.g;
      // ? b
      colors[i + 2] = mixedColor.b;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, itemSize),
    );

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, itemSize));

    return geometry;
  };

  private generateMaterial = () => {
    const material = new THREE.PointsMaterial({
      color: this.insideColor,
      size: this.size,
      sizeAttenuation: true,
      depthWrite: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
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
