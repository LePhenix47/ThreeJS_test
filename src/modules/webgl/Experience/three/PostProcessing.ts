import {
  EffectComposer,
  RenderPass,
  DotScreenPass,
  GlitchPass,
  ShaderPass,
  RGBShiftShader,
  GammaCorrectionShader,
} from "three/examples/jsm/Addons.js";

import Experience, {
  Destroyable,
  Resizable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import * as THREE from "three";

class PostProcessing implements Resizable, Updatable, Destroyable {
  public instance: EffectComposer;
  private readonly experience: Experience;

  public readonly renderTarget: THREE.WebGLRenderTarget;

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

    // *  For anti-aliasing on the passes
    const samplesValue: number = this.renderer.pixelRatio === 1 ? 2 : 0;

    this.renderTarget = new THREE.WebGLRenderTarget(800, 600, {
      samples: samplesValue, // ? We don't need anti-aliasing on high pixel-ratio screens
    });

    this.setComposer();
    this.setPasses();

    console.log("PostProcessing instantiated");
  }

  private setComposer(): void {
    const composer = new EffectComposer(
      this.renderer.instance,
      this.renderTarget,
    );

    const { width, height } = this.sizes;
    composer.setSize(width, height);
    composer.setPixelRatio(this.sizes.pixelRatio);

    this.instance = composer;
  }

  private setPasses(): void {
    const renderPass = new RenderPass(this.scene, this.camera.instance);
    this.instance.addPass(renderPass);

    const dotScreenPass = new DotScreenPass();
    dotScreenPass.enabled = false;
    this.instance.addPass(dotScreenPass);

    const glitchPass = new GlitchPass();
    glitchPass.enabled = true;
    glitchPass.goWild = false;
    this.instance.addPass(glitchPass);

    const shaderPass = new ShaderPass(RGBShiftShader);
    shaderPass.enabled = false;
    this.instance.addPass(shaderPass);

    // * This one is important to use the SRGBColorSpace as the output color space, MUST be added as the LAST pass
    const gammaFixShaderPass = new ShaderPass(GammaCorrectionShader);
    gammaFixShaderPass.enabled = true;
    this.instance.addPass(gammaFixShaderPass);
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
