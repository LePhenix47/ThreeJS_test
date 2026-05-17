import Experience from "@modules/Experience/Experience";
import * as THREE from "three";

class World {
  private readonly experience: Experience | null;
  constructor() {
    console.log("World");

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.test();
  }

  test = () => {
    const testGeometry = new THREE.BoxGeometry(1, 1, 1);
    const testMaterial = new THREE.MeshBasicMaterial({
      color: "white",
      wireframe: true,
    });

    const testMesh = new THREE.Mesh(testGeometry, testMaterial);

    const scene = this.experience?.scene;
    if (!scene) throw new Error("Scene not found");

    scene.add(testMesh);
  };
}

export default World;
