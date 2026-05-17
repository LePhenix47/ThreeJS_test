import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import * as THREE from "three";

class Environment {
  private readonly experience: Experience | null;

  private sunLight: THREE.DirectionalLight;
  constructor() {
    console.log("World");

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.sunLight = this.initSunLight();

    this.experience!.scene.add(this.sunLight);

    const helper = new THREE.DirectionalLightHelper(this.sunLight, 5);
    this.experience!.scene.add(helper);
  }

  private initSunLight = () => {
    const sunLight = new THREE.DirectionalLight("red", 4);

    const mapSize = 2 ** 10;
    sunLight.castShadow = true;
    sunLight.shadow.camera.far = 15;
    sunLight.shadow.mapSize.set(mapSize, mapSize);
    sunLight.shadow.normalBias = 0.05;

    sunLight.position.set(3, 3, -2.25);

    return sunLight;
  };
}

export default Environment;
