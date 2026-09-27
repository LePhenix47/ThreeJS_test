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
    this.setSize(width, height);

    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this.instance);
  }

  // ? --_size in the element's own CSS drives the buffer size, CSS stays the single source of truth
  private onResize = ([entry]: ResizeObserverEntry[]): void => {
    const { width, height } = entry.contentRect;

    this.setSize(width, height);
  };

  /** Sets how much alpha the fade removes each frame, 0 to 1. */
  public setFadeAlpha(alpha: number): void {
    this.fadeAlpha = alpha;
  }

  public drawOnOldPaint(): void {
    this.context.save();

    this.setCompositeOperation("destination-out");
    this.fillCanvas(`rgba(0, 0, 0, ${this.fadeAlpha})`); // ? Only the alpha counts here, it's how much of the old paint gets erased

    this.context.restore();
  }

  public update(): void {
    this.drawOnOldPaint();
  }

  public destroy(): void {
    this.resizeObserver.disconnect();

    super.destroy();
  }
}

export default DisplacementCanvas;
