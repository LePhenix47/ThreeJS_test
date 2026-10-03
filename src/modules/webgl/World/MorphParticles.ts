import * as THREE from "three";
import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";

import vertexShader from "@shaders/particles/vertex.glsl";
import fragmentShader from "@shaders/particles/fragment.glsl";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type MorphParticlesState = {};

type MorphParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uSize: number;
}>;

class MorphParticles extends PointsEntity implements Destroyable {
  public static readonly CONFIG = {
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

  protected override readonly DEBUG_DEFAULTS: MorphParticlesState = {};
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

    this.geometry = new THREE.SphereGeometry(radius);
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;
    const { size } = MorphParticles.CONFIG.material;

    const uniforms: MorphParticlesUniforms = {
      uResolution: {
        value: new THREE.Vector2(x, y),
      },
      uSize: new THREE.Uniform(size),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
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
    const registry = new GUIStateRegistry(
      "morph-particles-state-registry",
      this.DEBUG_DEFAULTS,
    );

    this.guiRegistry = registry;

    const { gui } = this.debug;
    const folder = gui.addFolder("Morph particles");

    const { state } = registry;
  }

  public destroy(): void {
    this.sizes.off("resize", this.onResize);

    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.points);
  }
}

export default MorphParticles;
