# SVG Filter Region (`x`, `y`, `width`, `height` on `<filter>`)

## The Problem

The `<filter>` element accepts `x`, `y`, `width`, `height` attributes. These are commonly copy-pasted from examples with large values like `width="300%"` — but most of the time they're unnecessary and do nothing.

## What Those Attributes Do

The filter region is a rectangular **canvas** where filter primitives are allowed to paint their output. Anything outside this region is **hard-clipped** — silently discarded.

```
  ┌─────────────────────────────────┐  ← filter region boundary
  │                                 │
  │     ┌───────────────────┐       │
  │     │                   │       │
  │     │   element bbox    │       │
  │     │                   │       │
  │     └───────────────────┘       │
  │                                 │
  └─────────────────────────────────┘
```

The values are **percentages of the element's bounding box**. The SVG spec defaults are:

| Attribute | Default | Meaning                         |
|-----------|---------|----------------------------------|
| `x`       | `-10%`  | Start 10% to the left of bbox   |
| `y`       | `-10%`  | Start 10% above bbox            |
| `width`   | `120%`  | Region is 120% of bbox width    |
| `height`  | `120%`  | Region is 120% of bbox height   |

This gives a **10% margin on all four sides** around the element.

## When You Need a Larger Region

Only when the filter output **spreads far outside the element's bounding box**:

- `feGaussianBlur` with a high `stdDeviation` — blur radiates outward in all directions
- `feOffset` with a large `dx`/`dy` — output is displaced away from the origin

```
  feGaussianBlur stdDeviation=30:

  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← blur spills far outside bbox
  ░░░░┌───────────────────┐░░░░░
  ░░░░│                   │░░░░░
  ░░░░│   element bbox    │░░░░░
  ░░░░│                   │░░░░░
  ░░░░└───────────────────┘░░░░░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

  → You must expand the filter region or the blur gets clipped
```

## When Defaults Are Sufficient

These primitives have **no spatial spread** or only a tiny one:

- `feColorMatrix` — remaps colors, no movement
- `feComposite` — bounded by its two inputs
- `feMorphology radius={3}` — expands the mask by only 3px

If your filter only contains these, the default 10% margin is almost always more than enough.

## Worked Example

The `AnimatedText` component originally had:

```html
<filter id="outText" width="300%" height="300%" x="-20%" y="-20%">
  <feMorphology operator="dilate" radius="3" />
  <feMorphology operator="dilate" radius="1" />
  <feComposite ... />
  <feColorMatrix ... />
  <feComposite ... />
</filter>
```

The largest spread is from `feMorphology radius={3}` — **3px in each direction**.

The text has `fontSize=150`, so its bounding box height ≈ 130–150px.

Default margin check:

```
10% of 150px = 15px
15px >> 3px  ✓
```

The default region already had 15px of room. The `width="300%" x="-20%"` values were doing nothing — the filter output never reached those boundaries.

Removing them has no visual effect whatsoever.

## Rule of Thumb

| Filter primitive | Needs a larger region? | Why |
|---|---|---|
| `feGaussianBlur` stdDeviation > 5 | **Yes** | Blur spreads many px |
| `feOffset` large dx/dy | **Yes** | Output is displaced |
| `feMorphology` small radius | No | Spread = radius (tiny) |
| `feColorMatrix` | No | No spatial movement |
| `feComposite` | No | Bounded by its inputs |
| `feTurbulence` / `feFlood` | No | Fills the region, no spread |

## Minimum Safe Region Formula

If you do need to expand:

```
feGaussianBlur:   margin = 3 × stdDeviation   (px each side)
feMorphology:     margin = radius              (px each side)
feOffset:         x margin = |dx|, y margin = |dy|
```

Convert to percentage: `(margin / bbox_dimension) × 100`

Example — `feGaussianBlur stdDeviation=20` on a 200px tall element:

```
margin = 3 × 20 = 60px
percentage = (60 / 200) × 100 = 30%

→ y="-30%", height="160%"  (30% top + 100% element + 30% bottom)
```
