import { ShaderPass } from "three/examples/jsm/Addons.js";
import tintShader from "@modules/webgl/Experience/sources/post-processing/tint";
import Experience from "@modules/webgl/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type TintPassState = {
  enabled: boolean;
  tintX: number;
  tintY: number;
  tintZ: number;
};

class TintPass extends ShaderPass {
  public static readonly CONFIG = {
    guiKey: "tint-pass-gui-state",
  } as const;

  private static readonly DEBUG_DEFAULTS: TintPassState = {
    enabled: false,
    tintX: -0.1,
    tintY: 0,
    tintZ: 0,
  };

  private readonly experience: Experience;
  private guiRegistry: GUIStateRegistry<TintPassState> | null = null;

  private get debug() {
    return this.experience.debug;
  }

  constructor() {
    super(tintShader);

    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    const { tintX, tintY, tintZ, enabled } = TintPass.DEBUG_DEFAULTS;
    this.uniforms.uTint.value.set(tintX, tintY, tintZ);
    this.enabled = enabled;

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }
  }

  private addDebugFolders(): void {
    const { guiKey } = TintPass.CONFIG;
    const registry = new GUIStateRegistry<TintPassState>(
      guiKey,
      TintPass.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const tintFolder = gui.addFolder("Tint");

    tintFolder.add(state, "enabled").name("Enabled");
    registry.bind("enabled", (v) => {
      this.enabled = v;
    });

    tintFolder.add(state, "tintX").min(-1).max(1).step(0.001).name("Tint X");
    registry.bind("tintX", (v) => {
      this.uniforms.uTint.value.x = v;
    });

    tintFolder.add(state, "tintY").min(-1).max(1).step(0.001).name("Tint Y");
    registry.bind("tintY", (v) => {
      this.uniforms.uTint.value.y = v;
    });

    tintFolder.add(state, "tintZ").min(-1).max(1).step(0.001).name("Tint Z");
    registry.bind("tintZ", (v) => {
      this.uniforms.uTint.value.z = v;
    });
  }

  public dispose(): void {
    super.dispose();
    this.guiRegistry?.dispose();
  }
}

export default TintPass;
