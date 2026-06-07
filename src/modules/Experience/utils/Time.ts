import EventEmitter from "./EventEmitter";
// * Note: We're not using ThreeJS's clock because it's not as performant + we don't need all its features + we want more control

class Time extends EventEmitter {
  public start: number;
  public current: number;
  public elapsed: number;
  public deltaMs: number;

  get deltaSeconds() {
    return this.deltaMs / 1_000;
  }

  get fps() {
    return Math.floor(1_000 / this.deltaMs);
  }

  private animationFrameId: number;

  constructor() {
    super();

    console.log("Time instantiated");

    this.init(); // ? Initial time values are set

    this.tick(); // ? Initial tick
  }

  private init = () => {
    this.start = performance.now();
    this.current = this.start;

    this.elapsed = 0;
    this.deltaMs = Math.floor(1_000 / 60); // ? Avoids potential 1st frame bugs
  };

  public tick = () => {
    try {
      this.updateTime();
      this.emitTickEvent();
      this.animationFrameId = requestAnimationFrame(() => this.tick());
    } catch (error) {
      console.error(error);
      console.error("Error in tick(), stopping animation loop");
      this.cancelAnimationLoop();
    }
  };

  private emitTickEvent = () => {
    const tickData = {
      current: this.current,
      elapsed: this.elapsed,
      deltaMs: this.deltaMs,
    } as const;

    this.emit("tick", tickData);
  };

  private updateTime = () => {
    const currentTick: number = performance.now();
    const previousTick: number = this.current;

    this.deltaMs = currentTick - previousTick;

    this.elapsed = currentTick - this.start;

    this.current = currentTick;
  };

  public cancelAnimationLoop = () =>
    cancelAnimationFrame(this.animationFrameId);

  public destroy = () => {
    this.cancelAnimationLoop();

    this.removeAllListeners();
  };
}

export default Time;
