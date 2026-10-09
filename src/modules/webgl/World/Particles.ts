import * as THREE from "three";
import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";
import GUIStateRegistry from "@utils/classes/gui-state-registry";

import vertexShader from "@shaders/particles/vertex.glsl";
import fragmentShader from "@shaders/particles/fragment.glsl";

type ParticlesState = {
  uSize: number;
};

type ParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uSize: ParticlesState["uSize"];
}>;

class Particles extends PointsEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "particles-gui-state",
    geometry: {
      radius: 3,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.SphereGeometry;
  protected material: TypedShaderMaterial<ParticlesUniforms>;
  protected points: THREE.Points;

  protected override readonly DEBUG_DEFAULTS: ParticlesState = {
    uSize: 0.4,
  };
  protected guiRegistry: GUIStateRegistry<ParticlesState> | null = null;

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

    console.log("Particles");
  }

  protected setGeometry(): void {
    const { radius } = Particles.CONFIG.geometry;

    this.geometry = new THREE.SphereGeometry(radius);
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;
    const { uSize } = this.DEBUG_DEFAULTS;

    const uniforms: ParticlesUniforms = {
      uResolution: {
        value: new THREE.Vector2(x, y),
      },
      uSize: new THREE.Uniform(uSize),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    }) as TypedShaderMaterial<ParticlesUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  protected override addDebugFolders(): void {
    const { guiKey } = Particles.CONFIG;
    const registry = new GUIStateRegistry<ParticlesState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const particlesFolder = gui.addFolder("Particles");

    particlesFolder.add(state, "uSize").min(0).max(1).step(0.001);
    registry.bind("uSize", (v) => {
      this.material.uniforms.uSize.value = v;
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

export default Particles;
