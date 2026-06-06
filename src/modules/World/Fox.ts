import { GLTF } from "three/examples/jsm/Addons.js";
import Experience, { Destroyable, Updatable } from "../Experience/Experience";
import { GltfEntity } from "./types/entity";
import * as THREE from "three";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type AnimationName = "guard" | "walk" | "run";

type AnimationState = {
  mixer: THREE.AnimationMixer;
  actions: Record<AnimationName, THREE.AnimationAction> & {
    current: THREE.AnimationAction;
  };
  play: (name: AnimationName) => void;
};

class Fox extends GltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected model: THREE.Group;
  private animation: AnimationState;
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
    this.setAnimations();

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Fox");
  }

  protected setModel = () => {
    const foxGltf: GLTF = this.resources.getGltf("fox");

    const fox = foxGltf.scene;
    fox.scale.setScalar(0.02);

    this.model = fox;
    this.model.animations = foxGltf.animations; // ? ≠ foxGltf.scene.animations ⚠
  };

  private castModelShadows = () => {
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
    });
  };

  private setAnimations = () => {
    // * We put properties in an object to make them available in the debug GUI
    const mixer = new THREE.AnimationMixer(this.model);
    const [guardClip, walkClip, runClip] = this.model.animations;

    const actions = {
      guard: mixer.clipAction(guardClip),
      walk: mixer.clipAction(walkClip),
      run: mixer.clipAction(runClip),
      current: mixer.clipAction(guardClip),
    };

    const play = (name: AnimationName) => {
      const next = this.animation.actions[name];

      const prev = this.animation.actions.current;

      /**
       * We reset the previous animation before playing the new one
       * and we cross fade to smoothly transition between animations
       * @see https://threejs.org/docs/#api/en/core/AnimationAction
       */
      next.reset().play().crossFadeFrom(prev, 1);

      this.animation.actions.current = next;
    };

    this.animation = { mixer, actions, play };
    this.animation.actions.current.play();
  };

  private addDebugFolders = () => {
    const registry = new GUIStateRegistry("fox-gui-state", {
      animation: "guard",
    });

    registry.bind("animation", (name) =>
      this.animation.play(name as AnimationName),
    );

    this.guiRegistry = registry;

    const debugFolder = this.debug.gui.addFolder("Fox");

    debugFolder
      .add(registry.state, "animation", [
        "guard",
        "walk",
        "run",
      ] satisfies AnimationName[])
      .name("Animation");
  };

  public update = () => {
    const deltaSeconds = this.time.delta / 1_000;
    this.animation.mixer.update(deltaSeconds);
  };

  public destroy = () => {
    this.guiRegistry?.dispose();
  };
}

export default Fox;
