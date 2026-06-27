import * as THREE from "three";

import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { PointsEntity } from "./types/entity";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { generateSphericalRandomness } from "@/utils/placement/sphere-placement";

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

class Galaxy extends PointsEntity implements Updatable, Destroyable {
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
  protected points: THREE.Points;

  private get scene() {
    return this.experience!.scene;
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
    this.setPoints();

    this.scene.add(this.points);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Galaxy (bogos binted 👽)");
  }

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
    const { branches } = this.debugDefaults;

    const oneRevolution: number = 2 * Math.PI;
    const indexOffset: number = index % branches;

    return (indexOffset * oneRevolution) / branches;
  };

  protected setGeometry = (): void => {
    const geometry = new THREE.BufferGeometry();

    const {
      count,
      radius,
      edgeUniformityPower,
      insideColor,
      outsideColor,
      spin,
      randomness,
      randomnessPower,
      squash,
    } = this.debugDefaults;

    const itemSize: number = 3;
    const positions = new Float32Array(count * itemSize);
    const colors = new Float32Array(count * itemSize);

    for (let i = 0; i < positions.length; i += itemSize) {
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
      const spinAngle: number = randomRadius * spin;

      const additionalRandomness = generateSphericalRandomness({
        randomness,
        randomnessPower,
        squash,
      });

      /*
       * Convert polar coords to Cartesian on the XZ plane.
       * branchAngle + spinAngle gives the star's angular position on its spiral arm.
       * Multiplying by randomRadius sets how far from the center the star sits.
       * additionalRandomness scatters it off the arm for a natural, cloudy look.
       */
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

  protected setPoints = (): void => {
    const points = new THREE.Points(this.geometry, this.material);
    points.name = "galaxy";

    this.points = points;
  };

  // ! Uh we really do not have a choice in the matter here ???
  private regenerate = (): void => {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);
  };

  private addDebugFolders = (): void => {
    const registry = new GUIStateRegistry<GalaxyState>(
      "galaxy-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    /* Apply any sessionStorage-restored values immediately. */
    this.regenerate();

    const { state } = registry;
    const galaxyFolder = this.debug.gui.addFolder("Galaxy");

    galaxyFolder
      .add(state, "count")
      .name("Star count")
      .min(1e3) // ? 1k
      .max(200e3) // ? 200k
      .step(1e3)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .add(state, "size")
      .name("Star size")
      .min(0.001)
      .max(0.1)
      .step(0.001)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .add(state, "radius")
      .name("Radius")
      .min(0.01)
      .max(20)
      .step(0.01)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .add(state, "branches")
      .name("Arm count")
      .min(2)
      .max(20)
      .step(1)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .add(state, "spin")
      .name("Arm twist")
      .min(-5)
      .max(5)
      .step(0.001)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .add(state, "randomness")
      .name("Scatter radius")
      .min(0)
      .max(2)
      .step(0.001)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .add(state, "randomnessPower")
      .name("Scatter clustering")
      .min(1)
      .max(10)
      .step(0.001)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .add(state, "edgeUniformityPower")
      .name("Center density")
      .min(1)
      .max(10)
      .step(0.1)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .add(state, "squash")
      .name("Y squash")
      .min(0)
      .max(1)
      .step(0.01)
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .addColor(state, "insideColor")
      .name("Center color")
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .addColor(state, "outsideColor")
      .name("Edge color")
      .onFinishChange(() => this.regenerate());
  };

  public update = (): void => {};

  public destroy = (): void => {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.guiRegistry?.dispose();
  };
}

export default Galaxy;
