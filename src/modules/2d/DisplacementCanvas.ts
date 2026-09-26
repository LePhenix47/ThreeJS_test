import Canvas2D from "@modules/2d/Canvas2D";
import { Updatable } from "@utils/types/lifecycle.type";

class DisplacementCanvas extends Canvas2D implements Updatable {
  /*
  public createGradient(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    arrayOfColors: string[]
  ): CanvasGradient {
    // Create a linear gradient for a canvas
    const canvasGradient: CanvasGradient = this.context.createLinearGradient(
      startX,
      startY,
      endX,
      endY
    );

    for (let i = 0; i < arrayOfColors.length; i++) {
      const color: string = arrayOfColors[i];

      canvasGradient.addColorStop(i, color);
    }

    return canvasGradient;
  }
  */

  public update(): void {}
}

export default DisplacementCanvas;
