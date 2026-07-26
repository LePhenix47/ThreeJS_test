import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import Environment from "./Environment";
import HolographicGroup from "./HolographicGroup";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type WorldState = {
  axisHelper: boolean;
  gridHelper: boolean;
};

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public environment?: Environment;
  public holographicGroup: HolographicGroup;
  private axisHelper: THREE.AxesHelper;
  private gridHelper: THREE.GridHelper;
  private guiRegistry: GUIStateRegistry<WorldState> | null = null;

  private readonly debugDefaults: WorldState = {
    axisHelper: true,
    gridHelper: true,
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

    this.environment = new Environment();
    this.holographicGroup = new HolographicGroup();
    this.setHelpers();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("World");
  }

  private setHelpers = () => {
    this.axisHelper = new THREE.AxesHelper(3);
    this.gridHelper = new THREE.GridHelper(10, 10);

    this.scene.add(this.axisHelper, this.gridHelper);
  };

  private addDebugFolders = () => {
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
  };

  private removeHelpers = () => {
    this.scene.remove(this.axisHelper, this.gridHelper);
    this.axisHelper.dispose();
    this.gridHelper.dispose();
    this.guiRegistry?.dispose();
  };

  public update = () => {
    this.holographicGroup.update();
  };

  public destroy = () => {
    this.environment?.destroy();
    this.holographicGroup.destroy();
    this.removeHelpers();
  };
}

export default World;
