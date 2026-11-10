import Experience, { Destroyable, Updatable } from "../Experience/Experience";
import { ProceduralTerrainConstructor } from "./ProceduralTerrain";
import { MeshEntity } from "./types/mesh-entity";

import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import GUI from "lil-gui";
import Sandbox from "./Sandbox";

type TerrainState = {};

class Terrain extends MeshEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    guiKey: "terrain-gui-state",
    geometry: {
      width: Sandbox.CONFIG.geometry.width - 1,
      height: Sandbox.CONFIG.geometry.depth - 1,
      segments: 500,
      rotationXDeg: 90,
    },
  } as const;

  private readonly experience: Experience;
  private readonly parentFolder: GUI | null;

  protected geometry: THREE.PlaneGeometry;
  protected material: THREE.MeshStandardMaterial;
  protected mesh: THREE.Mesh;

  protected readonly DEBUG_DEFAULTS: TerrainState = {};
  protected guiRegistry?: GUIStateRegistry<TerrainState> | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor({ parentFolder }: ProceduralTerrainConstructor) {
    super();

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;
    this.parentFolder = parentFolder;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    // this.scene.add(this.mesh);

    if (this.parentFolder) {
      this.addDebugFolders();
    }

    console.log("Terrain");
  }

  protected setGeometry(): void {
    const { segments, width, height, rotationXDeg } = Terrain.CONFIG.geometry;

    const geometry = new THREE.PlaneGeometry(width, height, segments);
    geometry.rotateX(rotationXDeg); // ? Plane parallel to floor

    this.geometry = geometry;
  }

  protected setMaterial(): void {}

  protected setMesh(): void {}

  protected addDebugFolders(): void {
    const { guiKey } = Terrain.CONFIG;
    const registry = new GUIStateRegistry<TerrainState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );

    this.guiRegistry = registry;

    const { state } = registry;

    if (!this.parentFolder) return;

    const terrainFolder = this.parentFolder.addFolder("Terrain");
  }

  public update(): void {}

  public destroy(): void {
    this.guiRegistry?.dispose();
  }
}

export default Terrain;
