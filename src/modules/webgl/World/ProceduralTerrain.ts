import type GUI from "lil-gui";
import Experience, {
  Destroyable,
  Updatable,
} from "@modules/webgl/Experience/Experience";
import Sandbox from "./Sandbox";
import Terrain from "./Terrain";

import * as THREE from "three";

export type ProceduralTerrainConstructor = {
  /** Shared GUI folder from `ProceduralTerrain`, this builds its own child folder under it. Null when debug tools are off. */
  parentFolder: GUI | null;
  group: THREE.Group;
};

/**
 * Coordinator owning the sandbox board and (eventually) the generated terrain mesh it holds.
 */
class ProceduralTerrain implements Updatable, Destroyable {
  private readonly experience: Experience | null;

  private sandbox: Sandbox;
  private terrain: Terrain;

  public group: THREE.Group;

  private get scene() {
    return this.experience!.scene;
  }

  private get debug() {
    return this.experience!.debug;
  }

  constructor() {
    this.experience = Experience.instance;
    if (!this.experience) throw new Error("Experience instance not found");

    this.group = new THREE.Group();
    this.setGroupChildren();

    console.log("ProceduralTerrain");
  }

  private setGroupChildren(): void {
    const isDebugActive: boolean = this.debug?.isActive ?? false;
    const parentFolder: GUI | null = isDebugActive
      ? this.debug.gui.addFolder("Procedural terrain")
      : null;

    this.scene.add(this.group);

    this.sandbox = new Sandbox({ parentFolder, group: this.group });
    this.terrain = new Terrain({ parentFolder, group: this.group });
  }

  public update(): void {
    this.terrain.update();
  }

  public destroy(): void {
    this.sandbox.destroy();
    this.terrain.destroy();

    this.scene.remove(this.group);
  }
}

export default ProceduralTerrain;
