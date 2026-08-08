import Experience, { Destroyable } from "@modules/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity, EnvironmentMapConfig } from "./types/entity";
import { Sky } from "three/addons/objects/Sky.js";

type EnvironmentState = {
  environmentColor: string;
  skyTurbidity: number;
  skyRayleigh: number;
  skyMieDirectionalG: number;
  skyMieCoefficient: number;
  sunPositionX: number;
  sunPositionY: number;
  sunPositionZ: number;
};

class Environment implements Destroyable {
  private readonly experience: Experience | null;

  private ambientLight: THREE.AmbientLight;

  private sky: Sky;

  private guiRegistry: GUIStateRegistry<EnvironmentState> | null = null;

  private readonly debugDefaults: EnvironmentState = {
    environmentColor: "black",
    skyTurbidity: 10,
    skyRayleigh: 3,
    skyMieDirectionalG: 0.95,
    skyMieCoefficient: 0.1,
    sunPositionX: 0.3,
    sunPositionY: -0.038,
    sunPositionZ: -0.95,
  };

  protected envMapTexture: THREE.Texture | THREE.CubeTexture | null = null;
  protected envMapConfig: EnvironmentMapConfig = {};

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private get renderer() {
    return this.experience!.renderer;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.scene.background = this.envMapTexture;
    this.scene.environment = this.envMapTexture;

    this.setAmbientLight();
    this.setSky();

    this.scene.add(this.sky);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected updateMaterial = (): void => {};

  private setAmbientLight = (): void => {
    this.ambientLight = new THREE.AmbientLight("#ffffff", 1);
    this.scene.add(this.ambientLight);
  };

  private setSky = () => {
    const sky = new Sky();

    // * The sky is a shader
    // ? https://threejs.org/docs/#api/en/objects/Sky
    sky.material.uniforms.turbidity.value = 10;
    sky.material.uniforms.rayleigh.value = 3;
    sky.material.uniforms.mieDirectionalG.value = 0.95;
    sky.material.uniforms.mieCoefficient.value = 0.1;
    sky.material.uniforms.sunPosition.value.set(0.3, -0.038, -0.95);

    sky.scale.setScalar(100);

    this.sky = sky;
  };

  private addDebugFolders = () => {
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

    const skyFolder = environmentFolder.addFolder("Sky");

    skyFolder
      .add(state, "skyTurbidity")
      .min(0)
      .max(20)
      .step(0.1)
      .name("Turbidity");
    registry.bind("skyTurbidity", (v) => {
      this.sky.material.uniforms.turbidity.value = v;
    });

    skyFolder
      .add(state, "skyRayleigh")
      .min(0)
      .max(10)
      .step(0.01)
      .name("Rayleigh");
    registry.bind("skyRayleigh", (v) => {
      this.sky.material.uniforms.rayleigh.value = v;
    });

    skyFolder
      .add(state, "skyMieDirectionalG")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Mie Directional G");
    registry.bind("skyMieDirectionalG", (v) => {
      this.sky.material.uniforms.mieDirectionalG.value = v;
    });

    skyFolder
      .add(state, "skyMieCoefficient")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Mie Coefficient");
    registry.bind("skyMieCoefficient", (v) => {
      this.sky.material.uniforms.mieCoefficient.value = v;
    });

    const sunPosFolder = skyFolder.addFolder("Sun Position");

    sunPosFolder
      .add(state, "sunPositionX")
      .min(-1)
      .max(1)
      .step(0.001)
      .name("X");
    registry.bind("sunPositionX", (v) => {
      this.sky.material.uniforms.sunPosition.value.x = v;
    });

    sunPosFolder
      .add(state, "sunPositionY")
      .min(-1)
      .max(1)
      .step(0.001)
      .name("Y");
    registry.bind("sunPositionY", (v) => {
      this.sky.material.uniforms.sunPosition.value.y = v;
    });

    sunPosFolder
      .add(state, "sunPositionZ")
      .min(-1)
      .max(1)
      .step(0.001)
      .name("Z");
    registry.bind("sunPositionZ", (v) => {
      this.sky.material.uniforms.sunPosition.value.z = v;
    });
  };

  public destroy = () => {
    this.scene.remove(this.ambientLight);
    this.ambientLight.dispose();
    this.guiRegistry?.dispose();
  };
}

export default Environment;
