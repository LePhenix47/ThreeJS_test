import { prepareWithSegments, layoutNextLine } from "@chenglou/pretext";
import type { PreparedTextWithSegments, LayoutCursor } from "@chenglou/pretext";

import type { ScreenCircle } from "./mesh-silhouette-extractor";
import { distance } from "@utils/numbers/math";

export type TextRun = {
  text: string;
  x: number;
  y: number;
};

type HorizontalSpan = {
  left: number;
  right: number;
};

// * watch: https://youtu.be/Em6gzss5zu0?si=cBfd_nSk2LNcl94X&t=802
/**
 * Lays out text line by line inside a 2D container, flowing around
 * a set of screen-space circles (e.g. 3D mesh silhouettes projected to screen).
 *
 * For each horizontal band, it computes the horizontal spans occluded by
 * each circle, then carves the remaining open slots and fills them with text
 * using a pretext cursor so the text stream stays contiguous across lines.
 */
class CircleTextLayout {
  private readonly prepared: PreparedTextWithSegments;
  private readonly lineHeight: number;
  private readonly horizontalPadding: number;
  private readonly verticalPadding: number;
  private readonly MIN_SLOT_WIDTH = 65;

  /**
   * @param text - Full text string to lay out.
   * @param font - CSS font string (e.g. `"14px sans-serif"`) used for glyph measurement.
   * @param lineHeight - Pixel height of each text line band.
   * @param horizontalPadding - Inset from container edges and gutter around circles.
   * @param verticalPadding - Inset from container top/bottom and buffer above/below circles.
   */
  constructor(
    text: string,
    font: string,
    lineHeight: number,
    horizontalPadding = 8,
    verticalPadding = 4,
  ) {
    this.prepared = prepareWithSegments(text, font);
    this.lineHeight = lineHeight;
    this.horizontalPadding = horizontalPadding;
    this.verticalPadding = verticalPadding;
  }

  /**
   * Returns the horizontal span `[left, right]` that a circle occludes within a
   * given band, expanded by padding. Returns `null` if the circle doesn't
   * intersect the padded band at all.
   */
  private getBlockedInterval = (
    circle: ScreenCircle,
    bandTop: number,
    bandBottom: number,
  ): HorizontalSpan | null => {
    const { cx, cy, r } = circle;
    const { verticalPadding, horizontalPadding } = this;

    /* expand the band by verticalPadding before testing intersection so text
       never grazes the circle edge — gives visual breathing room */
    const sampleTop: number = bandTop - verticalPadding;
    const sampleBottom: number = bandBottom + verticalPadding;

    /* minDy = shortest vertical distance from circle center to the padded band.
       used to find the widest circle cross-section that could block this band */
    let minDy: number;

    if (cy >= sampleTop && cy <= sampleBottom) {
      // * center inside band — band cuts through the widest part or close to it
      minDy = 0;
    } else if (cy < sampleTop) {
      // * center above band — closest edge is the top
      minDy = sampleTop - cy;
    } else {
      // * center below band — closest edge is the bottom
      minDy = cy - sampleBottom;
    }

    /* circle entirely above or below — no intersection with this band */
    if (minDy > r) return null;

    /* chord half-width at vertical distance minDy from center: √(r² − dy²) */
    const halfWidth: number = distance(r, minDy, { subtract: true });

    /* expand blocked span by horizontalPadding so text doesn't run flush against the circle */
    const left: number = cx - halfWidth - horizontalPadding;
    const right: number = cx + halfWidth + horizontalPadding;

    return { left, right };
  };

  /**
   * Starts with the full inset container width as a single slot and iteratively
   * subtracts each blocked span, splitting slots where needed.
   * Slots narrower than `MIN_SLOT_WIDTH` are discarded.
   */
  private carveSlots = (
    containerWidth: number,
    blocked: HorizontalSpan[],
  ): HorizontalSpan[] => {
    const { horizontalPadding } = this;
    /* start with the full inset width as one open slot — each blocked span
       will punch holes into it */
    let slots: HorizontalSpan[] = [
      { left: horizontalPadding, right: containerWidth - horizontalPadding },
    ];

    for (const block of blocked) {
      const { left: blockLeft, right: blockRight } = block;
      const next: HorizontalSpan[] = [];

      for (const slot of slots) {
        const { left: slotLeft, right: slotRight } = slot;

        /* no overlap — keep slot intact */
        if (blockRight <= slotLeft || blockLeft >= slotRight) {
          next.push(slot);
          continue;
        }
        /* block overlaps: keep left remnant and/or right remnant of the slot */
        if (blockLeft > slotLeft)
          next.push({ left: slotLeft, right: blockLeft });
        if (blockRight < slotRight)
          next.push({ left: blockRight, right: slotRight });
      }

      slots = next;
    }

    /* discard slots too narrow to hold readable text */
    return slots.filter(
      ({ left, right }) => right - left >= this.MIN_SLOT_WIDTH,
    );
  };

  /**
   * Produces a list of positioned text runs that flow around the given circles.
   *
   * Walks the container top-to-bottom in `lineHeight` steps. For each band,
   * computes blocked spans from circles, carves open slots, and fills them
   * with text using a shared pretext cursor — so text stays contiguous across
   * lines and slots. Stops early if the text is exhausted.
   *
   * @param containerWidth - Width of the overlay container in pixels.
   * @param containerHeight - Height of the overlay container in pixels.
   * @param circles - Screen-space circles to flow text around.
   * @returns Array of `TextRun` objects with text content and `(x, y)` position.
   */
  public layout = (
    containerWidth: number,
    containerHeight: number,
    circles: ScreenCircle[],
  ): TextRun[] => {
    const { prepared, lineHeight, verticalPadding } = this;
    const runs: TextRun[] = [];
    /* cursor is shared across all slots and lines so text flows continuously
       rather than restarting at each slot */
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    /* start below the top inset so text never clips against the container edge */
    let lineY = verticalPadding;

    while (lineY + lineHeight <= containerHeight - verticalPadding) {
      const bandTop: number = lineY;
      const bandBottom: number = lineY + lineHeight;

      const blocked: HorizontalSpan[] = circles
        .map((circle) => this.getBlockedInterval(circle, bandTop, bandBottom))
        .filter((b): b is HorizontalSpan => b !== null);

      const slots: HorizontalSpan[] = this.carveSlots(containerWidth, blocked);
      let textExhausted: boolean = false;

      for (const { left, right } of slots) {
        const line = layoutNextLine(prepared, cursor, right - left);

        /* null means pretext ran out of text — no point filling remaining slots */
        if (!line) {
          textExhausted = true;
          break;
        }

        runs.push({ text: line.text, x: left, y: lineY });
        cursor = line.end;
      }

      /* break outer loop too — remaining lines would all be empty */
      if (textExhausted) break;
      lineY += lineHeight;
    }

    return runs;
  };
}

export default CircleTextLayout;
