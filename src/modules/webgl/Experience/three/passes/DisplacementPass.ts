import { ShaderPass } from "three/examples/jsm/Addons.js";
import displacementShader from "@modules/webgl/Experience/sources/post-processing/displacement";
import Experience, { Updatable } from "@modules/webgl/Experience/Experience";

class DisplacementPass extends ShaderPass implements Updatable {
  private readonly experience: Experience;

  private get time() {
    return this.experience.time;
  }

  constructor() {
    super(displacementShader);

    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;
  }

  public update(): void {
    this.uniforms.uTime.value = this.time.elapsedSeconds;
  }
}

export default DisplacementPass;
