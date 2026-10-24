import * as THREE from "three";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";
import { MapAsAttributes, TypedBufferGeometry } from "./types/attributes";
import { UvEnum } from "@utils/enums/space-color";
import Enum from "@utils/enums";
import NetworkGPGPU from "./NetworkGPGPU";
import type NetworkParticles from "./NetworkParticles";

import vertexShader from "@shaders/network-lines/vertex.glsl";
import fragmentShader from "@shaders/network-lines/fragment.glsl";

export type NetworkLinesConstructor = {
  /** Shared with `NetworkParticles`, owned by `Network`. Read from here, never disposed. */
  gpGpu: NetworkGPGPU;
  particleCount: number;
  /** Distance past which a line's alpha fades to 0. Shared with NetworkGPGPU's own neighbor-search cutoff. */
  maxDistance: number;
};

type NetworkLinesUniforms = MapAsUniforms<{
  uParticlesTexture: THREE.Texture;
  uNeighborsTexture: THREE.Texture;
  uGpgpuSize: number;
  uMaxDistance: number;
}>;

type NetworkLinesAttributes = MapAsAttributes<
  "aOwnerUv" | "aNeighborSlot" | "aEndpoint"
>;

class NetworkLines implements Updatable, Destroyable {
  public static readonly CONFIG = {
    /** How many of each particle's closest neighbors get a line. Matches neighbors.glsl's fixed K=4. */
    neighborCount: 4,
    /** Every line has exactly 2 vertices: the owner particle, and the neighbor it connects to. */
    verticesPerLine: 2,
  } as const;

  private readonly experience: Experience | null;
  private readonly gpGpu: NetworkGPGPU;
  private readonly particleCount: number;
  private readonly maxDistance: number;

  private geometry: TypedBufferGeometry<NetworkLinesAttributes>;
  private material: TypedShaderMaterial<NetworkLinesUniforms>;
  private lines: THREE.LineSegments;

  private get scene() {
    return this.experience!.scene;
  }

  constructor({
    gpGpu,
    particleCount,
    maxDistance,
  }: NetworkLinesConstructor) {
    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.gpGpu = gpGpu;
    this.particleCount = particleCount;
    this.maxDistance = maxDistance;

    this.setGeometry();
    this.setMaterial();
    this.setLines();

    this.scene.add(this.lines);

    console.log("NetworkLines");
  }

  private setGeometry(): void {
    const geometry = new THREE.BufferGeometry<NetworkLinesAttributes>();

    const { ownerUvArray, neighborSlotArray, endpointArray } =
      this.getLinesArrays();

    const uvStride: number = Enum.length(UvEnum);
    geometry.setAttribute(
      "aOwnerUv",
      new THREE.BufferAttribute(ownerUvArray, uvStride),
    );
    geometry.setAttribute(
      "aNeighborSlot",
      new THREE.BufferAttribute(neighborSlotArray, 1),
    );
    geometry.setAttribute(
      "aEndpoint",
      new THREE.BufferAttribute(endpointArray, 1),
    );

    // ? No "position" attribute exists on this geometry (gl_Position is computed from the others), but
    // ? WebGLRenderer determines vertex count from geometry.attributes.position.count specifically. Without
    // ? it, drawRange falls back to its Infinity default and the renderer silently skips the draw call entirely.
    geometry.setDrawRange(0, endpointArray.length);

    this.geometry = geometry;
  }

  /** Two vertices per neighbor slot, per particle: one line segment from each particle to each of its (up to) `neighborCount` neighbors. */
  private getLinesArrays(): {
    ownerUvArray: Float32Array;
    neighborSlotArray: Float32Array;
    endpointArray: Float32Array;
  } {
    const { neighborCount, verticesPerLine } = NetworkLines.CONFIG;
    const { size } = this.gpGpu;
    const { particleCount } = this;

    const vertexCount = particleCount * neighborCount * verticesPerLine;

    const uvStride: number = Enum.length(UvEnum);
    const ownerUvArray = new Float32Array(vertexCount * uvStride);
    const neighborSlotArray = new Float32Array(vertexCount);
    const endpointArray = new Float32Array(vertexCount);

    let vertex = 0;

    for (
      let particleIndex = 0;
      particleIndex < particleCount;
      particleIndex++
    ) {
      const { u, v } = this.particleIndexToUv(particleIndex, size);

      for (let neighborSlot = 0; neighborSlot < neighborCount; neighborSlot++) {
        // ? Each line needs 2 vertices: endpoint 0 = the owner particle itself, endpoint 1 = its neighbor at this slot
        for (
          let endpointIndex = 0;
          endpointIndex < verticesPerLine;
          endpointIndex++
        ) {
          const i2: number = vertex * uvStride;

          ownerUvArray[i2 + UvEnum.S] = u;
          ownerUvArray[i2 + UvEnum.T] = v;
          neighborSlotArray[vertex] = neighborSlot;
          endpointArray[vertex] = endpointIndex;

          vertex++;
        }
      }
    }

    return { ownerUvArray, neighborSlotArray, endpointArray };
  }

  /**
   * Converts a flat particle index into the GPGPU texture's UV. Mirrors indexToUv in the lines vertex shader.
   *
   * Same underlying formula as {@link NetworkParticles#getParticlesUvArray}'s `(x + 0.5) / size`, just entered from
   * a flat index instead of x/y loop variables. This file loops per-particle (not the full x/y grid), so
   * deriving x/y from the index here is simpler than restructuring the loop to match that one's shape.
   */
  private particleIndexToUv(
    index: number,
    size: number,
  ): { u: number; v: number } {
    const u: number = ((index % size) + 0.5) / size;
    const v: number = (Math.floor(index / size) + 0.5) / size;

    return { u, v };
  }

  private setMaterial(): void {
    const { maxDistance } = this;
    const { positionTexture, neighborsTexture, size } = this.gpGpu;

    const uniforms: NetworkLinesUniforms = {
      uParticlesTexture: { value: positionTexture },
      uNeighborsTexture: { value: neighborsTexture },
      uGpgpuSize: new THREE.Uniform(size),
      uMaxDistance: new THREE.Uniform(maxDistance),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }) as TypedShaderMaterial<NetworkLinesUniforms>;
  }

  private setLines(): void {
    const lines = new THREE.LineSegments(this.geometry, this.material);
    // ? Same reasoning as NetworkParticles: no "position" attribute, no real bounding sphere, disable culling
    lines.frustumCulled = false;

    this.lines = lines;
  }

  /** Live-updates the line fade distance, e.g. from a GUI change. */
  public setMaxDistance(value: number): void {
    this.material.uniforms.uMaxDistance.value = value;
  }

  public update(): void {
    // ? Ping-ponged: genuinely different texture objects every other frame, must be re-read, not just mutated
    const { uniforms } = this.material;
    uniforms.uParticlesTexture.value = this.gpGpu.positionTexture;
    uniforms.uNeighborsTexture.value = this.gpGpu.neighborsTexture;
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.lines);
  }
}

export default NetworkLines;
