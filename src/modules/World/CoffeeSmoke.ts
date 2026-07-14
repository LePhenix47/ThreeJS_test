import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { GltfEntity } from "./types/entity";
import { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three";

class CoffeeSmoke extends GltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected model: THREE.Group;

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

    console.log("CoffeeSmoke");
  }

  protected setModel = (): void => {
    const gltf: GLTF = this.resources.getGltf("coffee-smoke");

    const bakedMesh = gltf.scene.getObjectByName("baked");

    if (!(bakedMesh instanceof THREE.Mesh))
      throw new Error("CoffeeSmoke: expected Mesh named 'baked'");

    if (
      bakedMesh.material instanceof THREE.MeshStandardMaterial &&
      bakedMesh.material.map
    ) {
      bakedMesh.material.map.anisotropy = 8;
    }

    this.model = gltf.scene;
  };

  update = (): void => {};

  destroy = (): void => {
    this.destroyModel();
    this.scene.remove(this.model);
  };
}

export default CoffeeSmoke;
