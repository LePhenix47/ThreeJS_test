import Experience from "../Experience/Experience";
import * as THREE from "three";

class Floor {
  private readonly experience: Experience | null;
  private geometry: THREE.BufferGeometry;
  private material: THREE.Material;
  private textures: {
    color: THREE.Texture;
    normal: THREE.Texture;
  };

  private mesh: THREE.Mesh;

  private get scene() {
    return this.experience!.scene;
  }

  private get resources() {
    return this.experience!.resources;
  }
  constructor() {
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

  public setGeometry = () => {
    //
    this.geometry = new THREE.CircleGeometry(5, 64);
  };

  public setMaterial = () => {
    this.material = new THREE.MeshStandardMaterial({
      map: this.textures.color,
      normalMap: this.textures.normal,
    });
  };

  public setTextures = () => {};

  public setMesh = () => {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(-90);

    this.mesh.receiveShadow = true;
  };
}

export default Floor;
