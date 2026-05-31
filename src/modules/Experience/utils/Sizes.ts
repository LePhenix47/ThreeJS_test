import EventEmitter from "./EventEmitter";

class Sizes extends EventEmitter {
  width: number = 0;
  height: number = 0;
  pixelRatio: number = 1;

  private readonly resizeObserver: ResizeObserver;

  constructor(width: number, height: number) {
    super();

    this.setSize(width, height);

    this.resizeObserver = new ResizeObserver(this.onResize);

    console.log("Sizes instantiated");
  }

  get aspectRatio() {
    return this.width / this.height;
  }

  setSize = (width: number, height: number) => {
    this.width = width;
    this.height = height;

    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
  };

  private onResize = (entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      if (!entry.contentRect) return;
      const { width, height } = entry.contentRect;

      this.setSize(width, height);

      this.emit("resize", { width, height });
    }
  };

  beginObserve = (element: Element) => {
    this.resizeObserver.observe(element);
  };

  endObserve = (element: Element) => {
    this.resizeObserver.unobserve(element);
  };

  destroy = () => {
    this.resizeObserver.disconnect();

    this.removeAllListeners();
  };
}

export default Sizes;
