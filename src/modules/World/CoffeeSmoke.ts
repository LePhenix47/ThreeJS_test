import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import { GltfEntity } from "./types/entity";
import { GLTF } from "three/examples/jsm/Addons.js";
import * as THREE from "three";
import vertexShader from "@shaders/coffee-smoke/vertex.glsl";
import fragmentShader from "@shaders/coffee-smoke/fragment.glsl";

class CoffeeSmoke extends GltfEntity implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  protected model: THREE.Group;
  protected smokeGeometry: THREE.PlaneGeometry;
  protected smokeMaterial: THREE.ShaderMaterial;
  protected smokeMesh: THREE.Mesh;

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

    this.setModel();
    this.scene.add(this.model);

    this.setSmokeGeometry();
    this.setSmokeMaterial();
    this.setSmokeMesh();
    this.scene.add(this.smokeMesh);

    console.log("CoffeeSmoke");
  }

  protected setModel = (): void => {
    const gltf: GLTF = this.resources.getGltf("coffee-smoke");

    const bakedMesh = gltf.scene.getObjectByName("baked");

    if (!(bakedMesh instanceof THREE.Mesh))
      throw new Error("CoffeeSmoke: expected Mesh named 'baked'");

    if (
      bakedMesh.material instanceof THREE.MeshStandardMaterial &&
      bakedMesh.material.map
    ) {
      bakedMesh.material.map.anisotropy = 8;
    }

    this.model = gltf.scene;
  };

  protected setSmokeGeometry = (): void => {
    const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64);

    this.smokeGeometry = smokeGeometry;
  };

  protected setSmokeMaterial = (): void => {
    const smokeMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      vertexShader,
      fragmentShader,
    });

    this.smokeMaterial = smokeMaterial;
  };

  protected setSmokeMesh = (): void => {
    this.smokeMesh = new THREE.Mesh(this.smokeGeometry, this.smokeMaterial);
  };

  update = (): void => {};

  destroy = (): void => {
    this.destroyModel();
    this.scene.remove(this.model);

    this.smokeGeometry.dispose();
    this.smokeMaterial.dispose();
    this.scene.remove(this.smokeMesh);
  };
}

export default CoffeeSmoke;
