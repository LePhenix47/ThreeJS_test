import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MeshEntity } from "./types/mesh-entity";

type ProceduralTerrainState = {
  color: string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
};

class ProceduralTerrain extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "procedural-terrain-gui-state",
    geometry: {
      radius: 2,
      detail: 5,
    },
  } as const;

  private readonly experience: Experience | null;

  protected geometry: THREE.IcosahedronGeometry;
  protected material: THREE.MeshPhysicalMaterial;
  protected mesh: THREE.Mesh;

  protected override guiRegistry: GUIStateRegistry<ProceduralTerrainState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: ProceduralTerrainState = {
    color: "#ffffff",
    metalness: 0,
    roughness: 1,
    envMapIntensity: 1,
  };

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    super();

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("ProceduralTerrain");
  }

  protected setGeometry(): void {
    const { radius, detail } = ProceduralTerrain.CONFIG.geometry;
    this.geometry = new THREE.IcosahedronGeometry(radius, detail);
  }

  protected setMaterial(): void {
    const { color, metalness, roughness, envMapIntensity } =
      this.DEBUG_DEFAULTS;

    this.material = new THREE.MeshPhysicalMaterial({
      color,
      metalness,
      roughness,
      envMapIntensity,
    });
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  protected override addDebugFolders(): void {
    const { guiKey } = ProceduralTerrain.CONFIG;
    const registry = new GUIStateRegistry<ProceduralTerrainState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const terrainFolder = gui.addFolder("Procedural terrain");

    terrainFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.color.set(v);
    });

    terrainFolder
      .add(state, "metalness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Metalness");
    registry.bind("metalness", (v) => {
      this.material.metalness = v;
    });

    terrainFolder
      .add(state, "roughness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Roughness");
    registry.bind("roughness", (v) => {
      this.material.roughness = v;
    });

    terrainFolder
      .add(state, "envMapIntensity")
      .min(0)
      .max(3)
      .step(0.001)
      .name("Env map intensity");
    registry.bind("envMapIntensity", (v) => {
      this.material.envMapIntensity = v;
    });
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
    this.guiRegistry?.dispose();
  }
}

export default ProceduralTerrain;
