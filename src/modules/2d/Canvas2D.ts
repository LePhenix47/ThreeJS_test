import { InputCanvas, resolveCanvas } from "@utils/dom/canvas";
import { Destroyable } from "@utils/types/lifecycle.type";

type Canvas2DConstructor = {
  canvas: InputCanvas;
};

type Point = {
  x: number;
  y: number;
};

type PaintStyle = {
  /** Fill color. Skipped when omitted. */
  fill?: string;
  /** Stroke color. Skipped when omitted. */
  stroke?: string;
  strokeWidth?: number;
};

abstract class Canvas2D implements Destroyable {
  /**
   * The HTML canvas element.
   */
  public readonly instance: HTMLCanvasElement;

  /**
   * The 2D rendering context of the canvas.
   */
  public readonly context: CanvasRenderingContext2D;

  /** Size of the drawing buffer in pixels, not the CSS size. */
  public get canvasSizes() {
    const { width, height } = this.instance;

    return { width, height };
  }

  constructor({ canvas }: Canvas2DConstructor) {
    this.instance = resolveCanvas(canvas);

    const context: CanvasRenderingContext2D | null =
      this.instance.getContext("2d");
    if (!context) throw new Error("Could not get the 2D context of the canvas");

    this.context = context;
  }

  /** Erases the whole canvas to transparent. */
  public clear(): void {
    const { width, height } = this.canvasSizes;

    this.context.clearRect(0, 0, width, height);
  }

  /** Paints the whole canvas with one color, drawn over what is already there. */
  public fillCanvas(color: string): void {
    const { width, height } = this.canvasSizes;

    this.drawRect(0, 0, width, height, { fill: color });
  }

  /** Draws a rectangle from its top-left corner. */
  public drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    style: PaintStyle,
  ): void {
    this.context.beginPath();
    this.context.rect(x, y, width, height);

    this.paintPath(style);
  }

  /** Draws a circle around its center. */
  public drawCircle(
    x: number,
    y: number,
    radius: number,
    style: PaintStyle,
  ): void {
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2);

    this.paintPath(style);
  }

  /** Draws a line through the given points, in order. */
  public drawLine(points: Point[], style: PaintStyle): void {
    const [start, ...otherPoints] = points;
    if (!start) return;

    this.context.beginPath();
    this.context.moveTo(start.x, start.y);

    for (const { x, y } of otherPoints) {
      this.context.lineTo(x, y);
    }

    this.paintPath(style);
  }

  /** Draws an image from its top-left corner. */
  public drawImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.context.drawImage(image, x, y, width, height);
  }

  /** Draws an image around its center. */
  public drawImageCentered(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.drawImage(image, x - width / 2, y - height / 2, width, height);
  }

  /** Runs `draw` with the canvas translated then rotated, and restores the previous transform after. */
  public drawWithTransform(
    translateX: number,
    translateY: number,
    rotationRad: number,
    draw: () => void,
  ): void {
    this.context.save();

    try {
      this.context.translate(translateX, translateY);
      this.context.rotate(rotationRad);

      draw();
    } finally {
      this.context.restore();
    }
  }

  /** Sets the opacity applied to everything drawn next, from 0 to 1. */
  public setAlpha(alpha: number): void {
    this.context.globalAlpha = alpha;
  }

  /** Sets how everything drawn next blends with what is already on the canvas. */
  public setCompositeOperation(operation: GlobalCompositeOperation): void {
    this.context.globalCompositeOperation = operation;
  }

  private paintPath({ fill, stroke, strokeWidth = 1 }: PaintStyle): void {
    if (fill) {
      this.context.fillStyle = fill;
      this.context.fill();
    }

    if (stroke) {
      this.context.strokeStyle = stroke;
      this.context.lineWidth = strokeWidth;
      this.context.stroke();
    }
  }

  public destroy(): void {
    // ? reset() clears the bitmap and the drawing state but keeps the canvas size. The element itself belongs to whoever created it.
    this.context.reset();
  }
}

export default Canvas2D;
