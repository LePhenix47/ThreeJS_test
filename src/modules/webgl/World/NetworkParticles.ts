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
import linesVertexShader from "@shaders/network-lines/vertex.glsl";
import linesFragmentShader from "@shaders/network-lines/fragment.glsl";

type NetworkParticlesState = {
  uSize: number;
  seedBoxVisible: boolean;
  debugPlaneVisible: boolean;
  debugPlaneSource: "position" | "velocity";
};

type NetworkParticlesUniforms = MapAsUniforms<{
  uResolution: THREE.Vector2;
  uSize: NetworkParticlesState["uSize"];
  uParticlesTexture: THREE.Texture;
}>;

type NetworkParticlesAttributes = MapAsAttributes<"aParticlesUv">;

type NetworkLinesUniforms = MapAsUniforms<{
  uParticlesTexture: THREE.Texture;
  uNeighborsTexture: THREE.Texture;
  uGpgpuSize: number;
  uMaxDistance: number;
}>;

type NetworkLinesAttributes = MapAsAttributes<
  "aOwnerUv" | "aNeighborSlot" | "aEndpoint"
>;

class NetworkParticles extends PointsEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "network-particles-gui-state",
    seedBox: {
      /** Side length of the cube particles are seeded from, centered on the origin. */
      size: 8,
      /** Segments per axis. Higher = more particles (6 faces × (segments + 1)²). */
      segments: 8,
    },
    debugPlane: {
      size: 3,
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
    lines: {
      /** How many of each particle's closest neighbors get a line. Matches neighbors.glsl's fixed K=4. */
      neighborCount: 4,
      /** Distance past which a line's alpha fades to 0. Should stay <= the neighbor search's own cutoff in neighbors.glsl. */
      maxDistance: 5,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: TypedBufferGeometry<NetworkParticlesAttributes>;
  protected material: TypedShaderMaterial<NetworkParticlesUniforms>;
  protected points: THREE.Points;

  private gpGpu: NetworkGPGPU;
  /** Box's own vertex positions seed the GPGPU texture. Also reused as a wireframe boundary helper. */
  private seedGeometry: THREE.BoxGeometry;
  private seedBoxMesh: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshBasicMaterial
  > | null = null;

  private debugPlane: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  > | null = null;

  private linesGeometry: TypedBufferGeometry<NetworkLinesAttributes>;
  private linesMaterial: TypedShaderMaterial<NetworkLinesUniforms>;
  private lines: THREE.LineSegments;

  protected readonly DEBUG_DEFAULTS: NetworkParticlesState = {
    uSize: 0.1,
    seedBoxVisible: false,
    debugPlaneVisible: false,
    debugPlaneSource: "position",
  };
  protected guiRegistry: GUIStateRegistry<NetworkParticlesState> | null = null;

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

  private get time() {
    return this.experience!.time;
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

    this.setLinesGeometry();
    this.setLinesMaterial();
    this.setLines();

    this.scene.add(this.lines);

    this.sizes.on("resize", this.onResize);

    if (this.debug?.isActive) {
      this.addSeedBoxMesh();
      this.addDebugPlane();
      this.addDebugFolders();
    }

    console.log("NetworkParticles");
  }

  /** Box whose own vertices seed the particles, one per vertex. */
  private setSeedGeometry(): void {
    const { size, segments } = NetworkParticles.CONFIG.seedBox;

    this.seedGeometry = new THREE.BoxGeometry(
      size,
      size,
      size,
      segments,
      segments,
      segments,
    );
  }

  /** Narrows the seed box's `position` attribute to a real (non-interleaved) `BufferAttribute`. */
  private getSeedPositionAttribute(): THREE.BufferAttribute {
    const { position } = this.seedGeometry.attributes;

    if (!(position instanceof THREE.BufferAttribute)) {
      throw new Error(
        "[NetworkParticles] Unexpected interleaved position attribute",
      );
    }

    return position;
  }

  /** Builds the `GPUComputationRenderer` from the seed box's vertex positions. */
  private setGPGPU(): void {
    const { size } = NetworkParticles.CONFIG.seedBox;

    this.gpGpu = new NetworkGPGPU({
      renderer: this.renderer.instance,
      positions: this.getSeedPositionAttribute(),
      boundary: size / 2,
    });
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
    const { count } = this.seedGeometry.attributes.position;
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
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private setLinesGeometry(): void {
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

    this.linesGeometry = geometry;
  }

  /** Two vertices per neighbor slot, per particle: one line segment from each particle to each of its (up to) `neighborCount` neighbors. */
  private getLinesArrays(): {
    ownerUvArray: Float32Array;
    neighborSlotArray: Float32Array;
    endpointArray: Float32Array;
  } {
    const { neighborCount } = NetworkParticles.CONFIG.lines;
    const { size } = this.gpGpu;
    const { count } = this.seedGeometry.attributes.position;

    const verticesPerParticle = neighborCount * 2;
    const vertexCount = count * verticesPerParticle;

    const uvStride: number = Enum.length(UvEnum);
    const ownerUvArray = new Float32Array(vertexCount * uvStride);
    const neighborSlotArray = new Float32Array(vertexCount);
    const endpointArray = new Float32Array(vertexCount);

    let vertex = 0;
    for (let i = 0; i < count; i++) {
      const ownerU: number = ((i % size) + 0.5) / size;
      const ownerV: number = (Math.floor(i / size) + 0.5) / size;

      for (let slot = 0; slot < neighborCount; slot++) {
        for (let endpoint = 0; endpoint < 2; endpoint++) {
          const i2: number = vertex * uvStride;

          ownerUvArray[i2 + UvEnum.S] = ownerU;
          ownerUvArray[i2 + UvEnum.T] = ownerV;
          neighborSlotArray[vertex] = slot;
          endpointArray[vertex] = endpoint;

          vertex++;
        }
      }
    }

    return { ownerUvArray, neighborSlotArray, endpointArray };
  }

  private setLinesMaterial(): void {
    const { maxDistance } = NetworkParticles.CONFIG.lines;
    const { positionTexture, neighborsTexture, size } = this.gpGpu;

    const uniforms: NetworkLinesUniforms = {
      uParticlesTexture: { value: positionTexture },
      uNeighborsTexture: { value: neighborsTexture },
      uGpgpuSize: new THREE.Uniform(size),
      uMaxDistance: new THREE.Uniform(maxDistance),
    };

    this.linesMaterial = new THREE.ShaderMaterial({
      vertexShader: linesVertexShader,
      fragmentShader: linesFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }) as TypedShaderMaterial<NetworkLinesUniforms>;
  }

  private setLines(): void {
    this.lines = new THREE.LineSegments(this.linesGeometry, this.linesMaterial);
  }

  private onResize = (): void => {
    const { x, y } = this.sizes.resolution;

    this.material.uniforms.uResolution.value.set(x, y);
  };

  private addSeedBoxMesh(): void {
    this.setSeedBoxMesh();

    if (!this.seedBoxMesh) return;
    this.scene.add(this.seedBoxMesh);
  }

  private setSeedBoxMesh(): void {
    const { seedBoxVisible } = this.DEBUG_DEFAULTS;

    const material = new THREE.MeshBasicMaterial({ wireframe: true });
    const seedBoxMesh = new THREE.Mesh(this.seedGeometry, material);
    seedBoxMesh.visible = seedBoxVisible;

    this.seedBoxMesh = seedBoxMesh;
  }

  private addDebugPlane(): void {
    this.setDebugPlane();

    if (!this.debugPlane) return;
    this.scene.add(this.debugPlane);
  }

  private setDebugPlane(): void {
    const { size, position } = NetworkParticles.CONFIG.debugPlane;
    const { debugPlaneVisible } = this.DEBUG_DEFAULTS;

    const geometry = new THREE.PlaneGeometry(size, size);
    // ? depthTest/depthWrite off: a debug overlay should never be occluded by whatever's physically in front of it
    // ? Not transparent: alpha is unused by this effect's GPGPU texture (stays 0), which would make the whole plane invisible under alpha blending
    const material = new THREE.MeshBasicMaterial({
      map: this.gpGpu.positionTexture,
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
    const { guiKey } = NetworkParticles.CONFIG;
    const registry = new GUIStateRegistry<NetworkParticlesState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const networkFolder = gui.addFolder("NetworkParticles");

    networkFolder.add(state, "uSize").min(0).max(1).step(0.001);
    registry.bind("uSize", (v) => {
      this.material.uniforms.uSize.value = v;
    });

    networkFolder.add(state, "seedBoxVisible").name("Show seed box");
    registry.bind("seedBoxVisible", (v) => {
      if (!this.seedBoxMesh) return;

      this.seedBoxMesh.visible = v;
    });

    networkFolder.add(state, "debugPlaneVisible").name("Show GPGPU debug");
    registry.bind("debugPlaneVisible", (v) => {
      if (!this.debugPlane) return;

      this.debugPlane.visible = v;
    });

    networkFolder
      .add(state, "debugPlaneSource", ["position", "velocity"])
      .name("GPGPU debug source");
  }

  public update(): void {
    const { elapsedSeconds, deltaSeconds } = this.time;
    this.gpGpu.update({ elapsedSeconds, deltaTimeSeconds: deltaSeconds });

    // ? Ping-ponged: a genuinely different texture object every other frame, must be re-read, not just mutated
    const { positionTexture } = this.gpGpu;
    this.material.uniforms.uParticlesTexture.value = positionTexture;

    const { uniforms: linesUniforms } = this.linesMaterial;
    linesUniforms.uParticlesTexture.value = positionTexture;
    linesUniforms.uNeighborsTexture.value = this.gpGpu.neighborsTexture;

    this.updateGpGpuDebugPlane();
  }

  private updateGpGpuDebugPlane(): void {
    if (!this.debugPlane) return;

    const { debugPlaneSource } = this.guiRegistry?.state || this.DEBUG_DEFAULTS;

    const { positionTexture, velocityTexture } = this.gpGpu;
    const debugPlaneMap: THREE.Texture =
      debugPlaneSource === "velocity" ? velocityTexture : positionTexture;

    this.debugPlane.material.map = debugPlaneMap;
  }

  private destroySeedBoxMesh(): void {
    if (!this.seedBoxMesh) return;

    this.scene.remove(this.seedBoxMesh);
    this.seedBoxMesh.material.dispose();

    this.seedBoxMesh = null;
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
    this.destroySeedBoxMesh();
    this.destroyDebugPlane();

    this.seedGeometry.dispose();
    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.points);

    this.linesGeometry.dispose();
    this.linesMaterial.dispose();

    this.scene.remove(this.lines);
  }
}

export default NetworkParticles;
