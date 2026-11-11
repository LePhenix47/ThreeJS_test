# Terrain drag scroll

## Overview

`TerrainDragScroll` blends two sources for the terrain's noise-lookup offset: an automatic time-based scroll (`uScrollOffset`, advanced every frame by `uScrollSpeed`) and the pointer's position while dragging (`uDragOffset`). `uDragInfluence` is the blend factor between them, 0 = fully automatic, 1 = fully pointer-controlled.

---

## 2D baseline

The classic draggable-image algorithm this is built from:

- Pointer events (`offsetX`/`offsetY` or similar) give the current pointer position.
- A drag-state flag marks whether a drag is active.
- On `pointerdown`, an "anchor" offset gets recomputed against the image's current (already-displaced) position, correcting for where on the image you clicked.
- A "last release" offset persists so the next drag continues from there instead of snapping back.
- Final position = anchor offset + last-release offset + movement since `pointerdown`.

---

## 3D mapping

| 2D concept | 3D equivalent | Note |
|---|---|---|
| `offsetX`/`offsetY` on pointer events | `worldXZ` from raycasting `interactivePlane` | Same role, world units instead of pixels |
| drag-state flag | `isDragging` (`Terrain.ts`) | Identical |
| anchor pos offset (click-point correction) | — doesn't exist | No rigid object/corner to correct for; the terrain is an infinite offset field, not a bounded image |
| "where we left off" stored offset | `uScrollOffset` | Same job: base to resume from on the next drag |
| `pointerNow - pointerAtMousedown` | `delta = worldXZ.sub(dragStartWorldXZ)` | Same math, just named |
| final position = anchor + lastOffset + movement | `offset = dragBaseOffset - delta` | Sign flips: this offsets a noise-lookup position, not a screen position, so adding scrolls the pattern backward |
| nothing (a static image has no self-motion) | `uScrollSpeed` auto-advance + `uDragInfluence` blend | New in 3D only — the terrain keeps scrolling on its own when not dragged, so handoff needs a blend, not just a snapshot |

---

## Mechanism

### `advance(deltaSeconds)`

Runs every frame while not dragging (`Terrain.update()`). Pushes `uScrollOffset` forward by `deltaSeconds * uScrollSpeed`. This is the only place the automatic scroll moves — no formula re-derives it from elapsed time, it's just accumulated.

### `start(worldXZ)`

Runs on `pointerdown`.

1. Kills any in-flight return tween from a previous `release()`.
2. Stores `worldXZ` as `dragStartWorldXZ` — a reference point only, used to compute `delta` in `drag()`, never applied directly.
3. Snapshots the current `uScrollOffset` into `dragBaseOffset`, so the drag continues from wherever the scroll already was instead of jumping to the clicked point.
4. Sets `uDragOffset` to that same snapshot and `uDragInfluence` to 1, handing the shader fully over to the pointer.

### `drag(worldXZ)`

Runs every frame while dragging. Computes `delta = worldXZ - dragStartWorldXZ` and writes `uDragOffset = dragBaseOffset - delta`. Reading the pointer as a delta from its start position (not as an absolute position) is what makes it feel like grabbing the terrain, instead of snapping the view to the cursor.

### `release()`

Runs on `pointerup`.

1. Catches `uScrollOffset` up to `uDragOffset`'s last value, so `advance()` resumes from there next frame instead of from wherever it was frozen since `start()`.
2. Tweens `uDragInfluence` back to 0 over `returnDuration`, easing control back to the automatic scroll.

Because step 1 re-anchors `uScrollOffset` to match `uDragOffset` exactly before the tween starts, there's no positional jump to ease, the blend only smooths the handoff of *control*, not a value gap.
