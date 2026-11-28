import * as THREE from "three";
import gsap from "gsap";
import { MeshEntity } from "./types/mesh-entity";
import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import vertexShader from "@shaders/loading-plane-backdrop/vertex.glsl";
import fragmentShader from "@shaders/loading-plane-backdrop/fragment.glsl";

type LoadingPlaneBackdropUniforms = MapAsUniforms<{
  uProgressPercent: number;
  uResolution: THREE.Vector2;
}>;

type LoadingPlaneBackdropState = {
  progressPercent: number;
};

/** Full-screen quad covering the scene while resources load, faded out via GSAP once loading finishes. */
class LoadingPlaneBackdrop extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "loading-plane-backdrop-gui-state",
    fadeOutDuration: 1,
  } as const;

  private readonly experience: Experience;
  protected geometry: THREE.PlaneGeometry;
  protected material: TypedShaderMaterial<LoadingPlaneBackdropUniforms>;
  protected mesh: THREE.Mesh;
  private fadeTween: gsap.core.Tween | null = null;
  protected override guiRegistry: GUIStateRegistry<LoadingPlaneBackdropState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: LoadingPlaneBackdropState = {
    progressPercent: 0,
  };

  private get scene() {
    return this.experience.scene;
  }

  private get resources() {
    return this.experience.resources;
  }

  private get debug() {
    return this.experience.debug;
  }

  private get globalUniforms() {
    return this.experience.globalUniforms;
  }

  constructor() {
    super();
    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();
    this.scene.add(this.mesh);

    this.resources.on("textures-loaded", this.fadeOut);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("LoadingPlaneBackdrop");
  }

  protected setGeometry(): void {
    this.geometry = new THREE.PlaneGeometry(2, 2);
  }

  protected setMaterial(): void {
    const { progressPercent } = this.DEBUG_DEFAULTS;

    const uniforms: LoadingPlaneBackdropUniforms = {
      uProgressPercent: { value: progressPercent },
      ...this.globalUniforms.uniforms,
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }) as TypedShaderMaterial<LoadingPlaneBackdropUniforms>;
  }

  protected setMesh(): void {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    // ? Bounding-sphere frustum culling assumes world-space geometry, this quad bypasses the
    // ? camera entirely in its vertex shader, so culling would be checked against the wrong space
    mesh.frustumCulled = false;
    this.mesh = mesh;
  }

  private fadeOut = (): void => {
    const { fadeOutDuration } = LoadingPlaneBackdrop.CONFIG;

    this.fadeTween = gsap.fromTo(
      this.material.uniforms.uProgressPercent,
      { value: 0 },
      { value: 1, duration: fadeOutDuration },
    );
  };

  protected override addDebugFolders(): void {
    const { guiKey } = LoadingPlaneBackdrop.CONFIG;
    const registry = new GUIStateRegistry<LoadingPlaneBackdropState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const folder = gui.addFolder("Loading Plane Backdrop");

    folder
      .add(state, "progressPercent")
      .min(0)
      .max(1)
      .step(0.01)
      .name("Progress (debug scrub)");
    registry.bind("progressPercent", (v) => {
      this.material.uniforms.uProgressPercent.value = v;
    });
  }

  public destroy(): void {
    this.fadeTween?.kill();
    this.resources.off("textures-loaded", this.fadeOut);

    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
    this.guiRegistry?.dispose();
  }
}

export default LoadingPlaneBackdrop;
