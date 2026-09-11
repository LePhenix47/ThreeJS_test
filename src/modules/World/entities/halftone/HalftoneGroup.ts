import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import GUIStateRegistry from "@utils/classes/gui-state-registry";
import * as THREE from "three";

import vertexShader from "@shaders/halftone/vertex.glsl";
import fragmentShader from "@shaders/halftone/fragment.glsl";

import HalftoneTorus from "./HalftoneTorus";
import HalftoneSphere from "./HalftoneSphere";
import HalftoneSuzanne from "./HalftoneSuzanne";
import {
  MapAsUniforms,
  TypedShaderMaterial,
} from "@modules/World/types/uniforms";
import { Controller } from "lil-gui";
import gsap from "gsap";

export type HalftoneEntityParams = {
  material: THREE.ShaderMaterial;
  group: THREE.Group;
};

type HalftoneGroupState = {
  color: string;
  positionY: number;
  toggleMiddleY: boolean;
};

type HalftoneUniforms = MapAsUniforms<{
  uTime: number;
  uColor: THREE.Color;
}>;

class HalftoneGroup implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private material: TypedShaderMaterial<HalftoneUniforms>;
  public group: THREE.Group;
  private torus: HalftoneTorus;
  private sphere: HalftoneSphere;
  private suzanne?: HalftoneSuzanne;

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

  private readonly debugDefaults: HalftoneGroupState = {
    color: "#ff794d",
    positionY: 0,
    toggleMiddleY: false,
  };

  private guiRegistry: GUIStateRegistry<HalftoneGroupState> | null = null;

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setMaterial();

    const { material, group } = this;
    this.torus = new HalftoneTorus({ material, group });
    this.sphere = new HalftoneSphere({ material, group });

    this.resources.on("textures-loaded", () => {
      this.suzanne = new HalftoneSuzanne({ material, group });
    });

    // this.setPosition();
    this.setPositionY();

    if (this.debug?.isActive) this.addDebugFolders();

    console.log("HalftoneGroup");
  }

  private setPositionY(): void {
    const { positionY } = this.debugDefaults;

    this.group.position.y = positionY;
  }

  private get3DBoundingRect(): {
    width: number;
    height: number;
    depth: number;
  } {
    // * ThreeJS equivalent of getBoundingClientRect
    const box = new THREE.Box3().setFromObject(this.group);

    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;
    const depth = box.max.z - box.min.z;

    return {
      width,
      height,
      depth,
    };
  }

  private setMaterial = (): void => {
    const uniforms: HalftoneUniforms = {
      uTime: new THREE.Uniform(0),
      uColor: {
        value: new THREE.Color(),
      },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      // side: THREE.DoubleSide,
      // transparent: true,
      // depthWrite: false,
      // blending: THREE.AdditiveBlending,
    }) as TypedShaderMaterial<HalftoneUniforms>;
  };

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<HalftoneGroupState>(
      "Halftone-group",
      this.debugDefaults,
    );
    this.guiRegistry = registry;
    const { state } = registry;
    const { gui } = this.debug!;

    const folder = gui.addFolder("Halftone Group");

    folder.addColor(state, "color").name("Color");
    // * On value
    registry.bind("color", (v) => {
      this.material.uniforms.uColor.value.set(v);
    });

    const groupYPositionController: Controller = folder
      .add(state, "positionY")
      .name("Y position")
      .min(-5)
      .max(5)
      .step(0.1);
    registry.bind("positionY", (v) => {
      this.group.position.y = v;
    });

    folder.add(state, "toggleMiddleY").name("Toggle Middle Y pos");
    registry.bind("toggleMiddleY", (v) => {
      groupYPositionController.disable(v);

      let newYPosition: number = state.positionY;
      if (v) {
        const computedHeight = this.get3DBoundingRect().height;
        newYPosition = computedHeight / 2;
      }

      gsap.to(this.group.position, {
        y: newYPosition,
      });
    });
  }

  public update(): void {
    const time = this.time.elapsedSeconds;
    this.material.uniforms.uTime.value = time;

    const rotX = -time * 0.1;
    const rotY = time * 0.2;
    this.torus.setRotation(rotX, rotY);
    this.sphere.setRotation(rotX, rotY);
    this.suzanne?.setRotation(rotX, rotY);
  }

  public destroy(): void {
    this.torus.destroy();
    this.sphere.destroy();
    this.suzanne?.destroy();
    this.material.dispose();
    this.scene.remove(this.group);
    this.guiRegistry?.dispose();
  }
}

export default HalftoneGroup;
