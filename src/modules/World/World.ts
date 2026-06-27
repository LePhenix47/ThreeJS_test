import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import Galaxy from "./Galaxy";

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public galaxy?: Galaxy;

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.galaxy = new Galaxy();

    console.log("World");
  }

  public update = () => {
    this.galaxy?.update();
  };

  public destroy = () => {
    this.galaxy?.destroy();
  };
}

export default World;
