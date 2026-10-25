import * as THREE from "three";
import type GUI from "lil-gui";
import type { Controller } from "lil-gui";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import { MapAsUniforms, TypedShaderMaterial } from "./types/uniforms";
import { MapAsAttributes, TypedBufferGeometry } from "./types/attributes";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import { UvEnum } from "@utils/enums/space-color";
import Enum from "@utils/enums";
import NetworkGPGPU from "./NetworkGPGPU";

import vertexShader from "@shaders/network-lines/vertex.glsl";
import fragmentShader from "@shaders/network-lines/fragment.glsl";

export type NetworkLinesConstructor = {
  /** Shared with `NetworkParticles`, owned by `Network`. Read from here, never disposed. */
  gpGpu: NetworkGPGPU;
  particleCount: number;
  /** Distance past which a line's alpha fades to 0. Shared with NetworkGPGPU's own neighbor-search cutoff. */
  maxDistance: number;
  /** Shared GUI folder from `Network`, this builds its own child folder under it. Null when debug tools are off. */
  parentFolder: GUI | null;
};

type NetworkLinesState = {
  uLineWidth: number;
};

type NetworkLinesUniforms = MapAsUniforms<{
  uParticlesTexture: THREE.Texture;
  uNeighborsTexture: THREE.Texture;
  uGpgpuSize: number;
  uMaxDistance: number;
  uLineWidth: NetworkLinesState["uLineWidth"];
}>;

type NetworkLinesAttributes = MapAsAttributes<
  "aOwnerUv" | "aNeighborSlot" | "aEndpoint" | "aSide"
>;

/** One corner of a line's quad: which endpoint it's near, and which edge (side) of the quad it is. */
type QuadCorner = { endpoint: number; side: number };

