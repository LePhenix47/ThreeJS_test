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

    this.setLights();
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

  private setLights = () => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
    sunLight.castShadow = true;
    sunLight.shadow.radius = 4;
    sunLight.shadow.mapSize.set(2048, 2048);

    const { camera } = sunLight.shadow;
    camera.near = 0.5;
    camera.far = 100;
    camera.top = 7;
    camera.right = 7;
    camera.bottom = -7;
    camera.left = -7;

    sunLight.position.set(5, 5, 5);

    this.sunLight = sunLight;
    this.scene.add(ambientLight, sunLight);
  };

  private setHelpers = () => {
    this.axisHelper = new THREE.AxesHelper(3);
    this.lightHelper = new THREE.DirectionalLightHelper(this.sunLight);
    this.gridHelper = new THREE.GridHelper(10, 10);

    this.scene.add(this.axisHelper, this.lightHelper, this.gridHelper);
  };

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry<EnvironmentState>(
      "environment-gui-state",
      {
        axisHelper: true,
        lightHelper: true,
        gridHelper: true,
      },
    );

    registry
      .bind("axisHelper", (v) => {
        this.axisHelper.visible = v;
      })
      .bind("lightHelper", (v) => {
        this.lightHelper.visible = v;
      })
      .bind("gridHelper", (v) => {
        this.gridHelper.visible = v;
      });

    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const helpersFolder = gui.addFolder("Helpers");
    helpersFolder.add(state, "axisHelper").name("Axis Helper");
    helpersFolder.add(state, "lightHelper").name("Light Helper");
    helpersFolder.add(state, "gridHelper").name("Grid Helper");
    helpersFolder
      .add(
        {
          resetPivot: () => {
            const { controls } = this.camera;
            controls.target.set(0, 0, 0);
            controls.update();

            console.log("click");
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
    this.lightHelper.dispose();
    this.gridHelper.dispose();
    this.guiRegistry?.dispose();
  };
}

export default Environment;
