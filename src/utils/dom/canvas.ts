export type InputCanvas =
  React.RefObject<HTMLCanvasElement> | HTMLCanvasElement | string;

/**
 * Resolves a canvas element, a CSS selector or a React ref into the canvas element.
 *
 * @param {InputCanvas} canvas - The canvas element, reference to it or a CSS selector
 * @returns {HTMLCanvasElement}
 */
export function resolveCanvas(canvas: InputCanvas): HTMLCanvasElement {
  // ? If canvas is an HTMLCanvasElement
  if (canvas instanceof HTMLCanvasElement) return canvas;

  // ? If canvas is a CSS selector
  if (typeof canvas === "string") {
    const selectedElement: Element | null = document.querySelector(canvas);

    if (!(selectedElement instanceof HTMLCanvasElement)) {
      throw new Error("Canvas is not an HTMLCanvasElement");
    }

    return selectedElement;
  }

  // ? React ref
  if (!(canvas.current instanceof HTMLCanvasElement)) {
    throw new Error("Canvas is not an HTMLCanvasElement");
  }

  return canvas.current;
}
