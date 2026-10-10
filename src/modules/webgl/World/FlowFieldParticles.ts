import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import { PointsEntity } from "./types/points-entity";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";
import { MapAsAttributes, TypedBufferGeometry } from "./types/attributes";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import { UvEnum } from "@utils/enums/space-color";
import Enum from "@utils/enums";

import vertexShader from "@shaders/particles/vertex.glsl";
import fragmentShader from "@shaders/particles/fragment.glsl";
import FlowFieldGPGPU from "./FlowFieldGPGPU";

type FlowFieldParticlesState = {
  uSize: number;
  debugPlaneVisible: boolean;
};

type FlowFieldParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uSize: FlowFieldParticlesState["uSize"];
  uParticlesTexture: THREE.Texture;
}>;

type FlowFieldParticlesAttributes = MapAsAttributes<"aParticlesUv">;

class FlowFieldParticles
  extends PointsEntity
  implements Updatable, Destroyable
{
  public static readonly CONFIG = {
    guiKey: "particles-gui-state",
    seedGeometry: {
      radius: 3,
    },
    debugPlane: {
      size: 3,
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: TypedBufferGeometry<FlowFieldParticlesAttributes>;
  protected material: TypedShaderMaterial<FlowFieldParticlesUniforms>;
  protected points: THREE.Points;

  private gpGpu: FlowFieldGPGPU;
  /** Seed geometry's position attribute. Only used to build the GPGPU base texture, then discarded. */
  private seedPosition: THREE.BufferAttribute;

  private debugPlane: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  > | null = null;

  protected override readonly DEBUG_DEFAULTS: FlowFieldParticlesState = {
    uSize: 0.4,
    debugPlaneVisible: false,
  };
  protected guiRegistry: GUIStateRegistry<FlowFieldParticlesState> | null =
    null;

  private get scene() {
    return this.experience!.scene;
  }

  private get sizes() {
    return this.experience!.sizes;
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

    this.setSeedGeometry();
    this.setGPGPU();

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addDebugPlane();
      this.addDebugFolders();
    }

    console.log("FlowFieldParticles");
  }

  /** Seed-only sphere: its position attribute seeds the GPGPU texture, then it's discarded. */
  private setSeedGeometry(): void {
    const { radius } = FlowFieldParticles.CONFIG.seedGeometry;

    const seedGeometry = new THREE.SphereGeometry(radius);
    const { position } = seedGeometry.attributes;

    if (!(position instanceof THREE.BufferAttribute)) {
      throw new Error(
        "[FlowFieldParticles] Unexpected interleaved position attribute",
      );
    }

    this.seedPosition = position;
  }

  /** Builds the `GPUComputationRenderer` from the seed positions. */
  private setGPGPU(): void {
    this.gpGpu = new FlowFieldGPGPU({
      renderer: this.renderer.instance,
      positions: this.seedPosition,
    });
  }

  protected setGeometry(): void {
    const geometry = new THREE.BufferGeometry<FlowFieldParticlesAttributes>();

    const particlesUvArray: Float32Array<ArrayBufferLike> =
      this.getParticlesUvArray();

    const uvStride: number = Enum.length(UvEnum);
    geometry.setAttribute(
      "aParticlesUv",
      new THREE.BufferAttribute(particlesUvArray, uvStride),
    );
    // ? size*size always pads up to the next square, drop the leftover texels past the real count
    const { count } = this.seedPosition;
    geometry.setDrawRange(0, count);

    this.geometry = geometry;
  }

  /** One UV per particle, pointing at that particle's own texel in the GPGPU texture. */
  private getParticlesUvArray(): Float32Array {
    const { size } = this.gpGpu;
    const stride: number = Enum.length(UvEnum);
    const uvArray = new Float32Array(size ** 2 * stride);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i: number = y * size + x;
        const i2: number = i * stride;

        const uvS: number = (x + 0.5) / size;
        const uvT: number = (y + 0.5) / size;

        uvArray[i2 + UvEnum.S] = uvS;
        uvArray[i2 + UvEnum.T] = uvT;
      }
    }

    return uvArray;
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;
    const { uSize } = this.DEBUG_DEFAULTS;

    const uniforms: FlowFieldParticlesUniforms = {
      uResolution: {
        value: new THREE.Vector2(x, y),
      },
      uSize: new THREE.Uniform(uSize),
      uParticlesTexture: new THREE.Uniform(this.gpGpu.texture),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    }) as TypedShaderMaterial<FlowFieldParticlesUniforms>;
  }

  protected setPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  private addDebugPlane(): void {
    this.setDebugPlane();

    if (!this.debugPlane) return;
    this.scene.add(this.debugPlane);
  }

  private setDebugPlane(): void {
    const { size, position } = FlowFieldParticles.CONFIG.debugPlane;
    const { debugPlaneVisible } = this.DEBUG_DEFAULTS;

    const geometry = new THREE.PlaneGeometry(size, size);
    // ? depthTest/depthWrite off: a debug overlay should never be occluded by whatever's physically in front of it
    const material = new THREE.MeshBasicMaterial({
      map: this.gpGpu.texture,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const debugPlane = new THREE.Mesh(geometry, material);
    debugPlane.position.set(position.x, position.y, position.z);
    // ? With depth testing off, draw order is all that decides stacking, renderOrder makes sure this paints over the particles
    debugPlane.renderOrder = 1;
    debugPlane.visible = debugPlaneVisible;

    this.debugPlane = debugPlane;
  }

  protected override addDebugFolders(): void {
    const { guiKey } = FlowFieldParticles.CONFIG;
    const registry = new GUIStateRegistry<FlowFieldParticlesState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const particlesFolder = gui.addFolder("FlowFieldParticles");

    particlesFolder.add(state, "uSize").name("Size").min(0).max(1).step(0.001);
    registry.bind("uSize", (v) => {
      this.material.uniforms.uSize.value = v;
    });

    particlesFolder.add(state, "debugPlaneVisible").name("Show GPGPU debug");
    registry.bind("debugPlaneVisible", (v) => {
      if (!this.debugPlane) return;

      this.debugPlane.visible = v;
    });
  }

  public update(): void {
    this.gpGpu.update();

    // ? Ping-ponged: a genuinely different texture object every other frame, must be re-read, not just mutated
    const { texture } = this.gpGpu;
    this.material.uniforms.uParticlesTexture.value = texture;

    if (this.debugPlane) {
      this.debugPlane.material.map = texture;
    }
  }

  private destroyDebugPlane(): void {
    if (!this.debugPlane) return;

    this.scene.remove(this.debugPlane);
    this.debugPlane.geometry.dispose();
    this.debugPlane.material.dispose();

    this.debugPlane = null;
  }

  public destroy(): void {
    this.sizes.off("resize", this.onResize);

    this.guiRegistry?.dispose();
    this.destroyDebugPlane();

    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.points);
  }
}

export default FlowFieldParticles;
