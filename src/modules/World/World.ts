import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import RagingSea from "./RagingSea";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type WorldState = {
  axisHelper: boolean;
  gridHelper: boolean;
  helpersPosX: number;
  helpersPosY: number;
  helpersPosZ: number;
};

class World implements Updatable, Destroyable {
  public static readonly CONFIG = {
    axisHelper: {
      size: 3,
      yShift: 0.02, // ? To avoid z fighting
    },
    gridHelper: {
      size: 10,
      subdivisions: 10,
      yShift: 0.01, // ? To avoid z fighting
    },
  };

  private readonly experience: Experience | null;
  public ragingSea: RagingSea;
  private axisHelper: THREE.AxesHelper;
  private gridHelper: THREE.GridHelper;
  private guiRegistry: GUIStateRegistry<WorldState> | null = null;

  private readonly debugDefaults: WorldState = {
    axisHelper: true,
    gridHelper: true,
    helpersPosX: 0,
    helpersPosY: 0,
    helpersPosZ: 0,
  };

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get camera() {
    return this.experience!.camera;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.ragingSea = new RagingSea();
    this.setHelpers();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("World");
  }

  private setAxisHelper(): void {
    const { size } = World.CONFIG.axisHelper;
    const axisHelper = new THREE.AxesHelper(size);

    this.axisHelper = axisHelper;
  }

  private setGridHelper() {
    const { size, subdivisions } = World.CONFIG.gridHelper;
    const gridHelper = new THREE.GridHelper(size, subdivisions);

    this.gridHelper = gridHelper;
  }

  private updateHelpersPositions = (): void => {
    const {
      helpersPosX: x,
      helpersPosY: y,
      helpersPosZ: z,
    } = this.guiRegistry?.state || this.debugDefaults;

    const { axisHelper, gridHelper } = World.CONFIG;

    const position = new THREE.Vector3(x, y, z);

    this.updateHelperPosition("axis", position, axisHelper.yShift);
    this.updateHelperPosition("grid", position, gridHelper.yShift);
  };

  private updateHelperPosition = (
    helperType: "axis" | "grid",
    position: THREE.Vector3,
    offset: number = 0,
  ): void => {
    const newPosition: THREE.Vector3 = structuredClone(position);
    newPosition.y += offset;

    switch (helperType) {
      case "axis": {
        this.axisHelper.position.copy(newPosition);
        break;
      }
      case "grid": {
        this.gridHelper.position.copy(newPosition);
        break;
      }

      default:
        break;
    }
  };

  private setHelpers = (): void => {
    this.setAxisHelper();
    this.setGridHelper();

    this.updateHelpersPositions();

    this.scene.add(this.axisHelper, this.gridHelper);
  };

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<WorldState>(
      "world-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const worldFolder = gui.addFolder("World");

    const helpersFolder = worldFolder.addFolder("Helpers");

    helpersFolder.add(state, "axisHelper").name("Axis Helper");
    registry.bind("axisHelper", (v) => {
      this.axisHelper.visible = v;
    });

    helpersFolder.add(state, "gridHelper").name("Grid Helper");
    registry.bind("gridHelper", (v) => {
      this.gridHelper.visible = v;
    });

    helpersFolder
      .add(state, "helpersPosX")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Helpers X");
    registry.bind("helpersPosX", this.updateHelpersPositions);

    helpersFolder
      .add(state, "helpersPosY")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Helpers Y");
    registry.bind("helpersPosY", this.updateHelpersPositions);

    helpersFolder
      .add(state, "helpersPosZ")
      .min(-5)
      .max(5)
      .step(0.01)
      .name("Helpers Z");
    registry.bind("helpersPosZ", this.updateHelpersPositions);

    worldFolder
      .add(
        {
          resetPivot: () => {
            const { controls } = this.camera;
            controls.target.set(0, 0, 0);
            controls.update();
          },
        },
        "resetPivot",
      )
      .name("Reset Camera Pivot");
  }

  private removeHelpers = () => {
    this.scene.remove(this.axisHelper, this.gridHelper);
    this.axisHelper.dispose();
    this.gridHelper.dispose();
    this.guiRegistry?.dispose();
  };

  public update = () => {
    this.ragingSea.update();
  };

  public destroy = () => {
    this.ragingSea.destroy();
    this.removeHelpers();
  };
}

export default World;
