import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import * as THREE from "three";
import Environment from "./Environment";
import Floor from "./Floor";

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public environment: Environment;
  public floor: Floor;

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    console.log("World");

    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.resources.on("textures-loaded", () => {
      console.log("Resources are ready to be used in the world");
      // * ⚠ ORDER MATTERS, the environment is the one that applies the map intensity, otherwise won't add it to the floor
      this.floor = new Floor();
      this.environment = new Environment();
    });

    this.test();
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
