import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import * as THREE from "three";

class Environment {
  private readonly experience: Experience | null;
  private sunLight: THREE.DirectionalLight;
  private envMap: THREE.CubeTexture;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    console.log("World");

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    // * Env mpa
    this.envMap = this.setEnvMap();

    // * Sunlight
    this.sunLight = this.initSunLight(true);
    this.scene.add(this.sunLight);
  }

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

  private setEnvMap = (): THREE.CubeTexture => {
    const loadedEnvMapTexture = this.resources.getCubeTexture(
      "environmentMapTexture",
    );

    return loadedEnvMapTexture;
  };
}

export default Environment;
