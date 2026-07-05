import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { AnimationState, GltfEntity } from "./types/entity";

import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import { GLTF } from "three/examples/jsm/Addons.js";

class Human extends GltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected model: THREE.Group;
  private guiRegistry: GUIStateRegistry<{ animation: string }> | null = null;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setModel();
    this.scene.add(this.model);
    this.castModelShadows();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Human");
  }

  protected setModel = (): void => {
    const humanGltf: GLTF = this.resources.getGltf("human");
    console.log(humanGltf);

    const humanModelLoaded = humanGltf.scene;

    this.model = humanModelLoaded;

    this.model.position.set(0, 3.5, 0);
  };

  protected addDebugFolders = (): void => {
    const registry = new GUIStateRegistry("fox-gui-state", {
      animation: "guard",
    });

    this.guiRegistry = registry;

    const debugFolder = this.debug.gui.addFolder("Human");
  };

  private castModelShadows = () => {
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
    });
  };

  update = (): void => {};

  destroy = (): void => {
    this.guiRegistry?.dispose();

    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry.dispose();

      /*
        ? Dispose material(s). A mesh can have either a single material or
        ? an array of materials when different geometry groups use different materials.
      */
      if (!Array.isArray(child.material)) {
        child.material.dispose();
        return;
      }

      for (const material of child.material) {
        material.dispose();
      }
    });

    this.scene.remove(this.model);
  };
}

export default Human;
