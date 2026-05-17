import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import * as THREE from "three";
import Environment from "./Environment";

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public readonly environment: Environment;
  constructor() {
    console.log("World");

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.test();

    this.environment = new Environment();
  }

  test = () => {
    const testGeometry = new THREE.BoxGeometry(1, 1, 1);
    const testMaterial = new THREE.MeshStandardMaterial({
      color: "white",
    });

    const testMesh = new THREE.Mesh(testGeometry, testMaterial);

    const scene = this.experience?.scene;
    if (!scene) throw new Error("Scene not found");

    scene.add(testMesh);
  };

  public update = () => {};

  public destroy = () => {};
}

export default World;
