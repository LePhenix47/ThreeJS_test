import * as THREE from "three";
import Experience, { Destroyable } from "@modules/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import {
  EnvironmentEntity,
  EnvironmentMapConfig,
} from "./types/environment-entity";

type EnvironmentState = {
  backgroundIntensity: number;
  backgroundBlurriness: number;
  /** Degrees. Turns the map around the Y axis. */
  backgroundRotationY: number;
  /** Degrees. Tilts the map, since the real Milky Way band crosses the sky at an angle. */
  backgroundRotationZ: number;
};

class Environment extends EnvironmentEntity implements Destroyable {
  private readonly experience: Experience | null;

  protected envMapTexture: THREE.Texture | THREE.CubeTexture | null = null;
  protected envMapConfig: EnvironmentMapConfig = {};

  private guiRegistry: GUIStateRegistry<EnvironmentState> | null = null;

  private readonly debugDefaults: EnvironmentState = {
    // ? The map is very dark (mean luma about 4%), so it needs a boost to be visible
    backgroundIntensity: 2,
    // ? Any blurriness makes Three prefilter the map, which loses detail an already low resolution can't spare
    backgroundBlurriness: 0,
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
    const { backgroundIntensity, backgroundBlurriness } = this.debugDefaults;

    const texture = this.resources.getTexture("milkyWay", "color");
    // ? The map is an equirectangular projection, so it wraps around the whole sphere
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;

    const { scene } = this;
    scene.background = texture;
    scene.backgroundIntensity = backgroundIntensity;
    scene.backgroundBlurriness = backgroundBlurriness;
    this.updateOrientation();

    this.envMapTexture = texture;
    this.envMapConfig = { backgroundIntensity, backgroundBlurriness };
  }

  // ? Nothing to update: the Earth is a ShaderMaterial, so no material reads scene.environment
  protected updateMaterial(): void {}

  /** Applies the Y rotation and tilt from the GUI state to the background. */
  private updateOrientation = (): void => {
    const { backgroundRotationY, backgroundRotationZ } =
      this.guiRegistry?.state || this.debugDefaults;
    const { backgroundRotation } = this.scene;

    backgroundRotation.y = THREE.MathUtils.degToRad(backgroundRotationY);
    backgroundRotation.z = THREE.MathUtils.degToRad(backgroundRotationZ);
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
      .max(5)
      .step(0.001)
      .name("Background intensity");
    registry.bind("backgroundIntensity", (v) => {
      this.scene.backgroundIntensity = v;
    });

    folder
      .add(state, "backgroundBlurriness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Background blurriness");
    registry.bind("backgroundBlurriness", (v) => {
      this.scene.backgroundBlurriness = v;
    });

    folder
      .add(state, "backgroundRotationY")
      .min(-180)
      .max(180)
      .step(0.1)
      .name("Background rotation Y");
    registry.bind("backgroundRotationY", this.updateOrientation);

    folder
      .add(state, "backgroundRotationZ")
      .min(-90)
      .max(90)
      .step(0.1)
      .name("Background tilt");
    registry.bind("backgroundRotationZ", this.updateOrientation);
  }

  public destroy(): void {
    this.guiRegistry?.dispose();

    this.scene.background = null;
    this.envMapTexture?.dispose();
  }
}

export default Environment;
