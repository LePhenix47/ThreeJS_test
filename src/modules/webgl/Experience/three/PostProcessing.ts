import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";

import Experience, {
  Destroyable,
  Resizable,
  Updatable,
} from "@modules/webgl/Experience/Experience";

class PostProcessing implements Resizable, Updatable, Destroyable {
  public instance: EffectComposer;
  private readonly experience: Experience;

  private get sizes() {
    return this.experience.sizes;
  }

  private get renderer() {
    return this.experience.renderer;
  }

  private get scene() {
    return this.experience.scene;
  }

  private get camera() {
    return this.experience.camera;
  }

  constructor() {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }

    this.experience = Experience.instance;

    this.setComposer();
    this.setPasses();

    console.log("PostProcessing instantiated");
  }

  private setComposer(): void {
    const composer = new EffectComposer(this.renderer.instance);

    const { width, height } = this.sizes;
    composer.setSize(width, height);
    composer.setPixelRatio(this.sizes.pixelRatio);

    this.instance = composer;
  }

  private setPasses(): void {
    const renderPass = new RenderPass(this.scene, this.camera.instance);
    this.instance.addPass(renderPass);
  }

  public resize(): void {
    const { width, height, pixelRatio } = this.sizes;
    this.instance.setSize(width, height);
    this.instance.setPixelRatio(pixelRatio);
  }

  public update(): void {
    this.instance.render();
  }

  public destroy(): void {
    this.instance.dispose();
  }
}

export default PostProcessing;
