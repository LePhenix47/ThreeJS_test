import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import type GUI from "lil-gui";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { ProceduralTerrainConstructor } from "./ProceduralTerrain";

type SandboxState = {
  color: string;
  metalness: number;
  roughness: number;
  envMapIntensity: number;
};

class Sandbox implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "sandbox-gui-state",
    geometry: {
      width: 11,
      height: 2,
      depth: 11,
    },
    boardHoleBrush: {
      position: {
        x: 0,
        y: 0.2,
        z: 0,
      },
    },
  } as const;

  private readonly experience: Experience | null;
  private readonly parentFolder: GUI | null;
  private readonly group: THREE.Group;

  private boardFillGeometry: THREE.BoxGeometry;
  private boardHoleGeometry: THREE.BoxGeometry;

  private material: THREE.MeshPhysicalMaterial;

  private mesh: THREE.Mesh;

  private guiRegistry: GUIStateRegistry<SandboxState> | null = null;

  private readonly DEBUG_DEFAULTS: SandboxState = {
    color: "#ffffff",
    metalness: 0,
    roughness: 1,
    envMapIntensity: 1,
  };

  constructor({ parentFolder, group }: ProceduralTerrainConstructor) {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.parentFolder = parentFolder;
    this.group = group;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.group.add(this.mesh);

    if (this.parentFolder) {
      this.addDebugFolders();
    }

    console.log("Sandbox");
  }

  private setGeometry(): void {
    const { width, height, depth } = Sandbox.CONFIG.geometry;
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

    // ? Adds floor to the sandbox board, since it's not rendered in the scene we have to updateMatrixWorld
    // const { y } = Sandbox.CONFIG.boardHoleBrush.position;
    // boardHoleBrush.position.y = y;
    // boardHoleBrush.updateMatrixWorld();

    // * 2. Evaluate the geometries
    const evaluator = new Evaluator();
    const board = evaluator.evaluate(
      boardFillBrush,
      boardHoleBrush,
      SUBTRACTION, // ? Keeps fill minus the hole's overlap
    );

    board.material = this.material;

    board.castShadow = true;
    board.receiveShadow = true;

    this.mesh = board;
  }

  private addDebugFolders(): void {
    const { guiKey } = Sandbox.CONFIG;
    const registry = new GUIStateRegistry<SandboxState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;

    if (!this.parentFolder) return;
    const boardFolder = this.parentFolder.addFolder("Board");

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

    this.group.remove(this.mesh);

    this.guiRegistry?.dispose();
  }
}

export default Sandbox;
