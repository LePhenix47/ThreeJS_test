import World from "@modules/World/World";
import Camera from "./three/Camera";
import Renderer from "./three/Renderer";
import Sizes from "./utils/Sizes";
import Time from "./utils/Time";

import GUI from "lil-gui";
import * as THREE from "three";
import Resources from "./utils/Resources/Resources";
import { Source } from "./utils/Resources/types";
import Debug from "./utils/Debug/Debug";
import Pointer from "./utils/Pointer";

type InputCanvas =
  | React.RefObject<HTMLCanvasElement>
  | HTMLCanvasElement
  | string;

type ExperienceConstructor = {
  canvas: InputCanvas;
  debugMode?: boolean;
  loadingManager: THREE.LoadingManager;
  sources?: Source[];
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
  public debug: Debug;

  public sizes: Sizes;
  public time: Time;
  public scene: THREE.Scene<THREE.Object3DEventMap>;

  public resources: Resources;
  public pointer: Pointer;
  public camera: Camera;
  public renderer: Renderer;
  public world: World;

  constructor({
    canvas,
    debugMode = false,
    loadingManager,
    sources = [],
  }: ExperienceConstructor) {
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

    // * Resources (texture loading)
    this.resources = new Resources(sources, { loadingManager });
    this.resources.on("textures-loaded", () =>
      console.log("ALL TEXTURES LOADED !!!", this.resources.items),
    );

    // * Pointer
    this.pointer = new Pointer(this.canvas);

    // * THREE stuff
    // ? Scene
    this.scene = new THREE.Scene();

    // ? Camera
    this.camera = new Camera({ persistence: true });

    // ? Render
    this.renderer = new Renderer();

    // ? World
    this.world = new World();
  }

  public resize = (): void => {
    console.log("RESIZING");

    // * In order to avoid race conditions OR order of operations issues
    this.camera.resize();
    this.renderer.resize();
  };

  public update = (): void => {
    try {
      // console.log("TICKING");
      this.camera.update();
      this.renderer.update();
      this.world.update();
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
    const keyName = "DEBUG_EXPERIENCE" as const;

    if (!debugMode) {
      console.log("Debug mode disabled");
      Reflect.deleteProperty(window, keyName);
      return this;
    }

    console.log("Debug mode enabled");
    Reflect.set(window, keyName, this);
    this.debug = new Debug({ title: "Experience debug", isActive: true });

    return this;
  };

  public destroy = (): void => {
    this.sizes.destroy();
    this.time.destroy();
    this.pointer.destroy();
    this.camera.destroy();
    this.renderer.destroy();
    this.world.destroy();

    /**
     *
     * Read @link {https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects}
     */
    this.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry.dispose();

      for (const key in child.material) {
        const value = child.material[key];
        if (!value || typeof value.dispose !== "function") continue;

        value.dispose();
      }
    });

    if (this.debug?.isActive) {
      this.debug.destroy();
    }

    Experience.instance = null;
  };
}

export default Experience;
