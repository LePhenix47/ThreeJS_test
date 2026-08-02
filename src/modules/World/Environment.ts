import Experience, { Destroyable } from "@modules/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity, EnvironmentMapConfig } from "./types/entity";

type EnvironmentState = {
  lightHelper: boolean;
  environmentColor: string;
};

class Environment implements Destroyable {
  private readonly experience: Experience | null;
  private guiRegistry: GUIStateRegistry<EnvironmentState> | null = null;

  private readonly debugDefaults: EnvironmentState = {
    lightHelper: true,
    environmentColor: "#1d1f2a",
  };

  protected envMapTexture: THREE.Texture | THREE.CubeTexture | null = null;
  protected envMapConfig: EnvironmentMapConfig = {};

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
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.scene.background = this.envMapTexture;
    this.scene.environment = this.envMapTexture;

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected updateMaterial = (): void => {};

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry<EnvironmentState>(
      "environment-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const environMentFolder = gui.addFolder("Environment");
    environMentFolder
      .addColor(state, "environmentColor")
      .name("Renderer clear color");
    registry.bind("environmentColor", (v) => {
      const threeColor = new THREE.Color(v);
      this.renderer.instance.setClearColor(threeColor);
    });
  };

  public destroy = () => {
    this.guiRegistry?.dispose();
  };
}

export default Environment;
