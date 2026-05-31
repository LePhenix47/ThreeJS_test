import { GLTF } from "three/examples/jsm/Addons.js";
import Experience, { Destroyable, Updatable } from "../Experience/Experience";
import * as THREE from "three";

type AnimationBuilders = {
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
};

class Fox implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private model: GLTF["scene"];
  private animationClips: THREE.AnimationClip[];
  private animationBuilders: AnimationBuilders;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.initGltfModel();

    this.scene.add(this.model);

    this.castModelShadows();

    this.setAnimations();

    console.log("Fox");
  }

  private initGltfModel = () => {
    const foxGltf: GLTF = this.resources.getGltf("fox");

    const fox = foxGltf.scene;
    fox.scale.setScalar(0.02);

    this.model = fox;
    this.animationClips = foxGltf.animations; // ? ≠ foxGltf.scene.animations ⚠
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

    const [guardAnimation, walkAnimation, runAnimation] = this.animationClips;

    const action: THREE.AnimationAction = mixer.clipAction(guardAnimation);

    this.animationBuilders = {
      mixer,
      action,
    };

    this.animationBuilders.action.play();
  };

  public update = () => {
    const deltaTimeSeconds: number = this.time.delta / 1_000;

    this.animationBuilders.mixer.update(deltaTimeSeconds);
  };

  public destroy = () => {};
}

export default Fox;
