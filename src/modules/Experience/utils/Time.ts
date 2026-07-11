import EventEmitter from "./EventEmitter";
// * Note: We're not using ThreeJS's clock because it's not as performant + we don't need all its features + we want more control

type TickData = {
  currentMs: number;
  elapsedMs: number;
  deltaMs: number;
};

type TimeEvents = {
  tick: [TickData];
};

class Time extends EventEmitter<TimeEvents> {
  public startMs: number;
  public currentMs: number;
  public elapsedMs: number;
  public deltaMs: number;

  get deltaSeconds() {
    return this.deltaMs / 1_000;
  }

  get elapsedSeconds() {
    return this.elapsedMs / 1_000;
  }

  get currentSeconds() {
    return this.currentMs / 1_000;
  }

  get startSeconds() {
    return this.startMs / 1_000;
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

  private init = (): void => {
    this.startMs = performance.now();
    this.currentMs = this.startMs;

    this.elapsedMs = 0;
    this.deltaMs = Math.floor(1_000 / 60); // ? Avoids potential 1st frame bugs
  };

  public tick = (): void => {
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

  private emitTickEvent = (): void => {
    const tickData = {
      currentMs: this.currentMs,
      elapsedMs: this.elapsedMs,
      deltaMs: this.deltaMs,
    } as const;

    this.emit("tick", tickData);
  };

  private updateTime = (): void => {
    const currentMsTick: number = performance.now();
    const previousTick: number = this.currentMs;

    this.deltaMs = currentMsTick - previousTick;

    this.elapsedMs = currentMsTick - this.startMs;

    this.currentMs = currentMsTick;
  };

  public cancelAnimationLoop = (): void =>
    cancelAnimationFrame(this.animationFrameId);

  public destroy = (): void => {
    this.cancelAnimationLoop();

    this.removeAllListeners();
  };
}

export default Time;
