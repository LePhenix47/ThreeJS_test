import Experience, { Destroyable } from "@modules/Experience/Experience";
import { MeshEntity } from "./types/entity";
import * as THREE from "three";

/** Small plane placed at the directional light's position, facing the origin — a visual stand-in for a real THREE.DirectionalLightHelper since this scene has no real THREE.Light. */
class DirectionalLightHelper extends MeshEntity implements Destroyable {
  private readonly experience: Experience | null;
  protected geometry: THREE.PlaneGeometry;
  protected material: THREE.MeshBasicMaterial;
  protected mesh: THREE.Mesh;

  private get scene() {
    return this.experience!.scene;
  }

  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);
  }

  protected setGeometry(): void {
    this.geometry = new THREE.PlaneGeometry(0.5, 0.5);
  }

  protected setMaterial(): void {
    this.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.mesh.lookAt(0, 0, 3);
  }

  public setColor(color: string): void {
    this.material.color.set(color);
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}

export default DirectionalLightHelper;
