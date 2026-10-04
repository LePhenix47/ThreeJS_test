import * as THREE from "three";
import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import vertexShader from "@shaders/particles/vertex.glsl";
import fragmentShader from "@shaders/particles/fragment.glsl";
import GUIStateRegistry from "@utils/classes/gui-state-registry";

type MorphParticlesState = {
  uSharpness: number;
};

type MorphParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uSize: number;
  uSharpness: MorphParticlesState["uSharpness"];
}>;

class MorphParticles extends PointsEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "morph-particles-gui-state",
    geometry: {
      radius: 3,
    },
    material: {
      size: 0.4,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.SphereGeometry;
  protected material: TypedShaderMaterial<MorphParticlesUniforms>;
  protected points: THREE.Points;

  protected override readonly DEBUG_DEFAULTS: MorphParticlesState = {
    uSharpness: 1.0,
  };
  protected guiRegistry: GUIStateRegistry<MorphParticlesState> | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get sizes() {
    return this.experience!.sizes;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("MorphParticles");
  }

  protected setGeometry(): void {
    const { radius } = MorphParticles.CONFIG.geometry;

    const geometry = new THREE.SphereGeometry(radius);

    // * See previous lesson: shader-particles-cursor-animation, we have many particles on the same location
    geometry.setIndex(null);

    this.geometry = geometry;
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;
    const { size } = MorphParticles.CONFIG.material;

    const { uSharpness } = this.DEBUG_DEFAULTS;

    const uniforms: MorphParticlesUniforms = {
      uResolution: {
        value: new THREE.Vector2(x, y),
      },
      uSize: new THREE.Uniform(size),
      uSharpness: new THREE.Uniform(uSharpness),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
    }) as TypedShaderMaterial<MorphParticlesUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  protected override addDebugFolders() {
    const { guiKey } = MorphParticles.CONFIG;
    const registry = new GUIStateRegistry(guiKey, this.DEBUG_DEFAULTS);

    this.guiRegistry = registry;

    const { gui } = this.debug;
    const folder = gui.addFolder("Morph particles");

    const { state } = registry;

    folder.add(state, "uSharpness").min(0).max(0.5).step(10e-6);
    registry.bind("uSharpness", (v) => {
      this.material.uniforms.uSharpness.value = v;
    });
  }

  public destroy(): void {
    this.sizes.off("resize", this.onResize);

    this.guiRegistry?.dispose();

    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.points);
  }
}

export default MorphParticles;
