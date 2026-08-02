# Circle-Aware Text Layout

## The problem

The 3D objects on screen act as obstacles — text should wrap around them, not render on top of them. Every frame the objects move (they rotate), so the text positions need to update every frame too.

The core idea is simple: scan the container top to bottom, line by line. For each line, figure out which horizontal chunks are blocked by circles. Place text only in the clear gaps.

---

## What is pretext?

> Talk by the author: <https://youtu.be/Em6gzss5zu0?si=cBfd_nSk2LNcl94X&t=802>

[`@chenglou/pretext`](https://github.com/chenglou/pretext) is a text layout library. It solves a specific problem: given a width, what text fits on the next line?

That question gets asked a lot here — potentially once per gap per line, every frame. The naive way to answer it would be to measure the text each time, which is slow. pretext splits the work in two:

- **`prepareWithSegments(text, font)`** — measures all the glyphs up front, once at construction time. Stores the result.
- **`layoutNextLine(prepared, cursor, width)`** — uses those measurements to instantly answer "what fits in `width` px?", advancing a cursor each call.

The **cursor** (`{ segmentIndex, graphemeIndex }`) is the key: it tracks where we are in the text stream. By passing the same cursor across all gaps and all lines, text flows continuously — it doesn't restart at each gap.

---

## `CircleTextLayout`

### Construction

```typescript
const layout = new CircleTextLayout(
  text,       // full string to flow
  font,       // CSS font string — must match the rendered font for correct measurements
  lineHeight, // pixel height of each line
  // optional:
  horizontalPadding = 8,  // inset from container edges + breathing room around circles
  verticalPadding = 4,    // inset from top/bottom + buffer above/below circles
);
```

`prepareWithSegments` runs once here and is reused every `layout()` call.

### `layout(containerWidth, containerHeight, circles)` — called every frame

Returns `TextRun[]` — each run has `{ text, x, y }` in pixels, ready to position with CSS.

#### How it works

```text
for each horizontal band (top → bottom, step = lineHeight):

  1. for each circle:
       does it intersect this band (with vertical padding)?
       → yes: compute the horizontal span it blocks
       → no: skip

  2. start with the full container width as one open slot
     punch a hole for each blocked span
     discard any remaining slot narrower than 65px (too narrow to read)

  3. for each open slot:
       ask pretext: "what text fits in this slot width?"
       place a TextRun at (slot.left, lineY)
       advance the cursor
       if pretext says null → text exhausted, stop
```

#### How a circle blocks a band

A circle at `(cx, cy)` with radius `r` blocks the horizontal range:

```text
halfWidth = √(r² − minDy²)
blocked   = [cx − halfWidth − padding,  cx + halfWidth + padding]
```

where `minDy` is the shortest vertical distance from the circle center to the band. This is just the chord width at that depth — how wide the circle is at the height of the line.

---

## Types

```typescript
// one positioned text chunk
type TextRun = {
  text: string;
  x: number;
  y: number;
};
```

---

## Known limitation

pretext lays out at the grapheme level (individual characters), not word boundaries. Words can break mid-word at a slot edge. Fixing this would require fitting whole words per slot instead — not currently implemented.
