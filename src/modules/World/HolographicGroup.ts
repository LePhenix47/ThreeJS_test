import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import * as THREE from "three";

type HolographicGroupState = {
  color: string;
  textVisible: boolean;
};

import vertexShader from "@shaders/holographic/vertex.glsl";
import fragmentShader from "@shaders/holographic/fragment.glsl";

import HolographicTorus from "./HolographicTorus";
import HolographicSphere from "./HolographicSphere";
import HolographicSuzanne from "./HolographicSuzanne";

export type HolographicEntityParams = {
  material: THREE.ShaderMaterial;
  group: THREE.Group;
};

class HolographicGroup implements Updatable, Destroyable {
  private readonly experience: Experience | null;

  private material: THREE.ShaderMaterial;

  public group: THREE.Group;

  private torus: HolographicTorus;
  private sphere: HolographicSphere;
  private suzanne?: HolographicSuzanne;

  private textOverlay: HTMLParagraphElement;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  private get debug() {
    return this.experience!.debug;
  }

  private readonly debugDefaults: HolographicGroupState = {
    color: "#3c6ff7",
    textVisible: false,
  };

  private guiRegistry: GUIStateRegistry<HolographicGroupState> | null = null;

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setMaterial();

    const { material, group } = this;
    this.torus = new HolographicTorus({ material, group });
    this.sphere = new HolographicSphere({ material, group });

    this.resources.on("textures-loaded", () => {
      this.suzanne = new HolographicSuzanne({ material, group });
    });

    this.setPosition();

    this.setTextOverlay();

    if (this.debug?.isActive) this.addDebugFolders();

    console.log("HolographicGroup");
  }

  private setPosition = (): void => {
    // * ThreeJS equivalent of getBoundingClientRect
    const box = new THREE.Box3().setFromObject(this.group);

    const height = box.max.y - box.min.y;

    this.group.position.y = height * 0.5;
  };

  private setMaterial = (): void => {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: new THREE.Uniform(0),
        uColor: {
          value: new THREE.Color(this.debugDefaults.color),
        },
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  };

  private setTextOverlay = () => {
    const parent = this.experience!.canvas.parentElement;

    const textOverlay = parent?.querySelector<HTMLParagraphElement>(
      `[data-element="text-overlay"]`,
    )!;

    this.textOverlay = textOverlay;
  };

  private addDebugFolders = (): void => {
    const registry = new GUIStateRegistry<HolographicGroupState>(
      "holographic-group",
      this.debugDefaults,
    );
    this.guiRegistry = registry;
    const { state } = registry;
    const { gui } = this.debug!;

    const folder = gui.addFolder("Holographic Group");

    folder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => {
      this.material.uniforms.uColor.value.set(v);
      this.textOverlay.style.setProperty("--_chosen-color", v);
    });

    folder.add(state, "textVisible").name("Show text");
    registry.bind("textVisible", (v) => {
      this.textOverlay.style.setProperty("--_opacity", `${v ? 1 : 0}`);
    });
  };

  public update = (): void => {
    const time = this.time.elapsedSeconds;
    this.material.uniforms.uTime.value = time;

    const rotX = -time * 0.1;
    const rotY = time * 0.2;
    this.torus.setRotation(rotX, rotY);
    this.sphere.setRotation(rotX, rotY);
    this.suzanne?.setRotation(rotX, rotY);
  };

  public destroy = (): void => {
    this.torus.destroy();
    this.sphere.destroy();
    this.suzanne?.destroy();
    this.material.dispose();
    this.scene.remove(this.group);
    this.guiRegistry?.dispose();
  };
}

export default HolographicGroup;
