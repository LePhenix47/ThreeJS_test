import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import * as THREE from "three";
import Environment from "./Environment";
import Floor from "./Floor";
import Fox from "./Fox";

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public environment?: Environment;
  public floor?: Floor;
  public fox?: Fox;

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
      this.fox = new Fox();
      this.environment = new Environment();
    });
  }

  public update = () => {
    this.fox?.update();
  };

  public destroy = () => {
    this.fox?.destroy();
  };
}

export default World;
