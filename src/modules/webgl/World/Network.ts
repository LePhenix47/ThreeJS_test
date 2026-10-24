import * as THREE from "three";
import type GUI from "lil-gui";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import NetworkGPGPU from "./NetworkGPGPU";
import NetworkParticles from "./NetworkParticles";
import NetworkLines from "./NetworkLines";

type NetworkState = {
  seedBoxVisible: boolean;
  debugPlaneVisible: boolean;
  debugPlaneSource: "position" | "velocity" | "neighbors";
  uMaxDistance: number;
  uBoundary: number;
};

/**
 * Coordinator owning the shared `NetworkGPGPU` resource and the two entities that render off it,
 * `NetworkParticles` (points) and `NetworkLines` (connecting lines). Neither child owns or
 * disposes the GPGPU, this class does, once.
 */
class Network implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "network-gui-state",
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
  } as const;

  private readonly experience: Experience | null;

  private gpGpu: NetworkGPGPU;
  /** Box whose own vertices seed the GPGPU texture. Also reused as a wireframe boundary helper. */
  private seedGeometry: THREE.BoxGeometry;
  private seedBoxMesh: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshBasicMaterial
  > | null = null;

  private debugPlane: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  > | null = null;

  private particles: NetworkParticles;
  private lines: NetworkLines;

  private readonly DEBUG_DEFAULTS: NetworkState = {
    seedBoxVisible: false,
    debugPlaneVisible: false,
    debugPlaneSource: "position",
    uMaxDistance: 5,
    uBoundary: Network.CONFIG.seedBox.size / 2,
  };
  private guiRegistry: GUIStateRegistry<NetworkState> | null = null;

  private get scene() {
    return this.experience!.scene;
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
    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setSeedGeometry();
    this.setGPGPU();

    const { gpGpu } = this;
    const { count: particleCount } = this.getSeedPositionAttribute();
    const { uMaxDistance } = this.DEBUG_DEFAULTS;

    const isDebugActive: boolean = this.debug?.isActive ?? false;
    const parentFolder = isDebugActive
      ? this.debug.gui.addFolder("Network")
      : null;

    this.particles = new NetworkParticles({ gpGpu, particleCount, parentFolder });
    this.lines = new NetworkLines({
      gpGpu,
      particleCount,
      maxDistance: uMaxDistance,
      parentFolder,
    });

    if (isDebugActive) {
      this.addSeedBoxMesh();
      this.addDebugPlane();
      this.addDebugFolders(parentFolder!);
    }

    console.log("Network");
  }

  /** Box whose own vertices seed the particles, one per vertex. */
  private setSeedGeometry(): void {
    const { size, segments } = Network.CONFIG.seedBox;

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
      throw new Error("[Network] Unexpected interleaved position attribute");
    }

    return position;
  }

  /** Builds the `GPUComputationRenderer` from the seed box's vertex positions. */
  private setGPGPU(): void {
    const { uMaxDistance, uBoundary } = this.DEBUG_DEFAULTS;

    this.gpGpu = new NetworkGPGPU({
      renderer: this.renderer.instance,
      positions: this.getSeedPositionAttribute(),
      boundary: uBoundary,
      maxDistance: uMaxDistance,
    });
  }

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
    const { size, position } = Network.CONFIG.debugPlane;
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

  private addDebugFolders(networkFolder: GUI): void {
    const { guiKey } = Network.CONFIG;
    const registry = new GUIStateRegistry<NetworkState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;

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
      .add(state, "debugPlaneSource", ["position", "velocity", "neighbors"])
      .name("GPGPU debug source");

    networkFolder
      .add(state, "uMaxDistance")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Max neighbor distance");
    registry.bind("uMaxDistance", (v) => {
      this.gpGpu.setMaxDistance(v);
      this.lines.setMaxDistance(v);
    });

    networkFolder
      .add(state, "uBoundary")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Boundary");
    registry.bind("uBoundary", (v) => {
      this.gpGpu.setBoundary(v);

      // ? The wireframe's geometry stays fixed (seed data isn't rebuilt), rescale it visually so it keeps matching the live boundary
      if (!this.seedBoxMesh) return;
      const { size } = Network.CONFIG.seedBox;
      const boundarySize: number = size / 2;
      this.seedBoxMesh.scale.setScalar(v / boundarySize);
    });

  }

  public update(): void {
    const { elapsedSeconds, deltaSeconds } = this.time;
    this.gpGpu.update({ elapsedSeconds, deltaTimeSeconds: deltaSeconds });

    this.particles.update();
    this.lines.update();

    this.updateDebugPlane();
  }

  private updateDebugPlane(): void {
    if (!this.debugPlane) return;

    const { debugPlaneSource } = this.guiRegistry?.state || this.DEBUG_DEFAULTS;

    const { positionTexture, velocityTexture, neighborsTexture } = this.gpGpu;
    const debugPlaneMap: Record<typeof debugPlaneSource, THREE.Texture> = {
      position: positionTexture,
      velocity: velocityTexture,
      neighbors: neighborsTexture,
    };

    this.debugPlane.material.map = debugPlaneMap[debugPlaneSource];
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
    this.guiRegistry?.dispose();
    this.destroySeedBoxMesh();
    this.destroyDebugPlane();

    this.particles.destroy();
    this.lines.destroy();

    this.seedGeometry.dispose();
    this.gpGpu.destroy();
  }
}

export default Network;
