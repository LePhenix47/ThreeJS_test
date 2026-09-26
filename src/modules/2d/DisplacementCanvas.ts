import { Updatable, Destroyable } from "@modules/webgl/Experience/Experience";

class DisplacementCanvas implements Updatable, Destroyable {
  /**
   * The HTML canvas element.
   */
  public instance: HTMLCanvasElement;

  /**
   * The 2D rendering context of the canvas.
   */
  public context: CanvasRenderingContext2D;

  public get context2D() {
    return this.context;
  }

  public get canvasSizes() {
    const { width, height } = this.instance;

    return { width, height };
  }

  constructor({ canvas }) {
    this.instance = canvas;
    this.context = this.instance.getContext("2d")!;
  }

  /*
// Copied from the Experience class
  private initCanvas(canvas: InputCanvas): void {
    // ? If canvas is an HTMLCanvasElement
    if (canvas instanceof HTMLCanvasElement) {
      this.canvas = canvas;
      return;
    }

    // ? If canvas is a CSS selector
    if (typeof canvas === "string") {
      const selectedElement: Element | null = document.querySelector(canvas);

      if (!(selectedElement instanceof HTMLCanvasElement)) {
        throw new Error("Canvas is not an HTMLCanvasElement");
      }

      this.canvas = selectedElement;
      return;
    }

    // ? React ref
    if (!(canvas.current instanceof HTMLCanvasElement)) {
      throw new Error("Canvas is not an HTMLCanvasElement");
    }

    this.canvas = canvas.current;
  }
    */

  public clearPaint(): void {
    const { width, height } = this.canvasSizes;

    this.context.clearRect(0, 0, width, height);
  }

  public transformCanvas(
    translateX: number,
    translateY: number,
    rotationRad: number,
  ): void {
    // *
    this.context.translate(translateX, translateY);

    this.context.rotate(rotationRad);
  }

  /*
  public redrawOldPaint():void {
      const { width, height } = this.canvasSizes;
   this.context.fillStyle = "rgba(0, 0, 0, 10%)";
   this.context.fillRect(0, 0,  width, height);
  }
  */

  /*
 public createLinePath(
  startX: number,
  startY: number,
  arrayOfCoordinates: { x: number; y: number }[]
): void {
  //We start creating a path
  this.context.beginPath();

  //we set a starting point
  this.context.moveTo(startX, startY);

  for (const coordinates of arrayOfCoordinates) {
    const { x, y } = coordinates;
    this.context.lineTo(x, y);
  }

  //We close the path
  this.context.closePath();
}


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
  public destroy(): void {}
}

export default DisplacementCanvas;
