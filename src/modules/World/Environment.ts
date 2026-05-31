import Experience, { Destroyable } from "@modules/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type EnvironmentMap = {
  texture: THREE.CubeTexture | null;
  intensity: number;
  updateMaterial: () => void;
};

class Environment implements Destroyable {
  private readonly experience: Experience | null;
  private sunLight: THREE.DirectionalLight;
  private envMap: EnvironmentMap;
  private guiRegistry: GUIStateRegistry<{
    envMapIntensity: number;
    sunLightIntensity: number;
  }> | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    console.log("World");

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.envMap = this.setEnvMap();
    this.sunLight = this.initSunLight(true);
    this.scene.add(this.sunLight);
    this.scene.environment = this.envMap.texture;
    this.scene.background = this.envMap.texture;

    if (this.debug.isActive) {
      this.addDebugFolders();
    }
  }

  private setEnvMap = (): EnvironmentMap => {
    /*
     * updateMaterial lives on the data bag so GUI debug controls can call it directly
     * when intensity/texture changes — no need to pass a separate callback reference
     *  */
    const initEnvMap: EnvironmentMap = {
      intensity: 0.4,
      texture: null,
      updateMaterial: this.updateMaterial,
    };

    const texture = this.resources.getCubeTexture("environmentMapTexture");
    texture.colorSpace = THREE.SRGBColorSpace;

    initEnvMap.texture = texture;

    return initEnvMap;
  };

  private initSunLight = (helper?: boolean) => {
    const sunLight = new THREE.DirectionalLight("white", 4);

    const mapSize = 2 ** 10;
    sunLight.castShadow = true;
    sunLight.shadow.camera.far = 15;
    sunLight.shadow.mapSize.set(mapSize, mapSize);
    sunLight.shadow.normalBias = 0.05;

    sunLight.position.set(3, 3, -2.25);

    if (helper) {
      const helper = new THREE.DirectionalLightHelper(sunLight, 5);
      this.scene.add(helper);
    }

    return sunLight;
  };

  private updateMaterial = () => {
    this.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.material.envMap = this.envMap.texture;
      child.material.envMapIntensity = this.envMap.intensity;
      child.material.needsUpdate = true;
    });
  };
  private addDebugFolders = () => {
    const registry = new GUIStateRegistry("environment-gui-state", {
      envMapIntensity: this.envMap.intensity,
      sunLightIntensity: this.sunLight.intensity,
    });

    registry
      .bind("envMapIntensity", (v) => {
        this.envMap.intensity = v;
        this.envMap.updateMaterial();
      })
      .bind("sunLightIntensity", (v) => {
        this.sunLight.intensity = v;
      });

    this.guiRegistry = registry;

    const folder = this.debug.gui.addFolder("Environment");
    folder
      .add(registry.state, "envMapIntensity", 0, 4, 0.001)
      .name("Env Map Intensity");
    folder
      .add(registry.state, "sunLightIntensity", 0, 10, 0.001)
      .name("Sun Light Intensity");
  };

  public destroy = () => {
    this.guiRegistry?.dispose();
  };
}

export default Environment;
