import { InputCanvas, resolveCanvas } from "@utils/dom/canvas";
import { Destroyable } from "@utils/types/lifecycle.type";

export type Canvas2DConstructor = {
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

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DrawImageParams = {
  /** Image to draw. */
  image: CanvasImageSource;
  /** Box on the canvas the image is scaled into. */
  destination: Rect;
  /** Point of `destination` that lands on `(destination.x, destination.y)`, as a fraction of its size. (0, 0) is its top-left corner, (0.5, 0.5) its center, (1,1) bottom-right. Defaults to the top-left corner. */
  origin?: Point;
};

type DrawImageCroppedParams = {
  /** Source image to crop from. */
  image: CanvasImageSource;
  /** Crop rectangle in the source image's own pixels. */
  source: Rect;
  /** Box on the canvas the crop is scaled into. */
  destination: Rect;
  /** Point of `destination` that lands on `(destination.x, destination.y)`, as a fraction of its size. (0, 0) is its top-left corner, (0.5, 0.5) its center, (1,1) bottom-right. Defaults to the top-left corner. */
  origin?: Point;
};

type DrawWithTransformParams = {
  /** Offset applied to the canvas before `draw` runs. */
  translate: Point;
  rotationRad: number;
  draw: () => void;
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

  /** Sets the drawing buffer size in pixels, which also clears the canvas and resets its drawing state. */
  public setSize(width: number, height: number): void {
    const { width: currentWidth, height: currentHeight } = this.canvasSizes;

    // ? Assigning width or height wipes the canvas even when the value is the same, so skip when nothing changes
    const hasSameSize: boolean =
      width === currentWidth && height === currentHeight;
    if (hasSameSize) return;

    this.instance.width = width;
    this.instance.height = height;
  }

  /** Erases the whole canvas to transparent. */
  public clear(): void {
    const { width, height } = this.canvasSizes;

    this.context.clearRect(0, 0, width, height);
  }

  /** Paints the whole canvas with one color, drawn over what is already there. */
  public fillCanvas(color: string): void {
    const { width, height } = this.canvasSizes;

    this.drawRect({ x: 0, y: 0, width, height }, { fill: color });
  }

  /** Draws a rectangle from its top-left corner. */
  public drawRect(rect: Rect, style: PaintStyle): void {
    const { x, y, width, height } = rect;

    this.context.beginPath();
    this.context.rect(x, y, width, height);

    this.paintPath(style);
  }

  /** Draws a circle around its center. */
  public drawCircle(center: Point, radius: number, style: PaintStyle): void {
    this.context.beginPath();
    this.context.arc(center.x, center.y, radius, 0, Math.PI * 2);

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

  /** Draws an image so that its `origin` point lands on `destination`'s `(x, y)`. The origin is a fraction of `destination`'s size: (0, 0) is the top-left corner, (0.5, 0.5) the center. */
  public drawImage({
    image,
    destination,
    origin = { x: 0, y: 0 },
  }: DrawImageParams): void {
    const { width, height } = destination;
    const topLeft: Point = this.topLeftFromOrigin(destination, origin);

    this.context.drawImage(image, topLeft.x, topLeft.y, width, height);
  }

  /** Draws an image around its center. */
  public drawImageCentered({
    image,
    destination,
  }: Omit<DrawImageParams, "origin">): void {
    this.drawImage({ image, destination, origin: { x: 0.5, y: 0.5 } });
  }

  /** Draws a `source` rectangle cropped out of an image, scaled into `destination`. E.g. one frame of a sprite sheet. */
  public drawImageCropped({
    image,
    source,
    destination,
    origin = { x: 0, y: 0 },
  }: DrawImageCroppedParams): void {
    const { width, height } = destination;
    const topLeft = this.topLeftFromOrigin(destination, origin);

    this.context.drawImage(
      image,
      source.x,
      source.y,
      source.width,
      source.height,
      topLeft.x,
      topLeft.y,
      width,
      height,
    );
  }

  /** Top-left corner of `rect` so that its `origin` point lands on `(rect.x, rect.y)`. */
  private topLeftFromOrigin(rect: Rect, origin: Point): Point {
    return {
      x: rect.x - rect.width * origin.x,
      y: rect.y - rect.height * origin.y,
    };
  }

  /** Runs `draw` with the canvas translated then rotated, and restores the previous transform after. */
  public drawWithTransform({
    translate,
    rotationRad,
    draw,
  }: DrawWithTransformParams): void {
    this.context.save();

    try {
      this.context.translate(translate.x, translate.y);
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
