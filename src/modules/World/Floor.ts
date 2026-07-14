import Experience, { Destroyable } from "@modules/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { SideEnum } from "@/utils/enums/three";
import Enum from "@/utils/enums";
import { MeshEntity } from "./types/entity";

type FloorState = {
  color: string;
  wireframe: boolean;
  side: keyof typeof SideEnum;
  subdivisions: number;
};

class Floor extends MeshEntity implements Destroyable {
  private readonly experience: Experience | null;

  protected geometry: THREE.PlaneGeometry;
  protected material: THREE.MeshStandardMaterial;
  protected mesh: THREE.Mesh;

  private guiRegistry: GUIStateRegistry<FloorState> | null = null;

  private readonly debugDefaults: FloorState = {
    color: "#777777",
    wireframe: false,
    side: "double",
    subdivisions: 1,
  };

  private readonly FLOOR_SIZE = 2 ** 12;

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

    console.log("Floor");
  }

  protected setGeometry = () => {
    const { subdivisions } = this.debugDefaults;
    this.geometry = new THREE.PlaneGeometry(
      this.FLOOR_SIZE,
      this.FLOOR_SIZE,
      subdivisions,
      subdivisions,
    );
  };

  protected setMaterial = () => {
    const { color, side, wireframe } = this.debugDefaults;

    this.material = new THREE.MeshStandardMaterial({
      color,
      wireframe,
      metalness: 0.3,
      roughness: 0.4,
      side: SideEnum[side],
    });
  };

  protected setMesh = () => {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(-90);
    this.mesh.receiveShadow = true;
  };

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry<FloorState>(
      "floor-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const floorFolder = gui.addFolder("Floor");

    floorFolder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.color.set(v);
    });

    floorFolder.add(state, "wireframe").name("Wireframe");
    registry.bind("wireframe", (v) => {
      this.material.wireframe = v;
    });

    const sideValues = Enum.keys(SideEnum);
    floorFolder.add(state, "side", sideValues).name("Side");
    registry.bind("side", (v) => {
      this.material.side = SideEnum[v];
    });

    floorFolder
      .add(state, "subdivisions")
      .step(1)
      .min(1)
      .max(100)
      .name("Subdivisions")
      .onFinishChange(
        registry.bindFinal("subdivisions", (segments) => {
          this.mesh.geometry.dispose();
          this.mesh.geometry = new THREE.PlaneGeometry(
            this.FLOOR_SIZE,
            this.FLOOR_SIZE,
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
