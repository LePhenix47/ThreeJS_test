import Sizes from "./utils/Sizes/Sizes";

type InputCanvas =
  | React.RefObject<HTMLCanvasElement>
  | HTMLCanvasElement
  | string;

type ExperienceConstructor = {
  canvas: InputCanvas;
  debugMode?: boolean;
};

class Experience {
  private canvas: HTMLCanvasElement;
  private debugMode: boolean;

  private sizes: Sizes;

  constructor({ canvas, debugMode = false }: ExperienceConstructor) {
    console.log("Let us commence fourth");
    this.initCanvas(canvas);

    this.setDebugMode(debugMode);

    this.sizes = new Sizes(this.canvas.width, this.canvas.height);
  }

  /**
   * Initializes the canvas property
   *
   * @param {InputCanvas} canvas - The canvas element, reference to it or a CSS selector
   * @returns {void}
   */
  private initCanvas = (canvas: InputCanvas): void => {
    // ? If canvas is a CSS selector
    if (typeof canvas === "string") {
      const selectedElement: Element | null = document.querySelector(canvas);

      if (!(selectedElement instanceof HTMLCanvasElement)) {
        throw new Error("Canvas is not an HTMLCanvasElement");
      }

      this.canvas = selectedElement;
      return;
    }

    // ? If canvas is an HTMLCanvasElement
    if (canvas instanceof HTMLCanvasElement) {
      this.canvas = canvas;
      return;
    }

    if (!(canvas.current instanceof HTMLCanvasElement)) {
      throw new Error("Canvas is not an HTMLCanvasElement");
    }

    this.canvas = canvas.current;
  };

  setDebugMode = (debugMode: boolean): this => {
    this.debugMode = debugMode;

    const keyName = "DEBUG_EXPERIENCE" as const;

    if (this.debugMode) {
      console.log("Debug mode enabled");
      Reflect.set(window, keyName, this);
    } else {
      console.log("Debug mode disabled");
      Reflect.deleteProperty(window, keyName);
    }

    return this;
  };
}

export default Experience;
