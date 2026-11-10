import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { MeshEntity } from "./types/mesh-entity";

import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

type ProceduralTerrainState = {
  color: string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
};

class ProceduralTerrain implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "procedural-terrain-gui-state",
    geometry: {
      width: 11,
      height: 2,
      depth: 11,
    },
  } as const;

  private readonly experience: Experience | null;

  private boardFillGeometry: THREE.BoxGeometry;
  private boardHoleGeometry: THREE.BoxGeometry;

  private material: THREE.MeshPhysicalMaterial;

  private mesh: THREE.Mesh;

  private guiRegistry: GUIStateRegistry<ProceduralTerrainState> | null = null;

  private readonly DEBUG_DEFAULTS: ProceduralTerrainState = {
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

  private setGeometry(): void {
    const { width, height, depth } = ProceduralTerrain.CONFIG.geometry;
    this.boardFillGeometry = new THREE.BoxGeometry(width, height, depth);

    this.boardHoleGeometry = new THREE.BoxGeometry(
      width - 1,
      height + 0.1,
      depth - 1,
    );
  }

  private setMaterial(): void {
    const { color, metalness, roughness, envMapIntensity } =
      this.DEBUG_DEFAULTS;

    this.material = new THREE.MeshPhysicalMaterial({
      color,
      metalness,
      roughness,
      envMapIntensity,
    });
  }

  private setMesh(): void {
    // * 1. Create brushes
    const boardFillBrush = new Brush(this.boardFillGeometry);
    const boardHoleBrush = new Brush(this.boardHoleGeometry);

    // * 2. Evaluate the geometries
    const evaluator = new Evaluator();
    const board = evaluator.evaluate(
      boardFillBrush,
      boardHoleBrush,
      SUBTRACTION, // ? XOR operation
    );

    board.material = this.material;

    this.mesh = board;
  }

  private addDebugFolders(): void {
    const { guiKey } = ProceduralTerrain.CONFIG;
    const registry = new GUIStateRegistry<ProceduralTerrainState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const terrainFolder = gui.addFolder("Procedural terrain");
    const boardFolder = terrainFolder.addFolder("Board");

    boardFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.color.set(v);
    });

    boardFolder
      .add(state, "metalness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Metalness");
    registry.bind("metalness", (v) => {
      this.material.metalness = v;
    });

    boardFolder
      .add(state, "roughness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Roughness");
    registry.bind("roughness", (v) => {
      this.material.roughness = v;
    });

    boardFolder
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
    this.boardFillGeometry.dispose();
    this.boardHoleGeometry.dispose();

    this.material.dispose();

    this.scene.remove(this.mesh);

    this.guiRegistry?.dispose();
  }
}

export default ProceduralTerrain;
