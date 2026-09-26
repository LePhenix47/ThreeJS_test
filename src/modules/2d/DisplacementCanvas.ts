import Canvas2D, { Canvas2DConstructor } from "@modules/2d/Canvas2D";
import { Updatable } from "@utils/types/lifecycle.type";

class DisplacementCanvas extends Canvas2D implements Updatable {
  public static readonly CONFIG = {
    size: 128,
  } as const;

  constructor({ canvas }: Canvas2DConstructor) {
    super({ canvas });

    const { size } = DisplacementCanvas.CONFIG;
    this.setSize(size, size);
  }

  public drawOnOldPaint(): void {
    this.context.save();

    this.setCompositeOperation("destination-out");
    this.fillCanvas("rgba(0, 0, 0, 0.1)"); // ? Only the alpha counts here, it's how much of the old paint gets erased

    this.context.restore();
  }

  public update(): void {
    this.drawOnOldPaint();
  }
}

export default DisplacementCanvas;
