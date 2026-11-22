import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import { MeshEntity } from "./types/mesh-entity";

class Sphere extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    radius: 1,
    widthSegments: 32,
    heightSegments: 32,
    position: { x: 5, y: 0, z: 0 },
  } as const;

  private readonly experience: Experience;

  protected geometry: THREE.SphereGeometry;
  protected material: THREE.MeshStandardMaterial;
  protected mesh: THREE.Mesh;

  private get scene() {
    return this.experience.scene;
  }

  constructor() {
    super();

    if (!Experience.instance) {
      throw new Error("Experience instance not found");
    }
    this.experience = Experience.instance;

    this.setGeometry();
    this.setMaterial();
    this.setMesh();

    this.scene.add(this.mesh);

    console.log("Sphere");
  }

  protected setGeometry(): void {
    const { radius, widthSegments, heightSegments } = Sphere.CONFIG;
    this.geometry = new THREE.SphereGeometry(
      radius,
      widthSegments,
      heightSegments,
    );
  }

  protected setMaterial(): void {
    this.material = new THREE.MeshStandardMaterial();
  }

  protected setMesh(): void {
    const { position } = Sphere.CONFIG;

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.mesh.position.set(position.x, position.y, position.z);
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}

export default Sphere;
