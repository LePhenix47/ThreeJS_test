import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import Environment from "./Environment";

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public environment: Environment;

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.environment = new Environment();

    console.log("World");
  }

  public update = () => {};

  public destroy = () => {
    this.environment.destroy();
  };
}

export default World;
