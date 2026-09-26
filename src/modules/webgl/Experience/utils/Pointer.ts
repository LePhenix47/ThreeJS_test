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
  /** Position over the element from 0 (left, top) to 1 (right, bottom). NaN until the first pointer move. */
  public readonly normalized: PointerPosition = { x: NaN, y: NaN };

  /** Position over the element, in CSS pixels, at the latest pointer down. */
  public readonly lastPointerDown: PointerPosition = { x: 0, y: 0 };

  private readonly abortController = new AbortController();
  private readonly element: HTMLElement;

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
    const { offsetWidth, offsetHeight } = this.element;

    // ? offsetX and offsetY are relative to the event target, which is the element itself since a canvas has no children
    this.normalized.x = e.offsetX / offsetWidth;
    this.normalized.y = e.offsetY / offsetHeight;
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
