import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { PlaybackSpeed } from "@/utils/enums/time";
import Earth from "@modules/World/Earth";
import Sun from "@modules/World/Sun";

type CameraPov = "space" | "earth";

type WorldState = {
  axisHelper: boolean;
  gridHelper: boolean;
  helpersPosX: number;
  helpersPosY: number;
  helpersPosZ: number;
  realTime: boolean;
  /** `space` keeps the camera still so the Earth visibly spins. `earth` turns the camera with the Earth so the sun appears to circle. */
  pov: CameraPov;
  /** Simulated seconds per real second. */
  timeScale: PlaybackSpeed;
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
  } as const;

  private readonly experience: Experience | null;
  private axisHelper: THREE.AxesHelper;
  private gridHelper: THREE.GridHelper;
  private guiRegistry: GUIStateRegistry<WorldState> | null = null;

  private readonly debugDefaults: WorldState = {
    axisHelper: true,
    gridHelper: true,
    helpersPosX: 0,
    helpersPosY: 0,
    helpersPosZ: 0,
    realTime: false,
    pov: "space",
    timeScale: PlaybackSpeed.RealTime,
  };

  public sun?: Sun;
  public earth?: Earth;

  /** Earth's Y rotation on the previous frame, so the camera can turn by the same amount in the `earth` POV. Null until the first frame. */
  private previousEarthRotation: number | null = null;

  private get resources() {
    return this.experience!.resources;
  }

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get camera() {
    return this.experience!.camera;
  }

  private get time() {
    return this.experience!.time;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.resources.on("textures-loaded", () => {
      this.sun = new Sun();

      const { direction } = this.sun;
      this.earth = new Earth(direction);

      // ? The GUI bind fired before Sun/Earth existed, so apply the (possibly restored) real-time state now
      this.applyRealTime();
    });

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

  private applyRealTime = (): void => {
    const { realTime } = this.guiRegistry?.state || this.debugDefaults;

    // ? The simulated clock keeps running while real time is off, so start from the actual current time
    if (realTime) this.time.resetSimulatedTime();

    this.sun?.setRealTime(realTime);
    this.earth?.setRealTime(realTime);
  };

  private updateHelperPosition(
    helperType: "axis" | "grid",
    position: THREE.Vector3,
    offset: number = 0,
  ): void {
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
  }

  private setHelpers(): void {
    this.setAxisHelper();
    this.setGridHelper();

    this.updateHelpersPositions();

    this.scene.add(this.axisHelper, this.gridHelper);
  }

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
      .add(state, "realTime")
      .name("Real time (Earth + sun follow the clock)");
    registry.bind("realTime", this.applyRealTime);

    worldFolder
      .add(state, "pov", {
        "Space (Earth spins)": "space",
        "Earth (sun circles)": "earth",
      })
      .name("Camera POV");

    worldFolder
      .add(state, "timeScale", {
        "Real time": PlaybackSpeed.RealTime, // 1x
        "1 minute per second": PlaybackSpeed.MinutePerSecond, // 60x
        "10 minutes per second": PlaybackSpeed.TenMinutesPerSecond, // 600x
        "1 hour per second": PlaybackSpeed.HourPerSecond, // 3600x
        "1 day per second": PlaybackSpeed.DayPerSecond, // 86400x
      })
      .name("Playback speed");
    registry.bind("timeScale", (v) => {
      // ? "Real time" means the actual current time, not wherever a faster speed left the clock
      if (v === PlaybackSpeed.RealTime) this.time.resetSimulatedTime();

      this.time.timeScale = v;
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
  }

  private removeHelpers(): void {
    this.scene.remove(this.axisHelper, this.gridHelper);
    this.axisHelper.dispose();
    this.gridHelper.dispose();
    this.guiRegistry?.dispose();
  }

  /** In the `earth` POV, turns the camera by however much the Earth turned since the last frame. */
  private followEarthRotation(): void {
    const { earth, previousEarthRotation } = this;
    if (!earth) return;

    const { pov } = this.guiRegistry?.state || this.debugDefaults;
    const rotation = earth.rotationY;
    this.previousEarthRotation = rotation;

    if (pov !== "earth" || previousEarthRotation === null) return;

    this.camera.orbitAroundY(rotation - previousEarthRotation);
  }

  public update(): void {
    this.sun?.update();
    this.earth?.update();

    this.followEarthRotation();
  }

  public destroy(): void {
    this.earth?.destroy();
    this.sun?.destroy();

    this.removeHelpers();
  }
}

export default World;
