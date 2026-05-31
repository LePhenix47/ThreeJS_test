import Experience from "@modules/Experience/Experience";
import * as THREE from "three";

type EnvironmentMap = {
  texture: THREE.CubeTexture | null;
  intensity: number;
  updateMaterial: () => void;
};

class Environment {
  private readonly experience: Experience | null;
  private sunLight: THREE.DirectionalLight;
  private envMap: EnvironmentMap;

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

    // * Env map
    this.envMap = this.setEnvMap();

    // * Sunlight
    this.sunLight = this.initSunLight(true);
    this.scene.add(this.sunLight);

    this.scene.environment = this.envMap.texture;
    this.scene.background = this.envMap.texture;
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
  /*

  */
}

export default Environment;
