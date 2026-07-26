import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import * as THREE from "three";

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

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

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
        uTime: { value: 0 },
      },
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
  };

  public update = (): void => {
    this.material.uniforms.uTime.value = this.time.elapsedSeconds;
    this.torus.update();
    this.sphere.update();
    this.suzanne?.update();
  };

  public destroy = (): void => {
    this.torus.destroy();
    this.sphere.destroy();
    this.suzanne?.destroy();
    this.material.dispose();
    this.scene.remove(this.group);
  };
}

export default HolographicGroup;
