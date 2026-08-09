import * as THREE from "three";

import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";

import GUIStateRegistry from "@/utils/classes/gui-state-registry";

import { distance } from "@utils/numbers/math";

import Firework from "./Firework";

type FireworksState = {
  /** Total number of particles per burst. */
  count: number;

  /** Visual size of each particle point in pixels. */
  size: number;
  /** Perspective for the particles, ones closer to camera appear larger than ones farther from it */
  perspectiveOn: boolean;
  /** Index of the selected texture in the array of textures */
  selectedTextureIndex: number;
  /** Hex color of the particles */
  color: string;
};

class Fireworks implements Updatable, Destroyable {
  private readonly experience: Experience;
  private guiRegistry: GUIStateRegistry<FireworksState> | null = null;

  private readonly debugDefaults: FireworksState = {
    count: 500,
    size: 10,
    perspectiveOn: false,
    selectedTextureIndex: 1,
    color: "#ffffff",
  };

  private texturesArray: THREE.Texture<unknown>[];
  private readonly active: Firework[] = [];

  private get debug() {
    return this.experience.debug;
  }

  private get time() {
    return this.experience.time;
  }

  private get resources() {
    return this.experience.resources;
  }

  private get pointer() {
    return this.experience.pointer;
  }

  private get camera() {
    return this.experience.camera;
  }

  constructor() {
    this.experience = Experience.instance!;

    this.setTextures();
    this.pointer.on("click", this.onClickCanvas);

    if (this.debug?.isActive) {
      this.addDebugFolders();
    }

    console.log("Fireworks");
  }

  private setTextures = (): void => {
    const texturesArray = this.resources.getTextureArray("particles");

    for (const texture of texturesArray) {
      texture.flipY = false;
    }

    this.texturesArray = texturesArray;
  };

  private onClickCanvas = (e: MouseEvent): void => {
    const { x: downX, y: downY } = this.pointer.lastPointerDown;
    const dx: number = e.offsetX - downX;
    const dy: number = e.offsetY - downY;
    const MIN_CLICK_OFFSET_DISTANCE: number = 5;
    if (distance(dx, dy) > MIN_CLICK_OFFSET_DISTANCE) return;

    /* ? NDC (Normalized Device Coordinates): screen space where center = (0,0), edges = ±1.
     *   unproject() needs this. Our pointer is [0→1] with Y=0 at top, so we remap:
     *   x*2-1 maps [0,1]→[-1,+1]; negate Y because screen-Y grows down, NDC-Y grows up. */
    const { x, y } = this.pointer.normalized;
    const ndcX = x * 2 - 1;
    const ndcY = -(y * 2 - 1);
    const position = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(
      this.camera.instance,
    );

    const { count, size, perspectiveOn, selectedTextureIndex, color } =
      this.guiRegistry?.state ?? this.debugDefaults;

    const firework = new Firework({
      position,
      texturesArray: this.texturesArray,
      selectedTextureIndex,
      color,
      size,
      count,
      perspectiveOn,
      onComplete: () => this.remove(firework),
    });

    this.active.push(firework);
  };

  private remove = (firework: Firework): void => {
    firework.destroy();
    this.active.splice(this.active.indexOf(firework), 1);
  };

  private addDebugFolders = (): void => {
    const registry = new GUIStateRegistry<FireworksState>(
      "fireworks-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const fireworksFolder = gui.addFolder("Fireworks");

    // ? These controls affect the next spawned firework, not active ones
    fireworksFolder
      .add(state, "size")
      .min(0.001)
      .max(3)
      .step(0.01)
      .name("Size");

    fireworksFolder.add(state, "perspectiveOn").name("Perspective");

    fireworksFolder.addColor(state, "color").name("Color");

    fireworksFolder
      .add(
        state,
        "selectedTextureIndex",
        Array.from({ length: this.texturesArray.length }).map((_, i) => i),
      )
      .name("Selected texture");
  };

  public update = (): void => {
    for (const firework of this.active) {
      firework.updateTime(this.time.elapsedSeconds);
    }
  };

  public destroy = (): void => {
    for (const firework of this.active) {
      firework.destroy();
    }

    this.active.length = 0;
    this.pointer.off("click", this.onClickCanvas);
    this.guiRegistry?.dispose();
  };
}

export default Fireworks;
