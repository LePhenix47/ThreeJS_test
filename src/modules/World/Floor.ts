import Experience from "../Experience/Experience";
import * as THREE from "three";
import { TexturedMeshEntity, EntityTexture } from "./types/entity";

class Floor extends TexturedMeshEntity {
  private readonly experience: Experience | null;
  protected geometry: THREE.BufferGeometry;
  protected material: THREE.Material;
  protected textures: Pick<EntityTexture, "color" | "normal">;
  protected mesh: THREE.Mesh;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }
  constructor() {
    super();
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.initFloor();

    this.scene.add(this.mesh);
    console.log("Floor");
  }

  private initFloor = () => {
    // * ⚠ ORDER MATTERS HERE
    this.setTextures();

    this.setGeometry();
    this.setMaterial();
    this.setMesh();
  };

  protected setGeometry = () => {
    //
    this.geometry = new THREE.CircleGeometry(5, 64);
  };

  protected setMaterial = () => {
    this.material = new THREE.MeshStandardMaterial({
      map: this.textures.color,
      normalMap: this.textures.normal,
    });
  };

  protected setTextures = () => {
    const color = this.resources.getTexture("floorTextures", "color");

    color.repeat.set(1.5, 1.5);
    color.wrapS = THREE.RepeatWrapping;
    color.wrapT = THREE.RepeatWrapping;
    color.colorSpace = THREE.SRGBColorSpace;

    const normal = this.resources.getTexture("floorTextures", "normal");

    normal.repeat.set(1.5, 1.5);
    normal.wrapS = THREE.RepeatWrapping;
    normal.wrapT = THREE.RepeatWrapping;

    this.textures = {
      color,
      normal,
    };

    console.log(this.textures);
  };

  protected setMesh = () => {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(-90);

    this.mesh.receiveShadow = true;
  };
}

export default Floor;
