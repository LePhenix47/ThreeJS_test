import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import Environment from "./Environment";
import Water from "./Water";

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public environment?: Environment;
  public shaderPlane?: Water;

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.environment = new Environment();
    this.shaderPlane = new Water();

    // this.resources.on("textures-loaded", () => {});

    console.log("World");
  }

  public update = () => {
    this.shaderPlane?.update();
  };

  public destroy = () => {
    this.environment?.destroy();
  };
}

export default World;
