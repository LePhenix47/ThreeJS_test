import World from "@modules/World/World";
import Camera from "./three/Camera";
import Renderer from "./three/Renderer";
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

export interface Resizable {
  resize(): void;
}
export interface Updatable {
  update(): void;
}
export interface Destroyable {
  destroy(): void;
}

class Experience implements Resizable, Updatable, Destroyable {
  public static instance: Experience | null = null;

  public canvas: HTMLCanvasElement;
  private debugMode: boolean;

  public sizes: Sizes;
  public time: Time;
  public scene: THREE.Scene<THREE.Object3DEventMap>;

  public camera: Camera;
  public renderer: Renderer;
  public world: World;

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

    // *  ⚠ ORDER MATTERS, CALLS MUST BE MADE IN THE CORRECT ORDER

    // * Sizes
    const parent: HTMLElement | null = this.canvas.parentElement;
    if (!parent) throw new Error("Canvas has no parent element");
    this.sizes = new Sizes(parent.clientWidth, parent.clientHeight);
    this.sizes.beginObserve(parent);
    this.sizes.on("resize", this.resize);

    // * Time
    this.time = new Time();
    this.time.on("tick", this.update);

    // * THREE stuff
    // ? Scene
    this.scene = new THREE.Scene();

    // ? Camera
    this.camera = new Camera();

    // ? Render
    this.renderer = new Renderer();

    // ? World
    this.world = new World();
  }

  public resize = () => {
    console.log("RESIZING");

    // * In order to avoid race conditions OR order of operations issues
    this.camera.resize();
    this.renderer.resize();
  };

  public update = () => {
    try {
      // console.log("TICKING");
      this.camera.update();
      this.renderer.update();
    } catch (error) {
      console.error(error);
      console.error("Tick has been stopped due to an error");
      this.time.off("tick", this.update);
    }
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

  public setDebugMode = (debugMode: boolean): this => {
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

  public destroy = () => {
    this.sizes.destroy();
    this.time.destroy();
    this.camera.destroy();
    this.renderer.destroy();

    Experience.instance = null;
  };
}

export default Experience;
