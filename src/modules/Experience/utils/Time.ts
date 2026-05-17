import EventEmitter from "./EventEmitter";
// * Note: We're not using ThreeJS's clock because it's not as performant + we don't need all its features + we want more control

class Time extends EventEmitter {
  start: number;
  current: number;
  elapsed: number;
  delta: number; // ? 60fps, avoids

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
    this.delta = Math.floor(1_000 / 60); // ? Avoids potential 1st frame bugs
  };

  public tick = () => {
    this.updateTime();
    this.emitTickEvent();
    this.animationFrameId = requestAnimationFrame(() => this.tick());
  };

  private emitTickEvent = () => {
    const tickData = {
      current: this.current,
      elapsed: this.elapsed,
      delta: this.delta,
    } as const;

    this.emit("tick", tickData);
  };

  private updateTime = () => {
    const currentTick: number = performance.now();
    const previousTick: number = this.current;

    this.delta = currentTick - previousTick;

    this.elapsed = currentTick - this.start;

    this.current = currentTick;
  };

  public destroy = () => {
    cancelAnimationFrame(this.animationFrameId);
  };
}

export default Time;
