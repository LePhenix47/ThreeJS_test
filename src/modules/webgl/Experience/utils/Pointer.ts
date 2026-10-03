import { Destroyable, Updatable } from "@utils/types/lifecycle.type";
import EventEmitter from "./EventEmitter";
import { distance } from "@/utils/numbers/math";

type PointerPosition = {
  x: number;
  y: number;
};

type PointerEvents = {
  click: [MouseEvent];
};

class Pointer
  extends EventEmitter<PointerEvents>
  implements Destroyable, Updatable
{
  /** Position over the element, in CSS pixels. NaN until the first pointer move. */
  public readonly position: PointerPosition = { x: NaN, y: NaN };
  public readonly previousPosition: PointerPosition = { x: NaN, y: NaN };

  /** Position over the element, in CSS pixels, at the latest pointer down. */
  public readonly exitPointerLastPosition: PointerPosition = { x: 0, y: 0 };

  private readonly abortController = new AbortController();
  private readonly element: HTMLElement;

  /** Horizontal position as a fraction of the element width, from 0 (left) to 1 (right). */
  public get normalizedX(): number {
    return this.position.x / this.element.offsetWidth;
  }

  /** Vertical position as a fraction of the element height, from 0 (top) to 1 (bottom). */
  public get normalizedY(): number {
    return this.position.y / this.element.offsetHeight;
  }

  /** Horizontal position remapped from [0, 1] to [-1, 1], left to right. */
  public get clipSpaceX(): number {
    return this.normalizedX * 2 - 1;
  }

  /** Vertical position remapped from [0, 1] to [-1, 1], top to bottom. Negate for Three's Y-up clip space, where top is +1. */
  public get clipSpaceY(): number {
    return this.normalizedY * 2 - 1;
  }

  public get distanceFromPreviousPosition(): number {
    const dx: number = this.position.x - this.previousPosition.x;
    const dy: number = this.position.y - this.previousPosition.y;

    const dist: number = distance(dx, dy);
    return dist;
  }

  constructor(element: HTMLElement) {
    super();

    this.element = element;

    this.setListeners();

    console.log("Pointer instantiated");
  }

  private setListeners(): void {
    const { signal } = this.abortController;

    this.element.addEventListener("pointermove", this.onPointerMove, {
      signal,
    });
    this.element.addEventListener("pointerdown", this.onPointerDown, {
      signal,
    });
    this.element.addEventListener("click", this.onClick, { signal });
  }

  private onPointerMove = (e: PointerEvent): void => {
    // ? offsetX and offsetY are relative to the event target, which is the element itself since a canvas has no children
    this.position.x = e.offsetX;
    this.position.y = e.offsetY;
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.exitPointerLastPosition.x = e.offsetX;
    this.exitPointerLastPosition.y = e.offsetY;
  };

  private onClick = (e: MouseEvent): void => {
    super.emit("click", e);
  };

  public update(): void {
    this.syncPreviousPosition();
  }

  /*
    ? Synced once per frame, not per pointermove event: readers only see distanceFromPreviousPosition
    ? once per frame anyway, and syncing here means a truly idle cursor reads a real 0 the very next
    ? frame instead of staying stuck at whatever the last DOM event's delta happened to be.
  */
  private syncPreviousPosition(): void {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
  }

  public destroy(): void {
    this.abortController.abort();
    super.removeAllListeners();
  }
}

export default Pointer;
