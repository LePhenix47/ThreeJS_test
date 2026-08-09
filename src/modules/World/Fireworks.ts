import * as THREE from "three";

import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";

import GUIStateRegistry from "@/utils/classes/gui-state-registry";

import { distance } from "@utils/numbers/math";
import { getRandomHexColor } from "@/utils/numbers/color";

import Firework from "./Firework";
import { getValueFromNewRange, randomInRange } from "@/utils/numbers/range";

type FireworksState = {
  /** Perspective for the particles, ones closer to camera appear larger than ones farther from it */
  perspectiveOn: boolean;
};

class Fireworks implements Updatable, Destroyable {
  private readonly experience: Experience;
  private guiRegistry: GUIStateRegistry<FireworksState> | null = null;

  private readonly debugDefaults: FireworksState = {
    perspectiveOn: false,
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

  private get randomTextureIndex() {
    return Math.floor(Math.random() * this.texturesArray.length);
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

    const ndcX = getValueFromNewRange(x, [0, 1], [-1, 1]);
    const ndcY = -1 * getValueFromNewRange(y, [0, 1], [-1, 1]);

    /* ? unproject() gives world-space coords but perspective projection is non-linear —
     *   ANY fixed NDC z lands very close to the near plane. Instead we unproject to get
     *   the ray direction, then walk a fixed distance along it from the camera. */
    const { position: camPos } = this.camera.instance;
    const direction = new THREE.Vector3(ndcX, ndcY, 0.5)
      .unproject(this.camera.instance)
      .sub(camPos)
      .normalize();
    const position = camPos
      .clone()
      .addScaledVector(direction, randomInRange([15, 50]));

    const { perspectiveOn } = this.guiRegistry?.state ?? this.debugDefaults;

    const texture: THREE.Texture<unknown> =
      this.texturesArray[this.randomTextureIndex];
    const color: string = getRandomHexColor();
    const size: number = randomInRange([5, 20]);
    const count: number = Math.floor(randomInRange([50, 150]));
    const rho: number = randomInRange([1, 5]) + count / 20;

    const firework = new Firework({
      position,
      texture,
      color,
      size,
      count,
      rho,
      perspectiveOn,
      onComplete: () => this.remove(firework),
    });

    this.active.push(firework);
  };

  private remove = (firework: Firework): void => {
    firework.destroy();

    const index: number = this.active.indexOf(firework);
    this.active.splice(index, 1);
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

    fireworksFolder.add(state, "perspectiveOn").name("Perspective");
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
