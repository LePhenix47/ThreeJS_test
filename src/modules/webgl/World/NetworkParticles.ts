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
import NetworkGPGPU from "./NetworkGPGPU";

import vertexShader from "@shaders/network-particles/vertex.glsl";
import fragmentShader from "@shaders/network-particles/fragment.glsl";

export type NetworkParticlesConstructor = {
  /** Shared with `NetworkLines`, owned by `Network`. Read from here, never disposed. */
  gpGpu: NetworkGPGPU;
  particleCount: number;
};

type NetworkParticlesState = {
  uSize: number;
};

type NetworkParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uSize: NetworkParticlesState["uSize"];
  uParticlesTexture: THREE.Texture;
}>;

type NetworkParticlesAttributes = MapAsAttributes<"aParticlesUv">;

class NetworkParticles extends PointsEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "network-particles-gui-state",
  } as const;

  private readonly experience: Experience | null;
  private readonly gpGpu: NetworkGPGPU;
  private readonly particleCount: number;

  protected geometry: TypedBufferGeometry<NetworkParticlesAttributes>;
  protected material: TypedShaderMaterial<NetworkParticlesUniforms>;
  protected points: THREE.Points;

  protected readonly DEBUG_DEFAULTS: NetworkParticlesState = {
    uSize: 0.1,
  };
  protected guiRegistry: GUIStateRegistry<NetworkParticlesState> | null =
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

  constructor({ gpGpu, particleCount }: NetworkParticlesConstructor) {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.gpGpu = gpGpu;
    this.particleCount = particleCount;

    this.setGeometry();
    this.setMaterial();
    this.setPoints();

    this.scene.add(this.points);

    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("NetworkParticles");
  }

  protected setGeometry(): void {
    const geometry = new THREE.BufferGeometry<NetworkParticlesAttributes>();

    const uvArray: Float32Array = this.getParticlesUvArray();
    const uvStride: number = Enum.length(UvEnum);
    geometry.setAttribute(
      "aParticlesUv",
      new THREE.BufferAttribute(uvArray, uvStride),
    );

    // ? size*size always pads up to the next square, drop the leftover texels past the real count
    geometry.setDrawRange(0, this.particleCount);

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

        uvArray[i2 + UvEnum.S] = (x + 0.5) / size;
        uvArray[i2 + UvEnum.T] = (y + 0.5) / size;
      }
    }

    return uvArray;
  }

  protected setMaterial(): void {
    const { x, y } = this.sizes.resolution;
    const { uSize } = this.DEBUG_DEFAULTS;

    const uniforms: NetworkParticlesUniforms = {
      uResolution: { value: new THREE.Vector2(x, y) },
      uSize: new THREE.Uniform(uSize),
      uParticlesTexture: { value: this.gpGpu.positionTexture },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    }) as TypedShaderMaterial<NetworkParticlesUniforms>;
  }

  protected setPoints(): void {
    const points = new THREE.Points(this.geometry, this.material);
    // ? No "position" attribute on this geometry (positions come from the GPGPU texture in-shader), so
    // ? Three.js can't compute a real bounding sphere, it'd default to zero-radius at local origin and
    // ? cull the whole object the moment that one point leaves the frustum, even with particles still visible
    points.frustumCulled = false;

    this.points = points;
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  protected override addDebugFolders(): void {
    const { guiKey } = NetworkParticles.CONFIG;
    const registry = new GUIStateRegistry<NetworkParticlesState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const particlesFolder = gui.addFolder("NetworkParticles");

    particlesFolder.add(state, "uSize").min(0).max(1).step(0.001);
    registry.bind("uSize", (v) => {
      this.material.uniforms.uSize.value = v;
    });
  }

  public update(): void {
    // ? Ping-ponged: a genuinely different texture object every other frame, must be re-read, not just mutated
    this.material.uniforms.uParticlesTexture.value = this.gpGpu.positionTexture;
  }

  public destroy(): void {
    this.sizes.off("resize", this.onResize);

    this.guiRegistry?.dispose();

    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.points);
  }
}

export default NetworkParticles;
