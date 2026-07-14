import Experience, { Destroyable } from "@modules/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity, EnvironmentMapConfig } from "./types/entity";

type EnvironmentState = {
  axisHelper: boolean;
  lightHelper: boolean;
  gridHelper: boolean;
};

class Environment extends EnvironmentEntity implements Destroyable {
  private readonly experience: Experience | null;
  private sunLight: THREE.DirectionalLight;
  private axisHelper: THREE.AxesHelper;
  private lightHelper: THREE.DirectionalLightHelper;
  private gridHelper: THREE.GridHelper;
  private guiRegistry: GUIStateRegistry<EnvironmentState> | null = null;

  private readonly debugDefaults: EnvironmentState = {
    axisHelper: true,
    lightHelper: true,
    gridHelper: true,
  };

  protected envMapTexture: THREE.Texture | THREE.CubeTexture | null = null;
  protected envMapConfig: EnvironmentMapConfig = {};

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get camera() {
    return this.experience!.camera;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setEnvMap();
    this.scene.background = this.envMapTexture;
    this.scene.environment = this.envMapTexture;

    this.setSunLight();
    this.setHelpers();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected setEnvMap = (): void => {
    const envMap = this.resources.getCubeTexture("env-map-0");

    this.envMapTexture = envMap;
  };

  protected updateMaterial = (): void => {};

  private setSunLight = (withHelper = true): void => {
    const sunLight = new THREE.DirectionalLight("#ffffff", 3);

    const size: number = 2 ** 10;
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(size, size);
    sunLight.shadow.normalBias = 0.05;

    const { camera } = sunLight.shadow;
    camera.far = 15;
    camera.top = 7;
    camera.right = 7;
    camera.bottom = -7;
    camera.left = -7;

    sunLight.position.set(0.25, 2, -2.25);

    this.sunLight = sunLight;
    this.scene.add(sunLight);

    if (!withHelper) return;
    this.lightHelper = new THREE.DirectionalLightHelper(sunLight);
    this.scene.add(this.lightHelper);
  };

  private setHelpers = () => {
    this.axisHelper = new THREE.AxesHelper(3);
    this.gridHelper = new THREE.GridHelper(10, 10);

    this.scene.add(this.axisHelper, this.gridHelper);
  };

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry<EnvironmentState>(
      "environment-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const helpersFolder = gui.addFolder("Helpers");

    helpersFolder.add(state, "axisHelper").name("Axis Helper");
    registry.bind("axisHelper", (v) => {
      this.axisHelper.visible = v;
    });

    helpersFolder.add(state, "lightHelper").name("Light Helper");
    registry.bind("lightHelper", (v) => {
      this.lightHelper.visible = v;
    });

    helpersFolder.add(state, "gridHelper").name("Grid Helper");
    registry.bind("gridHelper", (v) => {
      this.gridHelper.visible = v;
    });

    helpersFolder
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

  public destroy = () => {
    this.scene.remove(
      this.sunLight,
      this.axisHelper,
      this.lightHelper,
      this.gridHelper,
    );
    this.sunLight.dispose();
    this.axisHelper.dispose();
    this.lightHelper?.dispose();
    this.gridHelper.dispose();
    this.guiRegistry?.dispose();
  };
}

export default Environment;
