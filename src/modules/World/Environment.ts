import Experience, { Destroyable } from "@modules/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity, EnvironmentMapConfig } from "./types/entity";

class Environment extends EnvironmentEntity implements Destroyable {
  private readonly experience: Experience | null;

  private sunLight: THREE.DirectionalLight;
  private sunLightHelper: THREE.DirectionalLightHelper | null = null;

  protected envMapTexture: THREE.CubeTexture | null = null;
  protected envMapConfig: EnvironmentMapConfig = { environmentIntensity: 0.4 };

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
    super();
    console.log("World");

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setEnvMap();
    this.setSunLight(true);

    this.scene.add(this.sunLight);

    this.scene.environment = this.envMapTexture;
    this.scene.background = this.envMapTexture;

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }
  }

  protected setEnvMap = (): void => {
    const texture = this.resources.getCubeTexture("environmentMapTexture");
    texture.colorSpace = THREE.SRGBColorSpace;

    this.envMapTexture = texture;
  };

  private setSunLight = (showHelper?: boolean): void => {
    const sunLight = new THREE.DirectionalLight("white", 4);

    const mapSize = 2 ** 10;
    sunLight.castShadow = true;
    sunLight.shadow.camera.far = 15;
    sunLight.shadow.mapSize.set(mapSize, mapSize);
    sunLight.shadow.normalBias = 0.05;

    sunLight.position.set(3, 3, -2.25);
    this.sunLight = sunLight;

    if (!showHelper) return;

    this.sunLightHelper = new THREE.DirectionalLightHelper(this.sunLight, 5);
    this.scene.add(this.sunLightHelper);
  };

  protected updateMaterial = (): void => {
    const { environmentIntensity } = this.envMapConfig;

    this.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.material.envMap = this.envMapTexture;
      child.material.envMapIntensity = environmentIntensity ?? 1;
      child.material.needsUpdate = true;
    });
  };

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry("environment-gui-state", {
      envMapIntensity: this.envMapConfig.environmentIntensity ?? 1,
      sunLightIntensity: this.sunLight.intensity,
      sunLightHelper: false,
    });

    registry
      .bind("envMapIntensity", (v) => {
        this.envMapConfig.environmentIntensity = v;
        this.updateMaterial();
      })
      .bind("sunLightIntensity", (v) => {
        this.sunLight.intensity = v;
      })
      .bind("sunLightHelper", (v) => {
        if (!this.sunLightHelper) return;

        this.sunLightHelper.visible = v;
      });

    this.guiRegistry = registry;

    const folder = this.debug.gui.addFolder("Environment");
    folder
      .add(registry.state, "envMapIntensity")
      .min(0)
      .max(4)
      .step(0.001)
      .name("Env Map Intensity");

    folder
      .add(registry.state, "sunLightIntensity")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Sun Light Intensity");

    folder.add(registry.state, "sunLightHelper").name("Show Sun Light Helper");
  };

  public destroy = () => {
    this.guiRegistry?.dispose();
  };
}

export default Environment;
