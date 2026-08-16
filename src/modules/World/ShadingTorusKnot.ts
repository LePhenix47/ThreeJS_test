import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { MeshEntity } from "./types/entity";
import { ShadingEntityParams } from "./ShadingGroup";
import * as THREE from "three";

class ShadingTorusKnot extends MeshEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private readonly group: THREE.Group;
  protected geometry: THREE.TorusKnotGeometry;
  protected material: THREE.ShaderMaterial;
  protected mesh: THREE.Mesh;

  constructor({ material, group }: ShadingEntityParams) {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = group;
    this.material = material;
    this.setGeometry();
    this.setMesh();

    this.group.add(this.mesh);
  }

  protected setGeometry = (): void => {
    this.geometry = new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32);
  };

  protected setMaterial = (): void => {
    // ? Material provided externally by ShadingGroup — shared across all shading entities
  };

  protected setMesh = (): void => {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.x = 3;

    this.mesh = mesh;
  };

  public setRotation = (x: number, y: number): void => {
    this.mesh.rotation.x = x;
    this.mesh.rotation.y = y;
  };

  public update = (): void => {};

  public destroy = (): void => {
    this.geometry.dispose();
    this.group.remove(this.mesh);
  };
}

export default ShadingTorusKnot;
