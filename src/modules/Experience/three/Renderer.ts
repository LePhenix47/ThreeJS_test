import * as THREE from "three";
import Experience, {
  Destroyable,
  Resizable,
  Updatable,
} from "@modules/Experience/Experience";

class Renderer implements Resizable, Updatable, Destroyable {
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

  get rendererPixelRatio(): number {
    return this.instance.getPixelRatio();
  }

  constructor() {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }

    this.experience = Experience.instance;

    this.instance = this.initRenderer();
    console.log("Renderer instantiated");
  }

  private initRenderer = () => {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.experience.canvas,
    });

    renderer.toneMapping = THREE.CineonToneMapping;
    renderer.toneMappingExposure = 1.75;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.setSize(this.sizes.width, this.sizes.height);

    renderer.setPixelRatio(this.sizes.pixelRatio);

    return renderer;
  };

  public resize = () => {
    this.instance.setSize(this.sizes.width, this.sizes.height);

    this.instance.setPixelRatio(this.sizes.pixelRatio);
  };

  public update = () => {
    this.instance.render(this.scene, this.camera.instance);
  };

  public destroy = () => {
    this.instance.dispose();
  };
}

export default Renderer;
