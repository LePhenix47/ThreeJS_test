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
  private sunLightHelper: THREE.DirectionalLightHelper | null = null;
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
  }

  public destroy = () => {};
}

export default Environment;