class NetworkLines implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "network-lines-gui-state",
    /** How many of each particle's closest neighbors get a line. Matches neighbors.glsl's fixed K=4. */
    neighborCount: 4,
  } as const;

  /** Each line's quad as 2 non-indexed triangles: (0,1,2) and (3,4,5), 6 vertices, endpoint 0 = owner, 1 = neighbor. */
  private static readonly QUAD_CORNERS: readonly QuadCorner[] = [
    { endpoint: 0, side: -1 },
    { endpoint: 0, side: 1 },
    { endpoint: 1, side: -1 },
    { endpoint: 0, side: 1 },
    { endpoint: 1, side: 1 },
    { endpoint: 1, side: -1 },
  ];

  private readonly experience: Experience | null;
  private readonly gpGpu: NetworkGPGPU;
  private readonly particleCount: number;
  private readonly maxDistance: number;
  private readonly parentFolder: GUI | null;

  private geometry: TypedBufferGeometry<NetworkLinesAttributes>;
  private material: TypedShaderMaterial<NetworkLinesUniforms>;
  private lines: THREE.Mesh;

  private readonly DEBUG_DEFAULTS: NetworkLinesState = {
    uLineWidth: 0.03,
  };
  private guiRegistry: GUIStateRegistry<NetworkLinesState> | null = null;
  /** Line width GUI slider, its max is kept capped to the sibling `Particles` folder's `uSize`. */
  private lineWidthController: Controller | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  constructor({
    gpGpu,
    particleCount,
    maxDistance,
    parentFolder,
  }: NetworkLinesConstructor) {
    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.gpGpu = gpGpu;
    this.particleCount = particleCount;
    this.maxDistance = maxDistance;
    this.parentFolder = parentFolder;

    this.setGeometry();
    this.setMaterial();
    this.setLines();

    this.scene.add(this.lines);

    if (this.parentFolder) {
      this.addDebugFolders();
    }

    console.log("NetworkLines");
  }

  private setGeometry(): void {
    const geometry = new THREE.BufferGeometry<NetworkLinesAttributes>();

    const { ownerUvArray, neighborSlotArray, endpointArray, sideArray } =
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
    geometry.setAttribute("aSide", new THREE.BufferAttribute(sideArray, 1));

    // ? No "position" attribute exists on this geometry (gl_Position is computed from the others), but
    // ? WebGLRenderer determines vertex count from geometry.attributes.position.count specifically. Without
    // ? it, drawRange falls back to its Infinity default and the renderer silently skips the draw call entirely.
    geometry.setDrawRange(0, endpointArray.length);

    this.geometry = geometry;
  }

  /** 6 vertices (2 triangles, a quad) per neighbor slot, per particle: one line from each particle to each of its (up to) `neighborCount` neighbors. */
  private getLinesArrays(): {
    ownerUvArray: Float32Array;
    neighborSlotArray: Float32Array;
    endpointArray: Float32Array;
    sideArray: Float32Array;
  } {
    const { neighborCount } = NetworkLines.CONFIG;
    const { QUAD_CORNERS } = NetworkLines;
    const { size } = this.gpGpu;
    const { particleCount } = this;

    const vertexCount = particleCount * neighborCount * QUAD_CORNERS.length;

    const uvStride: number = Enum.length(UvEnum);
    const ownerUvArray = new Float32Array(vertexCount * uvStride);
    const neighborSlotArray = new Float32Array(vertexCount);
    const endpointArray = new Float32Array(vertexCount);
    const sideArray = new Float32Array(vertexCount);

    let vertex: number = 0;

    for (
      let particleIndex = 0;
      particleIndex < particleCount;
      particleIndex++
    ) {
      const { u, v } = this.particleIndexToUv(particleIndex, size);

      for (let neighborSlot = 0; neighborSlot < neighborCount; neighborSlot++) {
        for (const corner of QUAD_CORNERS) {
          const i2: number = vertex * uvStride;

          ownerUvArray[i2 + UvEnum.S] = u;
          ownerUvArray[i2 + UvEnum.T] = v;

          neighborSlotArray[vertex] = neighborSlot;
          endpointArray[vertex] = corner.endpoint;
          sideArray[vertex] = corner.side;

          vertex++;
        }
      }
    }

    return { ownerUvArray, neighborSlotArray, endpointArray, sideArray };
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
    const { uLineWidth } = this.DEBUG_DEFAULTS;
    const { positionTexture, neighborsTexture, size } = this.gpGpu;

    const uniforms: NetworkLinesUniforms = {
      uParticlesTexture: new THREE.Uniform(positionTexture),
      uNeighborsTexture: new THREE.Uniform(neighborsTexture),
      uGpgpuSize: new THREE.Uniform(size),
      uMaxDistance: new THREE.Uniform(maxDistance),
      uLineWidth: new THREE.Uniform(uLineWidth),
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      // ? Each quad's winding order is fixed in the vertex data, but lines point in arbitrary 3D
      // ? directions, so whichever ones wind clockwise from the camera get backface-culled under
      // ? the FrontSide default. DoubleSide renders both windings, correct for a flat colored ribbon.
      side: THREE.DoubleSide,
    }) as TypedShaderMaterial<NetworkLinesUniforms>;
  }

  private setLines(): void {
    const lines = new THREE.Mesh(this.geometry, this.material);
    // ? Same reasoning as NetworkParticles: no "position" attribute, no real bounding sphere, disable culling
    lines.frustumCulled = false;

    this.lines = lines;
  }

  /** Live-updates the line fade distance, e.g. from a GUI change. */
  public setMaxDistance(value: number): void {
    this.material.uniforms.uMaxDistance.value = value;
  }

  /** Live-updates the line thickness, e.g. from a GUI change. */
  public setLineWidth(value: number): void {
    this.material.uniforms.uLineWidth.value = value;
  }

  private addDebugFolders(): void {
    if (!this.parentFolder) return;

    const { guiKey } = NetworkLines.CONFIG;
    const registry = new GUIStateRegistry<NetworkLinesState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const linesFolder = this.parentFolder.addFolder("Lines");

    this.lineWidthController = linesFolder
      .add(state, "uLineWidth")
      .min(0.001)
      .max(0.5)
      .step(0.001);
    registry.bind("uLineWidth", (v) => {
      this.setLineWidth(v);
    });

    this.syncLineWidthMax();
  }

  /**
   * ! Finds the sibling `Particles` folder's `uSize` controller by scanning `parentFolder.folders`
   * ! for a controller whose `property` is `"uSize"`. Not a typed cross-class reference, relies on
   * ! lil-gui's internal folder/controller arrays and a string property match. Breaks silently if
   * ! `NetworkParticles` renames its folder or its `uSize` state key. Fine for this debug-only cap.
   */
  private findParticleSizeController(): Controller | null {
    if (!this.parentFolder) return null;

    for (const folder of this.parentFolder.folders) {
      const found = folder.controllers.find(
        (c: Controller) => c.property === "uSize",
      );
      if (found) return found;
    }

    return null;
  }

  /** Caps the line width slider's max to the particles' current `uSize`, so a line can never visually outgrow a particle. */
  private syncLineWidthMax(): void {
    const sizeController = this.findParticleSizeController();
    if (!sizeController) return;

    const applyMax = (size: number): void => {
      const { lineWidthController, guiRegistry } = this;
      if (!lineWidthController) return;

      lineWidthController.max(size);

      if (!guiRegistry) return;
      const { state } = guiRegistry;
      if (state.uLineWidth <= size) return;

      lineWidthController.setValue(size);
    };

    const initialSize: number = sizeController.getValue();
    applyMax(initialSize);
    sizeController.onChange(applyMax);
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
