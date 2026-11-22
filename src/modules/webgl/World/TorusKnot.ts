import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import * as THREE from "three";
import { MeshEntity } from "./types/mesh-entity";

class TorusKnot extends MeshEntity implements Updatable, Destroyable {
  public static readonly CONFIG = {
    radius: 1,
    tube: 0.4,
    tubularSegments: 128,
    radialSegments: 32,
    rotationSpeed: 0.1,
  } as const;

  private readonly experience: Experience;

  protected geometry: THREE.TorusKnotGeometry;
  protected material: THREE.MeshStandardMaterial;
  protected mesh: THREE.Mesh;

  private get scene() {
    return this.experience.scene;
  }

  private get time() {
    return this.experience.time;
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

    console.log("TorusKnot");
  }

  protected setGeometry(): void {
    const { radius, tube, tubularSegments, radialSegments } = TorusKnot.CONFIG;

    this.geometry = new THREE.TorusKnotGeometry(
      radius,
      tube,
      tubularSegments,
      radialSegments,
    );
  }

  protected setMaterial(): void {
    this.material = new THREE.MeshStandardMaterial();
  }

  protected setMesh(): void {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
  }

  public update(): void {
    const { rotationSpeed } = TorusKnot.CONFIG;
    this.mesh.rotation.y = this.time.elapsedSeconds * rotationSpeed;
  }

  public destroy(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}

export default TorusKnot;
