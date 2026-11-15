import { ShaderPass } from "three/examples/jsm/Addons.js";
import futuristicHudShader from "@modules/webgl/Experience/sources/post-processing/futuristic-hud";
import Experience from "@modules/webgl/Experience/Experience";

class FuturisticHudPass extends ShaderPass {
  private readonly experience: Experience;

  private get resources() {
    return this.experience.resources;
  }

  constructor() {
    super(futuristicHudShader);

    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.resources.on("textures-loaded", () => {
      const { normal } = this.resources.getTextures("interfaceNormalMap");
      this.uniforms.uNormalMap.value = normal;
    });
  }
}

export default FuturisticHudPass;
