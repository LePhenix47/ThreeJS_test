import * as THREE from "three";

import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { PointsEntity } from "./types/entity";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

import vertexShader from "@shaders/galaxy/vertex.glsl";
import fragmentShader from "@shaders/galaxy/fragment.glsl";
import { randomSignValue } from "@/utils/numbers/math";

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
   * Applied in the vertex shader, not the geometry CPU pass.
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
};

class Galaxy extends PointsEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private guiRegistry: GUIStateRegistry<GalaxyState> | null = null;
  private previewRegistry: GUIStateRegistry<{ visible: boolean }> | null = null;

  private readonly debugDefaults: GalaxyState = {
    count: 200_000,
    size: 0.005,
    radius: 5,
    branches: 3,
    spin: 1,
    randomness: 0.5,
    randomnessPower: 3,
    insideColor: "#ff6030",
    outsideColor: "#1b3984",
  };

  protected geometry: THREE.BufferGeometry;
  protected material: THREE.ShaderMaterial;
  protected points: THREE.Points;

  private previewGeometry: THREE.BufferGeometry | null = null;
  private previewMaterial: THREE.ShaderMaterial | null = null;
  private previewPoint: THREE.Points | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get time() {
    return this.experience!.time;
  }

  private get renderer() {
    return this.experience!.renderer;
  }

  private get state(): GalaxyState {
    return this.guiRegistry?.state || this.debugDefaults;
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
    const { branches } = this.state;

    const oneRevolution: number = 2 * Math.PI;
    const indexOffset: number = index % branches;

    return (indexOffset * oneRevolution) / branches;
  };

  protected setGeometry = (): void => {
    const geometry = new THREE.BufferGeometry();

    const {
      count,
      radius,
      insideColor,
      outsideColor,
      randomness,
      randomnessPower,
    } = this.state;

    const insideColorObj = new THREE.Color(insideColor);
    const outsideColorObj = new THREE.Color(outsideColor);

    const itemSize: number = 3;

    const positions = new Float32Array(count * itemSize);
    const colors = new Float32Array(count * itemSize);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * itemSize;

      const randomRadius = Math.random() * radius;
      const branchAngle = this.computeBranchAngle(i);

      /*
       * Signed power-law scatter: bias magnitude toward 0, then randomly flip sign.
       * Gives tight arm cores with occasional outliers.
       */
      const randomX =
        Math.pow(Math.random(), randomnessPower) *
        randomSignValue() *
        randomness *
        randomRadius;
      const randomY =
        Math.pow(Math.random(), randomnessPower) *
        randomSignValue() *
        randomness *
        randomRadius;
      const randomZ =
        Math.pow(Math.random(), randomnessPower) *
        randomSignValue() *
        randomness *
        randomRadius;

      // * Random positions
      positions[i3] = Math.cos(branchAngle) * randomRadius + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle) * randomRadius + randomZ;

      // * Random colors
      const mixedColor = insideColorObj.clone();
      mixedColor.lerp(outsideColorObj, randomRadius / radius);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      // * Random scales
      scales[i] = Math.random();
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, itemSize),
    );
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, itemSize));
    geometry.setAttribute("aScales", new THREE.BufferAttribute(scales, 1));

    this.geometry = geometry;
  };

  protected setMaterial = (): void => {
    const { size } = this.state;

    const material = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size * this.renderer.rendererPixelRatio },
      },
    });

    this.material = material;
  };

  protected setPoints = (): void => {
    const points = new THREE.Points(this.geometry, this.material);
    points.name = "galaxy";

    this.points = points;
  };

  private setPreviewGeometry = (): void => {
    const geometry = new THREE.BufferGeometry();

    const itemSize = 3;
    const position = new Float32Array([0, 0, 0]);
    const color = new Float32Array([1, 1, 1]);
    const scale = new Float32Array([1]);

    geometry.setAttribute("position", new THREE.BufferAttribute(position, itemSize));
    geometry.setAttribute("color", new THREE.BufferAttribute(color, itemSize));
    geometry.setAttribute("aScales", new THREE.BufferAttribute(scale, 1));

    this.previewGeometry = geometry;
  };

  private setPreviewMaterial = (): void => {
    this.previewMaterial = new THREE.ShaderMaterial({
      depthWrite: false,
      vertexColors: true,
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 2000 },
      },
    });
  };

  private setPreviewPoints = (): void => {
    if (!this.previewGeometry || !this.previewMaterial) return;

    this.previewPoint = new THREE.Points(this.previewGeometry, this.previewMaterial);
    this.previewPoint.visible = false;
    this.scene.add(this.previewPoint);
  };

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
      .min(0.01)
      .max(10.0)
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
      .addColor(state, "insideColor")
      .name("Center color")
      .onFinishChange(() => this.regenerate());

    galaxyFolder
      .addColor(state, "outsideColor")
      .name("Edge color")
      .onFinishChange(() => this.regenerate());

    this.setPreviewGeometry();
    this.setPreviewMaterial();
    this.setPreviewPoints();
    if (!this.previewPoint) return;

    const previewRegistry = new GUIStateRegistry<{ visible: boolean }>(
      "galaxy-preview-state",
      { visible: false },
    );
    this.previewRegistry = previewRegistry;

    this.previewPoint.visible = previewRegistry.state.visible;

    const debugFolder = this.debug.gui.addFolder("Shader debug");
    debugFolder
      .add(previewRegistry.state, "visible")
      .name("Show preview")
      .onChange((v: boolean) => {
        this.previewPoint!.visible = v;
      });
  };

  public update = (): void => {
    const t = this.time.elapsedSeconds;
    this.material.uniforms.uTime.value = t;

    if (this.previewMaterial) {
      this.previewMaterial.uniforms.uTime.value = t;
    }
  };

  private destroyPreview = (): void => {
    if (!this.previewPoint) return;

    this.scene.remove(this.previewPoint);
    this.previewGeometry?.dispose();
    this.previewMaterial?.dispose();
    this.previewRegistry?.dispose();
    this.previewPoint = null;
    this.previewGeometry = null;
    this.previewMaterial = null;
    this.previewRegistry = null;
  };

  public destroy = (): void => {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
    this.guiRegistry?.dispose();
    this.destroyPreview();
  };
}

export default Galaxy;
