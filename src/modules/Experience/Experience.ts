import Sizes from "./utils/Sizes";
import Time from "./utils/Time";

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
  private time: Time;

  constructor({ canvas, debugMode = false }: ExperienceConstructor) {
    console.log("Let us commence fourth");
    this.initCanvas(canvas);

    this.setDebugMode(debugMode);

    // * Sizes
    this.sizes = new Sizes(this.canvas.width, this.canvas.height);
    this.sizes.beginObserve(this.canvas);
    this.sizes.on("resize", this.resize);

    // * Time
    this.time = new Time();
    this.time.on("tick", this.update);
  }

  resize = ({ width, height }) => {
    console.log("RESIZING");
  };

  update = () => {
    // console.log("TICKING");
  };

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

  destroy = () => {
    this.sizes.destroy();

    this.time.destroy();
  };
}

export default Experience;
