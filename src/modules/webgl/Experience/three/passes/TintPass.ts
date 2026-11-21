import { ShaderPass } from "three/examples/jsm/Addons.js";
import vertexShader from "@shaders/post-processing/tint/vertex.glsl";
import fragmentShader from "@shaders/post-processing/tint/fragment.glsl";
import {
  MapAsUniforms,
  TypedCustomShaderPass,
} from "@modules/webgl/World/types/uniforms";
import Experience from "@modules/webgl/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import * as THREE from "three";

type TintUniforms = MapAsUniforms<{
  tDiffuse: THREE.Texture;
  uTint: THREE.Vector3;
}>;

type TintPassState = {
  enabled: boolean;
  tintR: number;
  tintG: number;
  tintB: number;
};

class TintPass extends ShaderPass {
  public static readonly CONFIG = {
    guiKey: "tint-pass-gui-state",
  } as const;

  private static readonly DEBUG_DEFAULTS: TintPassState = {
    enabled: false,
    tintR: -0.1,
    tintG: 0,
    tintB: 0,
  };

  private readonly experience: Experience;
  private guiRegistry: GUIStateRegistry<TintPassState> | null = null;

  private get debug() {
    return this.experience.debug;
  }

  // ? Static: needs to exist before `super()` runs, so it can't read `this`
  // ? A method, not a static property: this object becomes the live `this.uniforms`, so a
  // ? shared static object would leak the same uTint reference across every instance of this pass
  private static createShader(): TypedCustomShaderPass<TintUniforms> {
    return {
      uniforms: {
        tDiffuse: {
          value: new THREE.Texture(),
        },
        uTint: {
          value: new THREE.Vector3(),
        },
      },
      vertexShader,
      fragmentShader,
    };
  }

  constructor() {
    super(TintPass.createShader());

    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    const { tintR, tintG, tintB, enabled } = TintPass.DEBUG_DEFAULTS;
    this.uniforms.uTint.value.set(tintR, tintG, tintB);
    this.enabled = enabled;

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }
  }

  private applyTint = (): void => {
    const { tintR, tintG, tintB } =
      this.guiRegistry?.state || TintPass.DEBUG_DEFAULTS;

    this.uniforms.uTint.value.set(tintR, tintG, tintB);
  };

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

    tintFolder.add(state, "tintR").min(-1).max(1).step(0.001).name("Tint R");
    registry.bind("tintR", this.applyTint);

    tintFolder.add(state, "tintG").min(-1).max(1).step(0.001).name("Tint G");
    registry.bind("tintG", this.applyTint);

    tintFolder.add(state, "tintB").min(-1).max(1).step(0.001).name("Tint B");
    registry.bind("tintB", this.applyTint);
  }

  public dispose(): void {
    super.dispose();
    this.guiRegistry?.dispose();
  }
}

export default TintPass;
