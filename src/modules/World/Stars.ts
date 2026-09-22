import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { PreviewablePointsEntity } from "./types/points-entity";
import Enum from "@/utils/enums";
import { SpaceEnum } from "@/utils/enums/space-color";
import { getRandomUniformSpherePlacement } from "@/utils/placement/sphere-placement";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import vertexShader from "@shaders/stars/vertex.glsl";
import fragmentShader from "@shaders/stars/fragment.glsl";

type StarsState = {
  previewVisible: boolean;
  uSharpness: number;
};

type StarsUniforms = MapAsUniforms<{
  uTime: number;
  uSize: number;
  uSharpness: StarsState["uSharpness"];
}>;

class Stars extends PreviewablePointsEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    count: 5_000,
    // ? Camera.CONFIG.far is 100, so the stars have to stay inside it or they get clipped
    minRadius: 60,
    maxRadius: 90,
    geometry: {
      size: 200,
    },
    preview: {
      size: 1_500,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.BufferGeometry;
  protected material: TypedShaderMaterial<StarsUniforms>;
  protected points: THREE.Points;

  protected previewGeometry: THREE.BufferGeometry | null = null;
  protected previewMaterial: THREE.ShaderMaterial | null = null;
  protected previewPoint: THREE.Points | null = null;

  private guiRegistry: GUIStateRegistry<StarsState> | null = null;

  private readonly debugDefaults: StarsState = {
    previewVisible: false,
    uSharpness: 0.08,
  };

  private get scene() {
    return this.experience!.scene;
  }

  private get time() {
    return this.experience!.time;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get renderer() {
    return this.experience!.renderer;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    if (this.debug?.isActive) {
      this.addPreview();

      this.addDebugFolders();
    }

    console.log("Stars");
  }

  protected setGeometry(): void {
    const { count, minRadius, maxRadius } = Stars.CONFIG;
    const geometry = new THREE.BufferGeometry();

    const stride: number = Enum.length(SpaceEnum);
    const positions = new Float32Array(count * stride);

    for (let i = 0; i < count; i++) {
      const i3: number = i * stride;
      const { x, y, z } = getRandomUniformSpherePlacement(minRadius, maxRadius);

      positions[i3 + SpaceEnum.X] = x;
      positions[i3 + SpaceEnum.Y] = y;
      positions[i3 + SpaceEnum.Z] = z;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, stride),
    );
    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const { size } = Stars.CONFIG.geometry;

    const { uSharpness } = this.debugDefaults;

    const uniforms: StarsUniforms = {
      uTime: new THREE.Uniform(0),
      uSize: new THREE.Uniform(size * this.renderer.pixelRatio),
      uSharpness: new THREE.Uniform(uSharpness),
    };

    this.material = new THREE.ShaderMaterial({
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader,
      fragmentShader,
      uniforms,
    }) as TypedShaderMaterial<StarsUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private addPreview(): void {
    this.setPreviewGeometry();
    this.setPreviewMaterial();
    this.setPreviewPoints();

    if (!this.previewPoint) return;
    this.scene.add(this.previewPoint);
  }

  protected setPreviewGeometry(): void {
    const geometry = new THREE.BufferGeometry();

    const stride: number = Enum.length(SpaceEnum);
    const position = new Float32Array(stride); // ? At the origin, the camera always orbits around it

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(position, stride),
    );
    this.previewGeometry = geometry;
  }

  protected setPreviewMaterial(): void {
    const { size } = Stars.CONFIG.preview;
    const { uTime, uSharpness } = this.material.uniforms;

    // ? Time and sharpness are the star material's own uniform objects, so one update reaches both
    const uniforms: StarsUniforms = {
      uTime,
      uSize: new THREE.Uniform(size),
      uSharpness,
    };

    this.previewMaterial = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader,
      fragmentShader,
      uniforms,
    });
  }

  protected setPreviewPoints(): void {
    if (!this.previewGeometry || !this.previewMaterial) return;

    const { previewVisible } = this.debugDefaults;

    const previewPoint = new THREE.Points(
      this.previewGeometry,
      this.previewMaterial,
    );

    // ? The atmosphere shell is transparent too and sits at the same distance, so this has to sort after it or the shell would paint over the preview
    previewPoint.renderOrder = 1;
    previewPoint.visible = previewVisible;

    this.previewPoint = previewPoint;
  }

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<StarsState>(
      "stars-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const folder = gui.addFolder("Stars");

    folder
      .add(state, "uSharpness")
      .name("Sharpness")
      .min(0.0)
      .max(1)
      .step(0.01);
    registry.bind("uSharpness", (v) => {
      this.material.uniforms.uSharpness.value = v;
    });

    folder.add(state, "previewVisible").name("Show preview");
    registry.bind("previewVisible", (v) => {
      if (!this.previewPoint) return;

      this.previewPoint.visible = v;
    });
  }

  public update(): void {
    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
  }

  protected destroyPreview(): void {
    if (this.previewPoint) this.scene.remove(this.previewPoint);
    this.previewGeometry?.dispose();
    this.previewMaterial?.dispose();

    this.previewPoint = null;
    this.previewGeometry = null;
    this.previewMaterial = null;
  }

  public destroy(): void {
    this.guiRegistry?.dispose();
    this.destroyPreview();

    this.scene.remove(this.points);

    this.geometry.dispose();
    this.material.dispose();
  }
}

export default Stars;
