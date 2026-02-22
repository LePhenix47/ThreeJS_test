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
  squash: number;
}>;

/**
 * Creates and manages a spiral galaxy as a Three.js {@link THREE.Points} particle system.
 *
 * Stars are placed along spiral arms using polar-to-Cartesian conversion,
 * with configurable density distribution, scatter randomness, and color gradients.
 *
 * @example
 * const galaxy = new GalaxyCreator({ branches: 5, spin: 1.5 });
 * scene.add(galaxy.createPoints());
 */
class GalaxyCreator {
  private points: THREE.Points | null = null;

  /** Total number of stars rendered in the galaxy. */
  count: number;

  /** Visual size of each star point (in world units). */
  size: number;

  /** Maximum radial distance a star can spawn from the center (in world units). */
  radius: number;

  /** Number of spiral arms. */
  branches: number;

  /**
   * Arm twist factor — how much each arm curves as it extends outward.
   * Scales linearly with distance: a star at full `radius` is rotated by `spin` radians.
   * Positive = counter-clockwise twist, negative = clockwise.
   */
  spin: number;

  /** Maximum scatter offset applied to each star's position (in world units). */
  randomness: number;

  /**
   * Power applied to the scatter magnitude, shaping how far from the arm stars scatter.
   * Higher values cluster scatter tightly around the arm; lower values spread it more uniformly.
   */
  randomnessPower: number;

  /** Hex color of stars near the galactic center (e.g. `"#ff8800"`). */
  insideColor: string;

  /** Hex color of stars near the outer edge (e.g. `"#1b3984"`). */
  outsideColor: string;

  /**
   * Controls radial density distribution.
   * Achieved by raising a uniform random value to this power, biasing sampling toward 0.
   * Higher values concentrate more stars near the center; `1` = uniform distribution.
   */
  edgeUniformityPower: number;

  /**
   * Vertical flattening factor applied to the scatter's Y component.
   * `0` = completely flat disc (no vertical scatter), `1` = spherical scatter.
   * Values around 0.2–0.3 give a realistic galaxy disc shape.
   */
  squash: number;

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
    squash = 0.2,
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
    this.squash = squash;
  }

  /*
   * Methods
   */
  /**
   * Generates a random 3D scatter offset using uniform sphere sampling.
   *
   * Direction is sampled uniformly across the sphere (avoiding pole clustering),
   * magnitude follows a power-law distribution controlled by `randomnessPower`,
   * and the Y component is scaled down by `squash` to flatten the scatter into a disc.
   *
   * @returns A `{x, y, z}` offset to apply to a star's spiral arm position.
   */
  private generateSphericalRandomness = (): {
    x: number;
    y: number;
    z: number;
  } => {
    const theta: number = Math.random() * 2 * Math.PI;

    const phi: number = Math.acos(2 * Math.random() - 1);

    const radiusRandomnessBase: number = Math.random() * this.randomness;
    const rho: number = Math.pow(radiusRandomnessBase, this.randomnessPower);

    const xzPlanes3dRadius = rho * Math.sin(phi);

    return {
      x: xzPlanes3dRadius * Math.cos(theta),
      z: xzPlanes3dRadius * Math.sin(theta),
      y: rho * Math.cos(phi) * this.squash,
    };
  };

  /**
   * Computes the base angular position of a star on its spiral arm.
   *
   * Divides the full `2π` revolution evenly among `branches`, assigning each star
   * to an arm based on its index (e.g. `3 branches` → `0°`, `120`°, `240°` periodic).
   *
   * @param index - The star's position index in the buffer (not the byte offset).
   * @returns The branch angle in radians.
   */
  private computeBranchAngle = (index: number) => {
    const oneRevolution: number = 2 * Math.PI;
    const indexOffset: number = index % this.branches;

    return (indexOffset * oneRevolution) / this.branches;
  };

  /**
   * Computes the twist angle added to a star based on its distance from the center.
   *
   * Stars farther from the center accumulate more rotation, creating the characteristic
   * spiral curve. The twist grows linearly with `randomRadius`.
   *
   * @param randomRadius - The star's distance from the galactic center.
   * @returns The spin angle in radians.
   */
  private computeSpinAngle = (randomRadius: number) => {
    return randomRadius * this.spin;
  };

  /**
   * Builds the {@link THREE.BufferGeometry} containing positions and vertex colors for all stars.
   *
   * For each star, computes a center-biased random radius, places it on a spiral arm
   * via polar-to-Cartesian conversion, applies spherical scatter, and blends its color
   * from `insideColor` to `outsideColor` based on distance from the center.
   *
   * @returns A populated `BufferGeometry` with `position` and `color` attributes.
   */
  private generateBufferGeometry = () => {
    const geometry = new THREE.BufferGeometry();
    // * In groups of 3 for the X, Y and Z coordinates
    const itemSize: number = 3;
    const positions = new Float32Array(this.count * itemSize);
    const colors = new Float32Array(this.count * itemSize);

    for (let i = 0; i < positions.length; i += itemSize) {
      // * Positions

      /*
       * Math.pow(u, n) biases a uniform [0,1) value toward 0.
       * The higher edgeUniformityPower, the more stars cluster near the center.
       */
      const edgeUniformityValue: number = Math.pow(
        Math.random(),
        this.edgeUniformityPower,
      );
      const randomRadius: number = edgeUniformityValue * this.radius;

      const actualIndex: number = i / itemSize;

      /*
       * Distribute stars evenly across arms by assigning each star an arm based on its index.
       * e.g. with 3 branches: arm 0 → 0°, arm 1 → 120°, arm 2 → 240°.
       */
      const branchAngle: number = this.computeBranchAngle(actualIndex);

      /*
       * Twist that increases with distance from the center, creating the spiral curve.
       * Stars farther from the center are rotated by a larger angle.
       */
      const spinAngle: number = this.computeSpinAngle(randomRadius);

      const additionalRandomness = this.generateSphericalRandomness();

      /*
       * Convert polar coords to Cartesian on the XZ plane.

       * branchAngle + spinAngle gives the star's angular position on its spiral arm.
       * 
       * Multiplying by randomRadius sets how far from the center the star sits.
       * 
       * additionalRandomness scatters it off the arm for a natural, cloudy look.
       */
      // ? x
      positions[i] =
        Math.cos(branchAngle + spinAngle) * randomRadius +
        additionalRandomness.x;
      // ? y — taper vertical scatter with distance: full spread at the center (bulge), none at the edge (flat disc).
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

  /**
   * Creates the {@link THREE.PointsMaterial} used to render the stars.
   *
   * Uses additive blending for a glowing effect and enables vertex colors
   * so each star can be individually tinted by the geometry's color buffer.
   *
   * @returns A configured `PointsMaterial`.
   */
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

  /**
   * Generates the galaxy geometry and material, assembles them into a
   * {@link THREE.Points} object, and returns it ready to be added to the scene.
   *
   * @returns The galaxy as a `THREE.Points` object named `"galaxy"`.
   */
  public createPoints = () => {
    const geometry = this.generateBufferGeometry();
    const material = this.generateMaterial();

    this.points = new THREE.Points(geometry, material);
    this.points.name = "galaxy";
    return this.points;
  };

  /**
   * Disposes of the galaxy's geometry and material to free GPU memory.
   *
   * Safe to call even if `createPoints` has not been called yet.
   * After disposal, the internal `points` reference is set to `null`.
   */
  public dispose = (): void => {
    if (!this.points) return;

    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();

    this.points = null;
  };
}

export default GalaxyCreator;
