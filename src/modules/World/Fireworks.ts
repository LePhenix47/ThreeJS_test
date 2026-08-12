import * as THREE from "three";

import Experience, {
  Destroyable,
  Updatable,
} from "@modules/Experience/Experience";

import GUIStateRegistry from "@/utils/classes/gui-state-registry";

import { distance } from "@utils/numbers/math";
import { getRandomHexColor } from "@/utils/numbers/color";

import Firework, { FireworkOptions } from "./Firework";
import { getValueFromNewRange, randomInRange } from "@/utils/numbers/range";

type FireworksState = {
  /** Perspective for the particles, ones closer to camera appear larger than ones farther from it */
  perspectiveOn: boolean;
};

type FireworkOptionsKeys = keyof FireworkOptions;

type FireworkConfigKey = Extract<
  FireworkOptionsKeys,
  "position" | "size" | "count" | "rho"
>;

type ConfigIntervals = {
  min: number;
  max: number;
};

class Fireworks implements Updatable, Destroyable {
  public static readonly MIN_CLICK_OFFSET_DISTANCE: number = 5;
  public static readonly CONFIG: Record<FireworkConfigKey, ConfigIntervals> = {
    position: {
      min: 15,
      max: 50,
    },

    size: {
      min: 5,
      max: 20,
    },
    count: {
      min: 50,
      max: 150,
    },
    rho: {
      min: 1,
      max: 5,
    },
  };

  private readonly experience: Experience;
  private guiRegistry: GUIStateRegistry<FireworksState> | null = null;

  private readonly debugDefaults: FireworksState = {
    perspectiveOn: false,
  };

  private texturesArray: THREE.Texture<HTMLImageElement>[];
  private readonly active: Firework[] = [];

  private get debug() {
    return this.experience.debug;
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

  private getRandomTexture(): (typeof this.texturesArray)[number] {
    const index: number = Math.floor(Math.random() * this.texturesArray.length);

    return this.texturesArray[index];
  }

  private setTextures(): void {
    const texturesArray =
      this.resources.getTextureArray<HTMLImageElement>("particles");

    for (const texture of texturesArray) {
      texture.flipY = false;
    }

    this.texturesArray = texturesArray;
  }

  private onClickCanvas = (e: MouseEvent): void => {
    const { x: downX, y: downY } = this.pointer.lastPointerDown;
    const dx: number = e.offsetX - downX;
    const dy: number = e.offsetY - downY;

    if (distance(dx, dy) > Fireworks.MIN_CLICK_OFFSET_DISTANCE) return;

    /* ? NDC (Normalized Device Coordinates): screen space where center = (0,0), edges = ±1.
     *   unproject() needs this. Our pointer is [0→1] with Y=0 at top, so we remap:
     *   x*2-1 maps [0,1]→[-1,+1]; negate Y because screen-Y grows down, NDC-Y grows up. */
    const { x, y } = this.pointer.normalized;

    const ndcX = getValueFromNewRange(x, {
      inputMin: 0,
      inputMax: 1,
      outputMin: -1,
      outputMax: 1,
    });
    const ndcY =
      -1 *
      getValueFromNewRange(y, {
        inputMin: 0,
        inputMax: 1,
        outputMin: -1,
        outputMax: 1,
      });

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
      .addScaledVector(
        direction,
        randomInRange(
          Fireworks.CONFIG.position.min,
          Fireworks.CONFIG.position.max,
        ),
      );

    this.createFirework(position);
  };

  private createFirework(position: THREE.Vector3): void {
    const { perspectiveOn } = this.guiRegistry?.state || this.debugDefaults;

    const texture: THREE.Texture<HTMLImageElement> = this.getRandomTexture();
    const color: string = getRandomHexColor();
    const size: number = randomInRange(
      Fireworks.CONFIG.size.min,
      Fireworks.CONFIG.size.max,
    );
    const count: number = Math.floor(
      randomInRange(Fireworks.CONFIG.count.min, Fireworks.CONFIG.count.max),
    );
    const rho: number =
      randomInRange(Fireworks.CONFIG.rho.min, Fireworks.CONFIG.rho.max) +
      count / 20;

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
  }

  private remove(firework: Firework): void {
    firework.destroy();

    const index: number = this.active.indexOf(firework);
    if (index === -1) return;

    this.active.splice(index, 1);
  }

  private addDebugFolders(): void {
    const registry = new GUIStateRegistry<FireworksState>(
      "fireworks-gui-state",
      this.debugDefaults,
    );
    this.guiRegistry = registry;

    const { state } = registry;
    const { gui } = this.debug;

    const fireworksFolder = gui.addFolder("Fireworks");

    fireworksFolder.add(state, "perspectiveOn").name("Perspective");
  }

  public update(): void {
    for (const firework of this.active) {
      firework.updateTime();
    }
  }

  public destroy(): void {
    for (const firework of this.active) {
      firework.destroy();
    }

    this.active.length = 0;
    this.pointer.off("click", this.onClickCanvas);
    this.guiRegistry?.dispose();
  }
}

export default Fireworks;
