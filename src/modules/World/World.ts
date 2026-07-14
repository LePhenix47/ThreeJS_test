import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";
import CoffeeSmoke from "./CoffeeSmoke";

// * To setup GLSL shaders: git cherry-pick 905deb41a596f9122c2e71fb56a1194a0585c98d

class World implements Updatable, Destroyable {
  private readonly experience: Experience | null;
  public coffeeSmoke?: CoffeeSmoke;

  private get resources() {
    return this.experience!.resources;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.resources.on("textures-loaded", () => {
      this.coffeeSmoke = new CoffeeSmoke();
    });

    console.log("World");
  }

  public update = () => {
    this.coffeeSmoke?.update();
  };

  public destroy = () => {
    this.coffeeSmoke?.destroy();
  };
}

export default World;
