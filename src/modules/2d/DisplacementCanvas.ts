import { InputCanvas, resolveCanvas } from "@utils/dom/canvas";
import Canvas2D from "@modules/2d/Canvas2D";
import { Updatable } from "@utils/types/lifecycle.type";

type DisplacementCanvasParams = {
  canvas: InputCanvas;
};

class DisplacementCanvas extends Canvas2D implements Updatable {
  public static readonly CONFIG = {
    size: 128,
  } as const;

  constructor({ canvas }: DisplacementCanvasParams) {
    super({ canvas });

    const { size } = DisplacementCanvas.CONFIG;
    this.setSize(size, size);
  }

  public update(): void {}
}

export default DisplacementCanvas;
