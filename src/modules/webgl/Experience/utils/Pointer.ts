import { Destroyable } from "@utils/types/lifecycle.type";
import EventEmitter from "./EventEmitter";

type PointerPosition = {
  x: number;
  y: number;
};

type PointerEvents = {
  click: [MouseEvent];
};

class Pointer extends EventEmitter<PointerEvents> implements Destroyable {
  /** Position over the element, in CSS pixels. NaN until the first pointer move. */
  public readonly position: PointerPosition = { x: NaN, y: NaN };

  /** Position over the element, in CSS pixels, at the latest pointer down. */
  public readonly lastPointerDown: PointerPosition = { x: 0, y: 0 };

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
    this.lastPointerDown.x = e.offsetX;
    this.lastPointerDown.y = e.offsetY;
  };

  private onClick = (e: MouseEvent): void => {
    this.emit("click", e);
  };

  public destroy(): void {
    this.abortController.abort();
    this.removeAllListeners();
  }
}

export default Pointer;
