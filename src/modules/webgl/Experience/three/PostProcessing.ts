import {
  EffectComposer,
  RenderPass,
  DotScreenPass,
  GlitchPass,
  ShaderPass,
  RGBShiftShader,
  GammaCorrectionShader,
  UnrealBloomPass,
} from "three/examples/jsm/Addons.js";

import {
  FXAAPass, // ? Performant, but the result is just "ok" and can be blurry
  SMAAPass, // ? Usually better than FXAA but less performant, not to be confused with MSAA
  SSAARenderPass, // ? Best quality but the worst performance
  TAARenderPass, // ? Performant but limited result
} from "three/examples/jsm/Addons.js";

import TintPass from "@modules/webgl/Experience/sources/post-processing/tint";

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
    // ? We don't need anti-aliasing on high pixel-ratio screens, only low ones have it
    const samples: number = this.renderer.pixelRatio === 1 ? 2 : 0;

    this.renderTarget = new THREE.WebGLRenderTarget(800, 600, {
      samples,
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
    glitchPass.enabled = false;
    glitchPass.goWild = false;
    this.instance.addPass(glitchPass);

    const rgbShiftShaderPass = new ShaderPass(RGBShiftShader);
    rgbShiftShaderPass.enabled = false;
    this.instance.addPass(rgbShiftShaderPass);

    const bloomShaderPass = new UnrealBloomPass(
      new THREE.Vector2().copy(this.sizes.resolution),
      0.8,
      0.5,
      0.4,
    );
    bloomShaderPass.enabled = false;
    this.instance.addPass(bloomShaderPass);

    const tintPass = new ShaderPass(TintPass);
    tintPass.enabled = true;
    this.instance.addPass(tintPass);

    // * This one is important to use the SRGBColorSpace as the output color space, MUST be added as the LAST SHADER pass
    const gammaFixShaderPass = new ShaderPass(GammaCorrectionShader);
    gammaFixShaderPass.enabled = true;
    this.instance.addPass(gammaFixShaderPass);

    // * Anti-aliasing FALLBACK in case the WebGLRenderTarget AA fix doesn't work
    if (!this.renderer.supportsRenderTargetAntiAlias) return;
    const smaaPass = new SMAAPass();
    this.instance.addPass(smaaPass);
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
