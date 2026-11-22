import Experience, { Destroyable } from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import { MeshEntity } from "./types/mesh-entity";

/** Small floor scoped to the performance-tips lesson scene, separate from the project's own global `Floor`. */
class PerformanceFloor extends MeshEntity implements Destroyable {
  public static readonly CONFIG = {
    width: 10,
    height: 10,
    position: { x: 0, y: -2, z: 0 },
  } as const;

  private readonly experience: Experience;

  protected geometry: THREE.PlaneGeometry;
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

    console.log("PerformanceFloor");
  }

  protected setGeometry(): void {
    const { width, height } = PerformanceFloor.CONFIG;
    this.geometry = new THREE.PlaneGeometry(width, height);
  }

  protected setMaterial(): void {
    this.material = new THREE.MeshStandardMaterial();
  }

  protected setMesh(): void {
    const { position } = PerformanceFloor.CONFIG;

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.rotation.x = -Math.PI * 0.5;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}

export default PerformanceFloor;
