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
    guiKey: "environment-gui-state",
  } as const;

  private readonly experience: Experience | null;
  protected override guiRegistry: GUIStateRegistry<EnvironmentState> | null =
    null;

  protected readonly DEBUG_DEFAULTS: EnvironmentState = {
    lightHelper: true,
    environmentColor: "#29191f",
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

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected updateMaterial(): void {}

  protected setEnvMap(): void {}

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
    registry.bind("environmentColor", (v) => {
      const threeColor = new THREE.Color(v);
      this.renderer.instance.setClearColor(threeColor);
    });
  }

  public destroy(): void {
    this.guiRegistry?.dispose();
  }
}

export default Environment;
