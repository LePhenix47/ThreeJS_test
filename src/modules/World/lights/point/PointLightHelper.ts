import Experience, { Destroyable } from "@modules/Experience/Experience";
import { MeshEntity } from "@modules/World/types/entity";
import * as THREE from "three";

/** Small icosahedron placed at a point light's position. A visual stand-in for a real THREE.PointLightHelper since this scene has no real THREE.Light. Multiple instances may exist at once, each with its own position and color. */
class PointLightHelper extends MeshEntity implements Destroyable {
  static readonly CONFIG = {
    radius: 0.1,
    detail: 2,
  };

  private readonly experience: Experience | null;
  protected geometry: THREE.IcosahedronGeometry;
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
    this.geometry = new THREE.IcosahedronGeometry(
      PointLightHelper.CONFIG.radius,
      PointLightHelper.CONFIG.detail,
    );
  }

  protected setMaterial(): void {
    this.material = new THREE.MeshBasicMaterial();
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
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

export default PointLightHelper;
