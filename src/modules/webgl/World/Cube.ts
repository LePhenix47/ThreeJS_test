import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import { MeshEntity } from "./types/mesh-entity";

class Cube extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    size: 2,
    position: { x: -5, y: 0, z: 0 },
  } as const;

  private readonly experience: Experience;

  protected geometry: THREE.BoxGeometry;
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

    console.log("Cube");
  }

  protected setGeometry(): void {
    const { size } = Cube.CONFIG;
    this.geometry = new THREE.BoxGeometry(size, size, size);
  }

  protected setMaterial(): void {
    this.material = new THREE.MeshStandardMaterial();
  }

  protected setMesh(): void {
    const { position } = Cube.CONFIG;

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(position.x, position.y, position.z);
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}

export default Cube;
