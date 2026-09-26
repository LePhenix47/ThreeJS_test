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
    const { width, height } = this.canvasSizes;
    this.context.fillStyle = "rgba(0,0,0,10%)";
    this.context.fillRect(0, 0, width, height);
  }

  public update(): void {
    this.drawOnOldPaint();
  }
}

export default DisplacementCanvas;
