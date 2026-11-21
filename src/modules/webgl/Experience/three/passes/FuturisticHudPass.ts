import { ShaderPass } from "three/examples/jsm/Addons.js";
import vertexShader from "@shaders/post-processing/futuristic-hud/vertex.glsl";
import fragmentShader from "@shaders/post-processing/futuristic-hud/fragment.glsl";
import {
  MapAsUniforms,
  TypedCustomShaderPass,
} from "@modules/webgl/World/types/uniforms";
import Experience, { Updatable } from "@modules/webgl/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";
import * as THREE from "three";

type FuturisticHudUniforms = MapAsUniforms<{
  tDiffuse: THREE.Texture;
  uNormalMap: THREE.Texture;
  uNormalMapAspect: number;
  uResolution: THREE.Vector2;
  uViewLightDirection: THREE.Vector3;
}>;

type FuturisticHudPassState = {
  enabled: boolean;
};

class FuturisticHudPass extends ShaderPass implements Updatable {
  public static readonly CONFIG = {
    guiKey: "futuristic-hud-pass-gui-state",
  } as const;

  private static readonly DEBUG_DEFAULTS: FuturisticHudPassState = {
    enabled: true,
  };

  private readonly experience: Experience;
  private guiRegistry: GUIStateRegistry<FuturisticHudPassState> | null = null;

  private get resources() {
    return this.experience.resources;
  }

  private get camera() {
    return this.experience.camera;
  }

  private get environment() {
    return this.experience.world?.environment;
  }

  private get debug() {
    return this.experience.debug;
  }

  // ? Static: needs to exist before `super()` runs, so it can't read `this`
  // ? A method, not a static property: this object becomes the live `this.uniforms`, so a shared
  // ? static object would leak the same uViewLightDirection/uNormalMap refs across every instance
  private static createShader(): TypedCustomShaderPass<FuturisticHudUniforms> {
    return {
      uniforms: {
        tDiffuse: {
          value: new THREE.Texture(),
        },
        uNormalMap: {
          value: new THREE.Texture(),
        },
        uNormalMapAspect: new THREE.Uniform(1),
        uResolution: {
          value: new THREE.Vector2(),
        },
        uViewLightDirection: {
          value: new THREE.Vector3(),
        },
      },
      vertexShader,
      fragmentShader,
    };
  }

  constructor() {
    super(FuturisticHudPass.createShader());

    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.enabled = FuturisticHudPass.DEBUG_DEFAULTS.enabled;
    // ? Aliased to the same Vector2, not copied — always in sync, no need to hook into resize()
    this.uniforms.uResolution = this.experience.globalUniforms.uniforms.uResolution;

    this.resources.on("textures-loaded", () => {
      const { normal } = this.resources.getTextures("interfaceNormalMap");
      this.uniforms.uNormalMap.value = normal;

      // ? Read from the actual loaded asset instead of hardcoding its pixel dimensions in the shader
      const { width, height } = normal.image as HTMLImageElement;
      this.uniforms.uNormalMapAspect.value = width / height;
    });

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }
  }

  // ? Light's world-space direction, re-projected into view space every frame so it reacts to the camera orbiting around the scene
  public update(): void {
    const { environment } = this;
    if (!environment) return;

    // ? Negated: we want "from the light toward the camera" (+Z-ish when facing the light), not "from the camera toward the light"
    // Otherwise facing the light directly puts it dead ahead (-Z), opposite the normal map's "+Z = toward camera" convention
    this.uniforms.uViewLightDirection.value
      .copy(environment.directionalLight.position)
      .negate()
      .transformDirection(this.camera.instance.matrixWorldInverse);
  }

  private addDebugFolders(): void {
    const { guiKey } = FuturisticHudPass.CONFIG;
    const registry = new GUIStateRegistry<FuturisticHudPassState>(
      guiKey,
      FuturisticHudPass.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const hudFolder = gui.addFolder("Futuristic HUD");

    hudFolder.add(state, "enabled").name("Enabled");
    registry.bind("enabled", (v) => {
      this.enabled = v;
    });
  }

  public dispose(): void {
    super.dispose();
    this.guiRegistry?.dispose();
  }
}

export default FuturisticHudPass;
