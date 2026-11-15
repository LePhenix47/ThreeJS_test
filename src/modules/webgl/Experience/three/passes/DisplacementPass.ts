import { ShaderPass } from "three/examples/jsm/Addons.js";
import displacementShader from "@modules/webgl/Experience/sources/post-processing/displacement";
import Experience, { Updatable } from "@modules/webgl/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type DisplacementPassState = {
  enabled: boolean;
};

class DisplacementPass extends ShaderPass implements Updatable {
  public static readonly CONFIG = {
    guiKey: "displacement-pass-gui-state",
  } as const;

  private static readonly DEBUG_DEFAULTS: DisplacementPassState = {
    enabled: false,
  };

  private readonly experience: Experience;
  private guiRegistry: GUIStateRegistry<DisplacementPassState> | null = null;

  private get globalUniforms() {
    return this.experience.globalUniforms.uniforms;
  }

  private get debug() {
    return this.experience.debug;
  }

  constructor() {
    super(displacementShader);

    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.enabled = DisplacementPass.DEBUG_DEFAULTS.enabled;

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }
  }

  public update(): void {
    this.uniforms.uTime.value = this.globalUniforms.uTime.value;
  }

  private addDebugFolders(): void {
    const { guiKey } = DisplacementPass.CONFIG;
    const registry = new GUIStateRegistry<DisplacementPassState>(
      guiKey,
      DisplacementPass.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const displacementFolder = gui.addFolder("Displacement");

    displacementFolder.add(state, "enabled").name("Enabled");
    registry.bind("enabled", (v) => {
      this.enabled = v;
    });
  }

  public dispose(): void {
    super.dispose();
    this.guiRegistry?.dispose();
  }
}

export default DisplacementPass;
