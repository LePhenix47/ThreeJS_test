import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type PerformanceLightState = {
  shadowCameraHelperVisible: boolean;
};

/** Light scoped to the performance-tips lesson scene, matching the starter's directional light exactly, instead of the project's own global `Environment` lights. */
class PerformanceLight implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "performance-light-gui-state",
    color: "#ffffff",
    intensity: 3,
    position: { x: 0.25, y: 3, z: 2.25 },
    shadow: {
      mapSize: 2 ** 10,
      normalBias: 0.05,
      camera: {
        far: 10, // ? keep as low as possible
      },
    },
  } as const;

  private readonly experience: Experience;
  private directionalLight: THREE.DirectionalLight;
  private shadowCameraHelper: THREE.CameraHelper;
  private guiRegistry: GUIStateRegistry<PerformanceLightState> | null = null;

  private readonly DEBUG_DEFAULTS: PerformanceLightState = {
    shadowCameraHelperVisible: false,
  };

  private get scene() {
    return this.experience.scene;
  }

  private get debug() {
    return this.experience.debug;
  }

  constructor() {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.setDirectionalLight();
    this.setShadowCameraHelper();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

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

  private setShadowCameraHelper(): void {
    const shadowCameraHelper = new THREE.CameraHelper(
      this.directionalLight.shadow.camera,
    );
    shadowCameraHelper.visible = this.DEBUG_DEFAULTS.shadowCameraHelperVisible;

    this.shadowCameraHelper = shadowCameraHelper;
    this.scene.add(shadowCameraHelper);
  }

  private addDebugFolders(): void {
    const { guiKey } = PerformanceLight.CONFIG;
    const registry = new GUIStateRegistry<PerformanceLightState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const lightFolder = gui.addFolder("Performance Light");

    lightFolder
      .add(state, "shadowCameraHelperVisible")
      .name("Shadow Camera Helper");
    registry.bind("shadowCameraHelperVisible", (v) => {
      this.shadowCameraHelper.visible = v;
    });
  }

  public destroy(): void {
    this.scene.remove(this.directionalLight, this.shadowCameraHelper);
    this.directionalLight.dispose();
    this.shadowCameraHelper.dispose();
    this.guiRegistry?.dispose();
  }
}

export default PerformanceLight;
