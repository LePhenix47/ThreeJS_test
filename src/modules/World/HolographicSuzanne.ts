import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { GltfEntity } from "./types/entity";
import { HolographicEntityParams } from "./HolographicGroup";
import { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three";

class HolographicSuzanne extends GltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private readonly group: THREE.Group;
  protected model: THREE.Group;
  private readonly material: THREE.ShaderMaterial;

  private get resources() {
    return this.experience!.resources;
  }

  private get time() {
    return this.experience!.time;
  }

  constructor({ material, group }: HolographicEntityParams) {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = group;
    this.material = material;
    this.setModel();
    this.group.add(this.model);
  }

  protected setModel = (): void => {
    const gltf: GLTF = this.resources.getGltf("suzanne");

    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.material = this.material;
    });

    this.model = gltf.scene;
  };

  public update = (): void => {
    this.model.rotation.x = -this.time.elapsedSeconds * 0.1;
    this.model.rotation.y = this.time.elapsedSeconds * 0.2;
  };

  public destroy = (): void => {
    this.destroyModel();
    this.group.remove(this.model);
  };
}

export default HolographicSuzanne;
