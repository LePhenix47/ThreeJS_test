import * as THREE from "three";
import Experience, {
  Destroyable,
  Resizable,
  Updatable,
} from "@modules/webgl/Experience/Experience";

class Renderer implements Resizable, Updatable, Destroyable {
  public static readonly CONFIG = {
    toneMappingExposure: 1,
    toneMapping: THREE.NoToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    shadowMap: {
      type: THREE.PCFShadowMap,
      autoUpdate: false,
      needsUpdate: true,
    },
  } as const;
  public instance: THREE.WebGLRenderer;
  private readonly experience: Experience;

  private get sizes() {
    return this.experience.sizes;
  }

  private get camera() {
    return this.experience.camera;
  }

  private get scene() {
    return this.experience.scene;
  }

  get pixelRatio(): number {
    return this.instance.getPixelRatio();
  }

  constructor() {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }

    this.experience = Experience.instance;

    this.setRenderer();
    console.log("Renderer instantiated");
  }

  private setRenderer(): void {
    const renderer = new THREE.WebGLRenderer({
      antialias: true, // ? Can be turned off if useless
      canvas: this.experience.canvas,
      powerPreference: "high-performance", // ? Some devices can improve GPU usage & use other more perf. GPUs (if > 1)
    });

    const { toneMapping, toneMappingExposure, outputColorSpace } =
      Renderer.CONFIG;
    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;

    const { type, autoUpdate, needsUpdate } = Renderer.CONFIG.shadowMap;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = type;
    renderer.shadowMap.autoUpdate = autoUpdate; // ? Good for perf at the cost that shadows are now static
    renderer.shadowMap.needsUpdate = needsUpdate;

    const { width, height } = this.sizes;
    renderer.setSize(width, height);
    renderer.setPixelRatio(this.sizes.pixelRatio);

    renderer.outputColorSpace = outputColorSpace;

    this.instance = renderer;
  }

  public resize(): void {
    const { width, height, pixelRatio } = this.sizes;
    this.instance.setSize(width, height);

    this.instance.setPixelRatio(pixelRatio);
  }

  public update(): void {
    this.instance.render(this.scene, this.camera.instance);
  }

  public destroy(): void {
    this.instance.dispose();
  }
}

export default Renderer;
