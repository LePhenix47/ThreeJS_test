import Experience, { Destroyable } from "@modules/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity, EnvironmentMapConfig } from "./types/entity";

type EnvironmentState = {
  lightHelper: boolean;
  environmentColor: string;
};

class Environment implements Destroyable {
  private readonly experience: Experience | null;
  private ambientLight: THREE.AmbientLight;
  private sunLight: THREE.DirectionalLight;
  private lightHelper: THREE.DirectionalLightHelper;
  private guiRegistry: GUIStateRegistry<EnvironmentState> | null = null;

  private readonly debugDefaults: EnvironmentState = {
    lightHelper: true,
    environmentColor: "black",
  };

  protected envMapTexture: THREE.Texture | THREE.CubeTexture | null = null;
  protected envMapConfig: EnvironmentMapConfig = {};

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get renderer() {
    return this.experience!.renderer;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.scene.background = this.envMapTexture;
    this.scene.environment = this.envMapTexture;

    this.setAmbientLight();
    this.setSunLight();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected updateMaterial = (): void => {};

  private setAmbientLight = (): void => {
    this.ambientLight = new THREE.AmbientLight("#ffffff", 1);
    this.scene.add(this.ambientLight);
  };

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

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry<EnvironmentState>(
      "environment-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const environMentFolder = gui.addFolder("environMentFolder");
    environMentFolder
      .addColor(state, "environmentColor")
      .name("Renderer clear color");
    registry.bind("environmentColor", (v) => {
      const threeColor = new THREE.Color(v);
      this.renderer.instance.setClearColor(threeColor);
    });

    const helpersFolder = environMentFolder.addFolder("Helpers");

    helpersFolder.add(state, "lightHelper").name("Light Helper");
    registry.bind("lightHelper", (v) => {
      this.lightHelper.visible = v;
    });
  };

  public destroy = () => {
    this.scene.remove(this.ambientLight, this.sunLight, this.lightHelper);
    this.ambientLight.dispose();
    this.sunLight.dispose();
    this.lightHelper?.dispose();
    this.guiRegistry?.dispose();
  };
}

export default Environment;
