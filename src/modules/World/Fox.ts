import { GLTF } from "three/examples/jsm/Addons.js";
import Experience, { Destroyable, Updatable } from "../Experience/Experience";
import * as THREE from "three";

class Fox implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private model: GLTF["scene"];
  private animationClips: { [key: string]: THREE.AnimationClip };
  private mixer: THREE.AnimationMixer;
  private currentAnimation: THREE.AnimationAction;

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
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.initGltfModel();

    this.scene.add(this.model);

    this.castModelShadows();

    this.setAnimations();

    if (this.debug.isActive) {
      this.addDebugFolders();
    }

    console.log("Fox");
  }

  private addDebugFolders = () => {
    const debugFolder = this.debug.gui.addFolder("Fox");
  };

  private initGltfModel = () => {
    const foxGltf: GLTF = this.resources.getGltf("fox");

    const fox = foxGltf.scene;
    fox.scale.setScalar(0.02);

    this.model = fox;
    this.animationClips = {
      guardAnimation: foxGltf.animations[0],
      walkAnimation: foxGltf.animations[1],
      runAnimation: foxGltf.animations[2],
    }; // ? ≠ foxGltf.scene.animations ⚠
  };

  private castModelShadows = () => {
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = true;
    });
  };

  private setAnimations = () => {
    const mixer = new THREE.AnimationMixer(this.model);
    mixer.stopAllAction();

    const { guardAnimation, walkAnimation, runAnimation } = this.animationClips;

    const action: THREE.AnimationAction = mixer.clipAction(guardAnimation);

    this.mixer = mixer;

    this.currentAnimation = action;
    this.currentAnimation.play();
  };

  public update = () => {
    const deltaTimeSeconds: number = this.time.delta / 1_000;

    this.mixer.update(deltaTimeSeconds);
  };

  public destroy = () => {};
}

export default Fox;
