import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity } from "./types/environment-entity";

type EnvironmentState = {
  lightHelperVisible: boolean;
};

// * Remove lights: git cherry-pick c647e5364f7b5371c91cba8d7474c25e4623e3b5
class Environment extends EnvironmentEntity implements Destroyable {
  public static readonly CONFIG = {
    guiKey: "environment-gui-state",
    ambientLight: {
      color: "#ffffff",
      intensity: 1,
    },
    directionalLight: {
      color: "#ffffff",
      intensity: 4,
      position: {
        x: 6.25,
        y: 3,
        z: 4,
      },
      shadow: {
        mapSize: 2 ** 10,
        normalBias: 0.05,
        camera: {
          near: 0.1,
          far: 30,
          top: 8,
          right: 8,
          bottom: -8,
          left: -8,
        },
      },
    },
    envMap: {
      backgroundBlurriness: 0.5,
    },
  } as const;

  private readonly experience: Experience | null;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private lightHelper: THREE.DirectionalLightHelper;
  protected override guiRegistry: GUIStateRegistry<EnvironmentState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: EnvironmentState = {
    lightHelperVisible: false,
  };

  protected envMapTexture: THREE.Texture | THREE.CubeTexture | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get renderer() {
    return this.experience!.renderer;
  }

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setEnvMap();

    this.setAmbientLight();
    this.setDirectionalLight();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected updateMaterial(): void {}

  protected setEnvMap(): void {
    const { backgroundBlurriness } = Environment.CONFIG.envMap;

    const envMapTexture = this.resources.getDataTexture(
      "aerodynamics-workshop",
    );
    envMapTexture.mapping = THREE.EquirectangularReflectionMapping;

    this.scene.background = envMapTexture;
    this.scene.backgroundBlurriness = backgroundBlurriness;
    this.scene.environment = envMapTexture;

    this.envMapTexture = envMapTexture;
  }

  private setAmbientLight(): void {
    const { color, intensity } = Environment.CONFIG.ambientLight;
    this.ambientLight = new THREE.AmbientLight(color, intensity);
    this.scene.add(this.ambientLight);
  }

  private setDirectionalLight(): void {
    const { color, intensity } = Environment.CONFIG.directionalLight;
    const directionalLight = new THREE.DirectionalLight(color, intensity);

    const { mapSize, normalBias } = Environment.CONFIG.directionalLight.shadow;
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(mapSize, mapSize);
    directionalLight.shadow.normalBias = normalBias;

    const { near, far, top, right, bottom, left } =
      Environment.CONFIG.directionalLight.shadow.camera;
    const { camera } = directionalLight.shadow;
    camera.near = near;
    camera.far = far;
    camera.top = top;
    camera.right = right;
    camera.bottom = bottom;
    camera.left = left;

    const { x, y, z } = Environment.CONFIG.directionalLight.position;
    directionalLight.position.set(x, y, z);

    this.directionalLight = directionalLight;
    this.scene.add(directionalLight);

    const lightHelper = new THREE.DirectionalLightHelper(directionalLight);
    const { lightHelperVisible } =
      this.guiRegistry?.state || this.DEBUG_DEFAULTS;
    lightHelper.visible = lightHelperVisible;

    this.lightHelper = lightHelper;

    this.scene.add(this.lightHelper);
  }

  protected override addDebugFolders(): void {
    const { guiKey } = Environment.CONFIG;
    const registry = new GUIStateRegistry<EnvironmentState>(
      guiKey,
      this.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const environmentFolder = gui.addFolder("Environment");

    const helpersFolder = environmentFolder.addFolder("Helpers");

    helpersFolder.add(state, "lightHelperVisible").name("Light Helper");
    registry.bind("lightHelperVisible", (v) => {
      this.lightHelper.visible = v;
    });
  }

  public destroy(): void {
    this.scene.remove(
      this.ambientLight,
      this.directionalLight,
      this.lightHelper,
    );

    this.ambientLight.dispose();

    this.directionalLight.dispose();
    this.lightHelper?.dispose();

    this.scene.background = null;
    this.scene.environment = null;
    this.envMapTexture?.dispose();

    this.guiRegistry?.dispose();
  }
}

export default Environment;
