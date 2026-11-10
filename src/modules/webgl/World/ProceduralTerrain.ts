import type GUI from "lil-gui";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import Sandbox from "./Sandbox";
import Terrain from "./Terrain";

export type ProceduralTerrainConstructor = {
  /** Shared GUI folder from `ProceduralTerrain`, this builds its own child folder under it. Null when debug tools are off. */
  parentFolder: GUI | null;
};

/**
 * Coordinator owning the sandbox board and (eventually) the generated terrain mesh it holds.
 */
class ProceduralTerrain implements Updatable, Destroyable {
  private readonly experience: Experience | null;

  private readonly sandbox: Sandbox;
  private readonly terrain: Terrain;

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
    this.terrain = new Terrain({ parentFolder });

    console.log("ProceduralTerrain");
  }

  public update(): void {
    this.terrain.update();
  }

  public destroy(): void {
    this.sandbox.destroy();
    this.terrain.destroy();
  }
}

export default ProceduralTerrain;
