import * as THREE from "three";
import Experience from "@modules/webgl/Experience/Experience";
import { GltfEntity } from "./types/gltf-entity";
import { WobblyEntityParams } from "./WobblyGroup";

class WobblySuzanne extends GltfEntity {
  private readonly experience: Experience | null;
  private readonly group: THREE.Group;
  /** Provided externally by `WobblyGroup`, shared with `WobblySphere`. */
  private readonly material: THREE.Material;
  /** Shared with `WobblySphere`, see its own doc comment. */
  private readonly depthMaterial: THREE.Material;

  protected model: THREE.Group;

  private get resources() {
    return this.experience!.resources;
  }

  constructor({ material, depthMaterial, group }: WobblyEntityParams) {
    super();

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = group;
    this.material = material;
    this.depthMaterial = depthMaterial;

    this.setModel();

    this.group.add(this.model);
  }

  protected setModel(): void {
    const gltf = this.resources.getGltf("suzanne");

    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = true;
      child.receiveShadow = true;

      child.material = this.material;
      child.customDepthMaterial = this.depthMaterial;
    });

    this.model = gltf.scene;
  }

  public setVisible(visible: boolean): void {
    this.model.visible = visible;
  }

  public destroy(): void {
    this.destroyModel(false);
    this.group.remove(this.model);
  }
}

export default WobblySuzanne;
