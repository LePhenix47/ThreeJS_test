import { Destroyable } from "@modules/Experience/Experience";

type NormalizedPointer = {
  x: number; // 0 (left) → 1 (right)
  y: number; // 0 (top) → 1 (bottom)
};

class Pointer implements Destroyable {
  public normalized: NormalizedPointer = { x: 0.5, y: 0.5 };

  private readonly abortController = new AbortController();
  private readonly element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    this.setListeners();
    console.log("Pointer instantiated");
  }

  private setListeners = (): void => {
    const { signal } = this.abortController;
    this.element.addEventListener("pointermove", this.onPointerMove, {
      signal,
    });
  };

  private onPointerMove = (e: PointerEvent): void => {
    const { offsetWidth, offsetHeight } = this.element;
    this.normalized.x = e.offsetX / offsetWidth;
    this.normalized.y = e.offsetY / offsetHeight;
  };

  destroy = (): void => {
    this.abortController.abort();
  };
}

export default Pointer;
