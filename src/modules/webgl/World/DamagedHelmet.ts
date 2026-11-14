import * as THREE from "three";
import { GLTF } from "three/examples/jsm/Addons.js";
import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import { GltfEntity } from "./types/gltf-entity";

class DamagedHelmet extends GltfEntity implements Destroyable {
  public static readonly CONFIG = {
    scale: 2,
    rotationYDeg: 90,
  } as const;

  private readonly experience: Experience | null;
  protected model: GLTF["scene"];

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    super();

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setModel();
    this.scene.add(this.model);

    console.log("DamagedHelmet");
  }

  protected setModel(): void {
    const { scene: helmetScene } = this.resources.getGltf("damaged-helmet");

    const { scale, rotationYDeg } = DamagedHelmet.CONFIG;
    helmetScene.scale.set(scale, scale, scale);
    helmetScene.rotation.y = THREE.MathUtils.degToRad(rotationYDeg);

    helmetScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = true;
      child.receiveShadow = true;
    });

    this.model = helmetScene;
  }

  public destroy(): void {
    this.destroyModel();
    this.scene.remove(this.model);
  }
}

export default DamagedHelmet;
