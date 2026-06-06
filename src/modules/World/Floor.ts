import Experience, { Destroyable } from "../Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

const FLOOR_SIZE = 2 ** 12;

type FloorState = {
  color: string;
  wireframe: boolean;
  side: "front" | "back" | "double";
  subdivisions: number;
};

const sideMap = new Map<FloorState["side"], THREE.Side>([
  ["front", THREE.FrontSide],
  ["back", THREE.BackSide],
  ["double", THREE.DoubleSide],
]);

class Floor implements Destroyable {
  private readonly experience: Experience | null;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshStandardMaterial;
  private mesh: THREE.Mesh;
  private guiRegistry: GUIStateRegistry<FloorState> | null = null;

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

    console.log("Floor");
  }

  private setGeometry = () => {
    this.geometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
  };

  private setMaterial = () => {
    this.material = new THREE.MeshStandardMaterial({
      color: "#777777",
      metalness: 0.3,
      roughness: 0.4,
    });
  };

  private setMesh = () => {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI * 0.5;
    this.mesh.receiveShadow = true;
  };

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry<FloorState>("floor-gui-state", {
      color: "#777777",
      wireframe: false,
      side: "double",
      subdivisions: 1,
    });

    registry
      .bind("color", (v) => {
        this.material.color.set(v);
      })
      .bind("wireframe", (v) => {
        this.material.wireframe = v;
      })
      .bind("side", (v) => {
        this.material.side = sideMap.get(v)!;
      });

    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const floorFolder = gui.addFolder("Floor");

    floorFolder.addColor(state, "color").name("Color");
    floorFolder.add(state, "wireframe").name("Wireframe");
    floorFolder.add(state, "side", ["front", "back", "double"]).name("Side");
    floorFolder
      .add(state, "subdivisions", 1, 100, 1)
      .name("Subdivisions")
      .onFinishChange(
        registry.bindFinal("subdivisions", (segments) => {
          this.mesh.geometry.dispose();
          this.mesh.geometry = new THREE.PlaneGeometry(
            FLOOR_SIZE,
            FLOOR_SIZE,
            segments,
            segments,
          );
        }),
      );
  };

  public destroy = () => {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
    this.guiRegistry?.dispose();
  };
}

export default Floor;
