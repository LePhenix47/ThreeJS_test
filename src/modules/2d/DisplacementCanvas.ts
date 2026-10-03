import Canvas2D, { Canvas2DConstructor } from "@modules/2d/Canvas2D";
import { Updatable } from "@utils/types/lifecycle.type";

class DisplacementCanvas extends Canvas2D implements Updatable {
  private readonly resizeObserver: ResizeObserver;
  /** How much alpha the fade removes each frame, 0 to 1. */
  private fadeAlpha = 0.01;

  constructor({ canvas }: Canvas2DConstructor) {
    super({ canvas });

    // ? Synchronous initial read: the observer's first callback only fires before the next paint, which can be after this frame's update() already ran
    const { width, height } = this.instance.getBoundingClientRect();
    super.setSize(width, height);

    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.instance);
  }

  // ? --_size in the element's own CSS drives the buffer size, CSS stays the single source of truth
  private onResize = ([entry]: ResizeObserverEntry[]): void => {
    const { width, height } = entry.contentRect;

    super.setSize(width, height);
  };

  /** Sets how much alpha the fade removes each frame, 0 to 1. */
  public setFadeAlpha(alpha: number): void {
    this.fadeAlpha = alpha;
  }

  public drawOnOldPaint(): void {
    this.context.save();

    super.setCompositeOperation("destination-out");
    super.fillCanvas(`rgba(0, 0, 0, ${this.fadeAlpha})`); // ? Only the alpha counts here, it's how much of the old paint gets erased

    this.context.restore();
  }

  public update(): void {
    this.drawOnOldPaint();
  }

  public destroy(): void {
    this.resizeObserver.disconnect();

    super.destroy();
  }

  /**
   * Smallest fraction (0-1) a per-frame `fadeAlpha` decay can reach on this canvas before 8-bit
   * rounding gets it stuck. A consumer reading a decaying channel from this canvas (e.g. a shader
   * sampling it as a texture) needs its own clamp above this floor, or the leftover residue never
   * rounds down to a true, exact 0.
   *
   * **Step 1: the fade.** GCO `"destination-out"` subtracts alpha, so each frame does
   * `a_new = a_old * (1 - fadeAlpha)`. Canvas alpha is stored as an 8-bit integer (0-255), so:
   *
   * ```py
   * a_new_255 = round(a_old_255 * (1 - fadeAlpha))
   * a_new_255 = round(a_old_255 - a_old_255 * fadeAlpha)
   * ```
   *
   * **Step 2: the problem.** Once the removed amount (`a_old_255 * fadeAlpha`) drops under `0.5`,
   * `round()` gives back the same integer, forever. The value is stuck.
   *
   * ```py
   * round(128 - 0.3) = round(127.7) = 128
   * ```
   *
   * **Step 3: the floor.** Solve for where the removed amount drops under `0.5`:
   *
   * ```py
   * a_old_255 * fadeAlpha < 0.5
   * a_old_255 < 0.5 / fadeAlpha            # in 0-255 terms
   * a_old     < 1 / (510 * fadeAlpha)      # as the 0-1 fraction a shader reads
   * ```
   */
  public static getFadeResidueFloor(fadeAlpha: number): number {
    return 1 / (510 * fadeAlpha);
  }
}

export default DisplacementCanvas;
