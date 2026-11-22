import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";

/** Light scoped to the performance-tips lesson scene, matching the starter's directional light exactly, instead of the project's own global `Environment` lights. */
class PerformanceLight implements Destroyable {
  public static readonly CONFIG = {
    color: "#ffffff",
    intensity: 3,
    position: { x: 0.25, y: 3, z: 2.25 },
    shadow: {
      mapSize: 2 ** 10,
      normalBias: 0.05,
      camera: {
        far: 15,
      },
    },
  } as const;

  private readonly experience: Experience;
  private directionalLight: THREE.DirectionalLight;

  private get scene() {
    return this.experience.scene;
  }

  constructor() {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.setDirectionalLight();

    console.log("PerformanceLight");
  }

  private setDirectionalLight(): void {
    const { color, intensity, position } = PerformanceLight.CONFIG;
    const directionalLight = new THREE.DirectionalLight(color, intensity);

    const { mapSize, normalBias, camera } = PerformanceLight.CONFIG.shadow;
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(mapSize, mapSize);
    directionalLight.shadow.normalBias = normalBias;
    directionalLight.shadow.camera.far = camera.far;

    directionalLight.position.set(position.x, position.y, position.z);

    this.directionalLight = directionalLight;
    this.scene.add(directionalLight);
  }

  public destroy(): void {
    this.scene.remove(this.directionalLight);
    this.directionalLight.dispose();
  }
}

export default PerformanceLight;
