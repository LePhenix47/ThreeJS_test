import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity } from "./types/environment-entity";

type EnvironmentState = {
  lightHelperVisible: boolean;
  environmentColor: string;
  chosenPictureIndex: number;
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
      intensity: 3,
      position: {
        x: 0.25,
        y: 2,
        z: -2.25,
      },
      shadow: {
        mapSize: 2 ** 10,
        normalBias: 0.05,
        camera: {
          far: 15,
          top: 7,
          right: 7,
          bottom: -7,
          left: -7,
        },
      },
    },
  } as const;

  private texturesArray: THREE.CubeTexture[];

  private readonly experience: Experience | null;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private lightHelper: THREE.DirectionalLightHelper;
  protected override guiRegistry: GUIStateRegistry<EnvironmentState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: EnvironmentState = {
    lightHelperVisible: false,
    environmentColor: "#160920",
    chosenPictureIndex: 0,
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

    this.setTexturesArray();
    this.setEnvMap();

    this.setAmbientLight();
    this.setDirectionalLight();

    this.applyEnvironmentColor();
    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected updateMaterial(): void {}

  private setTexturesArray(): void {
    this.texturesArray = this.resources.getCubeTextureArray("envMaps");
  }

  protected setEnvMap = (): void => {
    const { chosenPictureIndex } =
      this.guiRegistry?.state || this.DEBUG_DEFAULTS;

    const texture = this.texturesArray[chosenPictureIndex];
    if (!texture) {
      console.error("Cannot choose out of bounds picture");
      return;
    }

    this.envMapTexture = texture;
    this.scene.background = texture;
    this.scene.environment = texture;
  };

  /** Sets the renderer clear color from the current state. */
  private applyEnvironmentColor = (): void => {
    const { environmentColor } = this.guiRegistry?.state || this.DEBUG_DEFAULTS;
    const threeColor = new THREE.Color(environmentColor);

    this.renderer.instance.setClearColor(threeColor);
  };

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

    const { far, top, right, bottom, left } =
      Environment.CONFIG.directionalLight.shadow.camera;
    const { camera } = directionalLight.shadow;
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
    environmentFolder
      .addColor(state, "environmentColor")
      .name("Renderer clear color");
    registry.bind("environmentColor", this.applyEnvironmentColor);

    const textureArrayIndex = this.texturesArray.map((v, i) => i);
    environmentFolder
      .add(state, "chosenPictureIndex", textureArrayIndex)
      .name("Env map");
    registry.bind("chosenPictureIndex", this.setEnvMap);

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

    this.guiRegistry?.dispose();
  }
}

export default Environment;
