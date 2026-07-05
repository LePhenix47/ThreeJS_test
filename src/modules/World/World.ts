import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import Environment from "./Environment";
import Floor from "./Floor";
import * as THREE from "three";
import Human from "./Human";

// * To setup GLSL shaders: git cherry-pick 905deb41a596f9122c2e71fb56a1194a0585c98d

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public environment?: Environment;
  public floor?: Floor;
  public human?: Human;

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.resources.on("textures-loaded", () => {
      this.floor = new Floor();
      this.environment = new Environment();
      this.human = new Human();
    });

    console.log("World");
  }

  public update = () => {
    this.human?.update();
  };

  public destroy = () => {
    this.floor?.destroy();
    this.human?.destroy();
    this.environment?.destroy();
  };
}

export default World;
