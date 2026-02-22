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
  edgeUniformityPower: number;
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
  edgeUniformityPower: number;

  constructor({
    count = 100_000,
    size = 0.01,
    radius = 5,
    branches = 3,
    spin = 1,
    randomness = 1,
    randomnessPower = 2.5,
    insideColor = "#a0c0d6",
    outsideColor = "#be7b73",
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
    this.edgeUniformityPower = 5;
  }

  /*
   * Methods
   */
  private generateSphericalRandomness = (): {
    x: number;
    y: number;
    z: number;
  } => {
    const theta: number = Math.random() * 2 * Math.PI;
    const phi: number = Math.acos(2 * Math.random() - 1);
    const magnitude: number = Math.pow(
      Math.random() * this.randomness,
      this.randomnessPower,
    );

    return {
      x: magnitude * Math.sin(phi) * Math.cos(theta),
      y: magnitude * Math.cos(phi),
      z: magnitude * Math.sin(phi) * Math.sin(theta),
    };
  };

  private computeBranchAngle = (index: number) => {
    const oneRevolution: number = 2 * Math.PI;
    const indexOffset: number = index % this.branches;

    return (indexOffset * oneRevolution) / this.branches;
  };

  private computeSpinAngle = (randomRadius: number) => {
    return randomRadius * this.spin;
  };

  private generateBufferGeometry = () => {
    const geometry = new THREE.BufferGeometry();
    // * In groups of 3 for the X, Y and Z coordinates
    const itemSize: number = 3;
    const positions = new Float32Array(this.count * itemSize);
    const colors = new Float32Array(this.count * itemSize);

    for (let i = 0; i < positions.length; i += itemSize) {
      // * Positions
      const edgeUniformityValue: number = Math.pow(
        Math.random(),
        this.edgeUniformityPower,
      );
      const randomRadius: number = edgeUniformityValue * this.radius;

      const actualIndex: number = i / itemSize;
      const branchAngle: number = this.computeBranchAngle(actualIndex);

      const spinAngle: number = this.computeSpinAngle(randomRadius);

      const additionalRandomness = this.generateSphericalRandomness();

      // ? x
      positions[i] =
        Math.cos(branchAngle + spinAngle) * randomRadius +
        additionalRandomness.x;
      // ? y
      const heightFalloff: number = 1 - randomRadius / this.radius;
      positions[i + 1] = additionalRandomness.y * heightFalloff;
      // ? z
      positions[i + 2] =
        Math.sin(branchAngle + spinAngle) * randomRadius +
        additionalRandomness.z;

      // * Colors
      const mixedColor = new THREE.Color(this.insideColor);
      mixedColor.lerp(
        new THREE.Color(this.outsideColor),
        randomRadius / this.radius,
      );
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
      color: new THREE.Color(this.insideColor),
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
