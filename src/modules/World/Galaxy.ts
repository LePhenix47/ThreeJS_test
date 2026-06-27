import * as THREE from "three";

import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { MeshEntity } from "./types/entity";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type GalaxyState = {
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
};

// ! A galaxy is NOT a mesh, need to create new abstract class
class Galaxy extends MeshEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private guiRegistry: GUIStateRegistry<GalaxyState> | null = null;

  private readonly debugDefaults: GalaxyState = {
    count: 100_000,
    size: 0.01,
    radius: 5,
    branches: 3,
    spin: 1,
    randomness: 1,
    randomnessPower: 2.5,
    insideColor: "#a0c0d6",
    outsideColor: "#be7b73",
    squash: 0.2,
    edgeUniformityPower: 5,
  };

  protected geometry: THREE.BufferGeometry;

  protected material: THREE.PointsMaterial;

  private get scene() {
    return this.experience!.scene;
  }

  private get time() {
    return this.experience!.time;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Water");
  }

  protected setGeometry = (): void => {
    const geometry = new THREE.BufferGeometry();

    const { count, radius, edgeUniformityPower, insideColor, outsideColor } =
      this.debugDefaults;

    const itemSize: number = 3;
    const positions = new Float32Array(count * itemSize);
    const colors = new Float32Array(count * itemSize);

    for (let i = 0; i < positions.length; i += itemSize) {
      // * Positions

      /*
       * Math.pow(u, n) biases a uniform [0,1) value toward 0.
       * The higher edgeUniformityPower, the more stars cluster near the center.
       */
      const edgeUniformityValue: number = Math.pow(
        Math.random(),
        edgeUniformityPower,
      );
      const randomRadius: number = edgeUniformityValue * radius;

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
      const heightFalloff: number = 1 - randomRadius / radius;
      positions[i + 1] = additionalRandomness.y * heightFalloff;
      // ? z
      positions[i + 2] =
        Math.sin(branchAngle + spinAngle) * randomRadius +
        additionalRandomness.z;

      // * Colors
      const mixedColor = new THREE.Color(insideColor);
      mixedColor.lerp(new THREE.Color(outsideColor), randomRadius / radius);
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

    this.geometry = geometry;
  };

  protected setMaterial = (): void => {
    const { size, insideColor } = this.debugDefaults;

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(insideColor),
      size: size,
      sizeAttenuation: true,
      depthWrite: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  };

  protected setPoints = (): void => {};

  private addDebugFolders = () => {};

  public update = (): void => {};

  public destroy = (): void => {};
}
