import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity } from "./types/environment-entity";

type EnvironmentState = {
  environmentColor: string;
};

class Environment extends EnvironmentEntity implements Destroyable {
  private readonly experience: Experience | null;
  private guiRegistry: GUIStateRegistry<EnvironmentState> | null = null;

  private readonly debugDefaults: EnvironmentState = {
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

    // ? Applied here too, the GUI bind below only runs with ?debug=true
    this.applyEnvironmentColor();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected updateMaterial(): void {}

  protected setEnvMap(): void {}

  /** Sets the renderer clear color from the current state. */
  private applyEnvironmentColor = (): void => {
    const { environmentColor } = this.guiRegistry?.state || this.debugDefaults;
    const threeColor = new THREE.Color(environmentColor);

    this.renderer.instance.setClearColor(threeColor);
  };

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
    registry.bind("environmentColor", this.applyEnvironmentColor);
  }

  public destroy(): void {
    this.guiRegistry?.dispose();
  }
}

export default Environment;
