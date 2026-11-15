import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/Addons.js";
import Experience from "@modules/webgl/Experience/Experience";
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

type BloomPassState = {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
};

class BloomPass extends UnrealBloomPass {
  public static readonly CONFIG = {
    guiKey: "bloom-pass-gui-state",
  } as const;

  private static readonly DEBUG_DEFAULTS: BloomPassState = {
    enabled: false,
    strength: 0.8,
    radius: 0.5,
    threshold: 0.4,
  };

  private readonly experience: Experience;
  private guiRegistry: GUIStateRegistry<BloomPassState> | null = null;

  private get debug() {
    return this.experience.debug;
  }

  constructor() {
    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }

    const { strength, radius, threshold } = BloomPass.DEBUG_DEFAULTS;
    const { x, y } = Experience.instance.sizes.resolution;

    // ? Passed here (not copied after super()) since UnrealBloomPass sizes its render targets off this param immediately
    super(new THREE.Vector2(x, y), strength, radius, threshold);

    this.experience = Experience.instance;
    this.enabled = BloomPass.DEBUG_DEFAULTS.enabled;

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }
  }

  private addDebugFolders(): void {
    const { guiKey } = BloomPass.CONFIG;
    const registry = new GUIStateRegistry<BloomPassState>(
      guiKey,
      BloomPass.DEBUG_DEFAULTS,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const bloomFolder = gui.addFolder("Bloom");

    bloomFolder.add(state, "enabled").name("Enabled");
    registry.bind("enabled", (v) => {
      this.enabled = v;
    });

    bloomFolder.add(state, "strength").min(0).max(3).step(0.01);
    registry.bind("strength", (v) => {
      this.strength = v;
    });

    bloomFolder.add(state, "radius").min(0).max(2).step(0.01);
    registry.bind("radius", (v) => {
      this.radius = v;
    });

    bloomFolder.add(state, "threshold").min(0).max(1).step(0.01);
    registry.bind("threshold", (v) => {
      this.threshold = v;
    });
  }

  public dispose(): void {
    super.dispose();
    this.guiRegistry?.dispose();
  }
}

export default BloomPass;
