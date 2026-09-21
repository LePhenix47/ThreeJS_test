import * as THREE from "three";
import Experience, { Destroyable } from "@modules/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { EnvironmentEntity } from "./types/environment-entity";

type EnvironmentState = {
  backgroundIntensity: number;
  /** Degrees. */
  backgroundRotationX: number;
  /** Degrees. */
  backgroundRotationY: number;
  /** Degrees. */
  backgroundRotationZ: number;
};

class Environment extends EnvironmentEntity implements Destroyable {
  public static readonly CONFIG = {
    envMap: {
      mapping: THREE.EquirectangularReflectionMapping,
      colorSpace: THREE.SRGBColorSpace,
    },
  } as const;

  private readonly experience: Experience | null;

  protected envMapTexture: THREE.Texture | THREE.CubeTexture | null = null;

  private guiRegistry: GUIStateRegistry<EnvironmentState> | null = null;

  private readonly debugDefaults: EnvironmentState = {
    // ? The panorama is bright, so it's dimmed to keep the Earth and the stars as the focus
    backgroundIntensity: 0.2,
    backgroundRotationX: 0,
    backgroundRotationY: 0,
    backgroundRotationZ: 0,
  };

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

    if (!Experience.instance) throw new Error("Experience instance not found");
    this.experience = Experience.instance;

    this.setEnvMap();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Environment");
  }

  protected setEnvMap(): void {
    const { backgroundIntensity } = this.debugDefaults;

    const { color } = this.resources.getTextures("milkyWay");

    const { mapping, colorSpace } = Environment.CONFIG.envMap;
    // ? The map is an equirectangular projection, so it wraps around the whole sphere
    color.mapping = mapping;
    color.colorSpace = colorSpace;

    this.scene.background = color;
    this.scene.backgroundIntensity = backgroundIntensity;
    this.scene.environment = color;
    this.updateOrientation();

    this.envMapTexture = color;
  }

  // ? Nothing to update: the Earth is a ShaderMaterial, so no material reads scene.environment
  protected updateMaterial(): void {}

  /** Applies the X/Y/Z rotation from the GUI state to the background. */
  private updateOrientation = (): void => {
    const {
      backgroundRotationX: x,
      backgroundRotationY: y,
      backgroundRotationZ: z,
    } = this.guiRegistry?.state || this.debugDefaults;
    const { backgroundRotation } = this.scene;

    backgroundRotation.x = THREE.MathUtils.degToRad(x);
    backgroundRotation.y = THREE.MathUtils.degToRad(y);
    backgroundRotation.z = THREE.MathUtils.degToRad(z);
  };

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<EnvironmentState>(
      "environment-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const folder = gui.addFolder("Environment");

    folder
      .add(state, "backgroundIntensity")
      .min(0)
      .max(2)
      .step(0.001)
      .name("Background intensity");
    registry.bind("backgroundIntensity", (v) => {
      this.scene.backgroundIntensity = v;
    });

    folder
      .add(state, "backgroundRotationX")
      .min(-180)
      .max(180)
      .step(0.1)
      .name("Background rotation X");
    registry.bind("backgroundRotationX", this.updateOrientation);

    folder
      .add(state, "backgroundRotationY")
      .min(-180)
      .max(180)
      .step(0.1)
      .name("Background rotation Y");
    registry.bind("backgroundRotationY", this.updateOrientation);

    folder
      .add(state, "backgroundRotationZ")
      .min(-180)
      .max(180)
      .step(0.1)
      .name("Background rotation Z");
    registry.bind("backgroundRotationZ", this.updateOrientation);
  }

  public destroy(): void {
    this.guiRegistry?.dispose();

    this.scene.background = null;
    this.envMapTexture?.dispose();
  }
}

export default Environment;
