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
};

type StarsUniforms = MapAsUniforms<{
  uTime: number;
  uSize: number;
  uSharpness: number;
}>;

class Stars extends PreviewablePointsEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    count: 5_000,
    // ? Camera.CONFIG.far is 100, so the stars have to stay inside it or they get clipped
    minRadius: 60,
    maxRadius: 90,
    geometry: {
      size: 200,
      /** Strength of the 1/dist falloff. Higher = a bigger, softer glow around each star. */
      sharpness: 0.08,
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

    const positionAttribute = new THREE.BufferAttribute(positions, stride);

    geometry.setAttribute("position", positionAttribute);
    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const { size, sharpness } = Stars.CONFIG.geometry;

    const uniforms: StarsUniforms = {
      uTime: new THREE.Uniform(0),
      uSize: new THREE.Uniform(size * this.renderer.pixelRatio),
      uSharpness: new THREE.Uniform(sharpness),
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
    const { previewGeometry, previewMaterial } = this;
    if (!previewGeometry || !previewMaterial) return;

    const previewPoint = new THREE.Points(previewGeometry, previewMaterial);

    // ? The Earth is drawn in the transparent pass too, so this has to sort after it or the Earth would cover the preview
    previewPoint.renderOrder = 1;
    previewPoint.visible = this.debugDefaults.previewVisible;

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

    this.setPreviewGeometry();
    this.setPreviewMaterial();
    this.setPreviewPoints();

    const { previewPoint } = this;
    if (!previewPoint) return;

    this.scene.add(previewPoint);

    folder.add(state, "previewVisible").name("Show preview");
    registry.bind("previewVisible", (v) => {
      previewPoint.visible = v;
    });
  }

  public update(): void {
    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
  }

  protected destroyPreview(): void {
    const { previewPoint, previewGeometry, previewMaterial } = this;

    if (previewPoint) this.scene.remove(previewPoint);
    previewGeometry?.dispose();
    previewMaterial?.dispose();

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
