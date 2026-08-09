import { Destroyable } from "@modules/Experience/Experience";
import EventEmitter from "./EventEmitter";

type NormalizedPointer = {
  x: number; // 0 (left) → 1 (right)
  y: number; // 0 (top) → 1 (bottom)
};

type PointerOffset = {
  x: number;
  y: number;
};

type PointerEvents = {
  click: [MouseEvent];
};

class Pointer extends EventEmitter<PointerEvents> implements Destroyable {
  public normalized: NormalizedPointer = { x: 0.5, y: 0.5 };
  public lastPointerDown: PointerOffset = { x: 0, y: 0 };

  private readonly abortController = new AbortController();
  private readonly element: HTMLElement;

  constructor(element: HTMLElement) {
    super();
    this.element = element;
    this.setListeners();
    console.log("Pointer instantiated");
  }

  private setListeners = (): void => {
    const { signal } = this.abortController;
    this.element.addEventListener("pointermove", this.onPointerMove, { signal });
    this.element.addEventListener("pointerdown", this.onPointerDown, { signal });
    this.element.addEventListener("click", this.onClick, { signal });
  };

  private onPointerMove = (e: PointerEvent): void => {
    const { offsetWidth, offsetHeight } = this.element;
    this.normalized.x = e.offsetX / offsetWidth;
    this.normalized.y = e.offsetY / offsetHeight;
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.lastPointerDown = { x: e.offsetX, y: e.offsetY };
  };

  private onClick = (e: MouseEvent): void => {
    this.emit("click", e);
  };

  destroy = (): void => {
    this.abortController.abort();
    this.removeAllListeners();
  };
}

export default Pointer;
