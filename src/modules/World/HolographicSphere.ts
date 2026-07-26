import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { MeshEntity } from "./types/entity";
import { HolographicEntityParams } from "./HolographicGroup";
import * as THREE from "three";

class HolographicSphere extends MeshEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  private readonly group: THREE.Group;
  protected geometry: THREE.SphereGeometry;
  protected material: THREE.ShaderMaterial;
  protected mesh: THREE.Mesh;

  private get time() {
    return this.experience!.time;
  }

  constructor({ material, group }: HolographicEntityParams) {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = group;
    this.material = material;
    this.setGeometry();
    this.setMesh();
    this.mesh.position.x = -3;
    this.group.add(this.mesh);
  }

  protected setGeometry = (): void => {
    this.geometry = new THREE.SphereGeometry();
  };

  protected setMaterial = (): void => {
    // Material provided externally by HolographicGroup
  };

  protected setMesh = (): void => {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  };

  public update = (): void => {
    this.mesh.rotation.x = -this.time.elapsedSeconds * 0.1;
    this.mesh.rotation.y = this.time.elapsedSeconds * 0.2;
  };

  public destroy = (): void => {
    this.geometry.dispose();
    this.group.remove(this.mesh);
  };
}

export default HolographicSphere;
