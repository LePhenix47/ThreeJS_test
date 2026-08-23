import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { GltfEntity } from "../../types/entity";
import { ShadingEntityParams } from "./ShadingGroup";
import { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three";

class ShadingSuzanne extends GltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private readonly group: THREE.Group;
  protected model: THREE.Group;
  private readonly material: THREE.ShaderMaterial;

  private get resources() {
    return this.experience!.resources;
  }

  constructor({ material, group }: ShadingEntityParams) {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = group;
    this.material = material;
    this.setModel();
    this.group.add(this.model);
  }

  protected setModel(): void {
    const gltf: GLTF = this.resources.getGltf("suzanne");

    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.material = this.material;
    });

    this.model = gltf.scene;
  }

  public setRotation(x: number, y: number): void {
    this.model.rotation.x = x;
    this.model.rotation.y = y;
  }

  public update(): void {}

  public destroy(): void {
    // ? material is owned + disposed by ShadingGroup, not this entity
    this.destroyModel(false);
    this.group.remove(this.model);
  }
}

export default ShadingSuzanne;
