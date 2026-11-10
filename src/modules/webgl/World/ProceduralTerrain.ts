import type GUI from "lil-gui";
import Experience, {
  Destroyable,
} from "@modules/webgl/Experience/Experience";
import Sandbox from "./Sandbox";

/**
 * Coordinator owning the sandbox board and (eventually) the generated terrain mesh it holds.
 */
class ProceduralTerrain implements Destroyable {
  private readonly experience: Experience | null;

  private sandbox: Sandbox;

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    const isDebugActive: boolean = this.debug?.isActive ?? false;
    const parentFolder: GUI | null = isDebugActive
      ? this.debug.gui.addFolder("Procedural terrain")
      : null;

    this.sandbox = new Sandbox({ parentFolder });

    console.log("ProceduralTerrain");
  }

  public destroy(): void {
    this.sandbox.destroy();
  }
}

export default ProceduralTerrain;
