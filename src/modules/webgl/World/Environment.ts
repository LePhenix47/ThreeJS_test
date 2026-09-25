import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity } from "./types/environment-entity";

type EnvironmentState = {
  lightHelper: boolean;
  environmentColor: string;
};

class Environment extends EnvironmentEntity implements Destroyable {
  public static readonly CONFIG = {
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

  private readonly experience: Experience | null;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private lightHelper: THREE.DirectionalLightHelper;
  private guiRegistry: GUIStateRegistry<EnvironmentState> | null = null;

  private readonly debugDefaults: EnvironmentState = {
    lightHelper: true,
    environmentColor: "#181818",
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

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.scene.background = this.envMapTexture;
    this.scene.environment = this.envMapTexture;

    // ? Seeded from the defaults, the GUI bind only runs with ?debug=true
    this.renderer.instance.setClearColor(this.debugDefaults.environmentColor);

    this.setAmbientLight();
    this.setDirectionalLight();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected updateMaterial(): void {}

  protected setEnvMap(): void {}

  private setAmbientLight(): void {
    const { color, intensity } = Environment.CONFIG.ambientLight;
    this.ambientLight = new THREE.AmbientLight(color, intensity);
    this.scene.add(this.ambientLight);
  }

  private setDirectionalLight(withHelper = true): void {
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

    if (!withHelper) return;
    this.lightHelper = new THREE.DirectionalLightHelper(directionalLight);
    this.scene.add(this.lightHelper);
  }

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<EnvironmentState>(
      "environment-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const environmentFolder = gui.addFolder("Environment");
    environmentFolder
      .addColor(state, "environmentColor")
      .name("Renderer clear color");
    registry.bind("environmentColor", (v) => {
      const threeColor = new THREE.Color(v);
      this.renderer.instance.setClearColor(threeColor);
    });

    const helpersFolder = environmentFolder.addFolder("Helpers");

    helpersFolder.add(state, "lightHelper").name("Light Helper");
    registry.bind("lightHelper", (v) => {
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
