import { PlaybackSpeed } from "@/utils/enums/time";
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
  /** `performance.now()` reading when `Time` was created. Milliseconds since page load, not a calendar time. */
  public startMs: number;
  /** `performance.now()` reading at the latest tick. */
  public currentMs: number;
  /** Milliseconds since `Time` was created (`currentMs - startMs`). */
  public elapsedMs: number;
  /** Milliseconds since the previous tick. */
  public deltaMs: number;
  /** Simulated time in ms since the Unix epoch. Advances by `deltaMs * timeScale` every tick. */
  public simulatedMs: number;
  /** Simulated seconds per real second. */
  public timeScale: number = PlaybackSpeed.RealTime;

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

  get simulatedDate() {
    return new Date(this.simulatedMs);
  }

  /** Current time in milliseconds since the Unix epoch (1970-01-01 UTC). */
  private get epochMs() {
    // ? timeOrigin is the epoch time at page load and now() the offset since, so this stays on the same monotonic clock as the rest of Time and doesn't jump if the OS clock is adjusted
    return performance.timeOrigin + performance.now();
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

  private init(): void {
    this.startMs = performance.now();
    this.currentMs = this.startMs;

    this.elapsedMs = 0;
    this.simulatedMs = this.epochMs;
    this.deltaMs = Math.floor(1_000 / 60); // ? Avoids potential 1st frame bugs
  }

  // ? Arrow — recursively re-scheduled as its own rAF callback, must stay bound to `this`
  public tick = (): void => {
    try {
      this.updateTime();
      this.emitTickEvent();

      this.animationFrameId = requestAnimationFrame(this.tick);
    } catch (error) {
      console.error(error);
      console.error("Error in tick(), stopping animation loop");

      this.cancelAnimationLoop();
    }
  };

  /** Jumps the simulated time back to the real current time. */
  public resetSimulatedTime(): void {
    this.simulatedMs = this.epochMs;
  }

  private emitTickEvent(): void {
    const tickData = {
      currentMs: this.currentMs,
      elapsedMs: this.elapsedMs,
      deltaMs: this.deltaMs,
    } as const;

    this.emit("tick", tickData);
  }

  private updateTime(): void {
    const currentMsTick: number = performance.now();
    const previousTick: number = this.currentMs;

    this.deltaMs = currentMsTick - previousTick;

    this.elapsedMs = currentMsTick - this.startMs;

    this.currentMs = currentMsTick;
  }

  public cancelAnimationLoop(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  public destroy(): void {
    this.cancelAnimationLoop();

    this.removeAllListeners();
  }
}

export default Time;
