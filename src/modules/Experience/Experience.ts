import Camera from "./three/Camera";
import Sizes from "./utils/Sizes";
import Time from "./utils/Time";

import * as THREE from "three";

type InputCanvas =
  | React.RefObject<HTMLCanvasElement>
  | HTMLCanvasElement
  | string;

type ExperienceConstructor = {
  canvas: InputCanvas;
  debugMode?: boolean;
};

class Experience {
  public canvas: HTMLCanvasElement;
  private debugMode: boolean;

  public sizes: Sizes;
  public time: Time;
  public scene: THREE.Scene<THREE.Object3DEventMap>;

  public static instance: Experience;
  camera: Camera;

  constructor({ canvas, debugMode = false }: ExperienceConstructor) {
    if (Experience.instance) {
      console.warn(
        "Experience instance already exists, returning existing instance",
      );
      return Experience.instance;
    }
    Experience.instance = this;

    console.log("Let us commence fourth");
    this.initCanvas(canvas);
    this.setDebugMode(debugMode);

    // * THREE stuff
    // ? Scene
    this.scene = new THREE.Scene();

    // ? Camera
    this.camera = new Camera();

    // * Sizes
    this.sizes = new Sizes(this.canvas.width, this.canvas.height);
    this.sizes.beginObserve(this.canvas);
    this.sizes.on("resize", this.resize);

    // * Time
    this.time = new Time();
    this.time.on("tick", () => {
      this.update();
    });
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
