---
name: layered-enums
description: Use when indexing into structured/packed numeric data (a matrix, a fixed-layout record) with a TypeScript enum. Covers splitting a single flat enum into a structural layer and a semantic layer instead of hand-deriving offsets.
---

# Layered Enums

A flat `X`/`Y`/`Z`-style enum stops being enough once the indexing itself is structured. E.g. reading cells out of a flattened matrix. Split it into two layers instead of hand-deriving offsets inline:

1. A **structural enum** that names the raw layout, domain-agnostic:

```typescript
// src/utils/enums/matrices.ts
/** Column-major 4×4 matrix index lookup. Element at row r, col c lives at r + c*4. */
// prettier-ignore
export enum M4 {
  r0c0 = 0,  r0c1 = 4,  r0c2 = 8,  r0c3 = 12,
  r1c0 = 1,  r1c1 = 5,  r1c2 = 9,  r1c3 = 13,
  r2c0 = 2,  r2c1 = 6,  r2c2 = 10, r2c3 = 14,
  r3c0 = 3,  r3c1 = 7,  r3c2 = 11, r3c3 = 15,
}
```

2. A **semantic enum** for the specific computation, whose members alias the structural enum's values instead of restating raw numbers. Naming convention `<output>_by<input>`:

```typescript
// prettier-ignore
export enum WorldToScreen {
  clipX_byX = M4.r0c0,  clipX_byY = M4.r0c1,  clipX_byZ = M4.r0c2,  clipX_byW = M4.r0c3,
  clipY_byX = M4.r1c0,  clipY_byY = M4.r1c1,  clipY_byZ = M4.r1c2,  clipY_byW = M4.r1c3,
  clipZ_byX = M4.r2c0,  clipZ_byY = M4.r2c1,  clipZ_byZ = M4.r2c2,  clipZ_byW = M4.r2c3,
  perspW_byX = M4.r3c0, perspW_byY = M4.r3c1, perspW_byZ = M4.r3c2, perspW_byW = M4.r3c3,
}

const w = m[WorldToScreen.perspW_byX] * x + m[WorldToScreen.perspW_byY] * y
        + m[WorldToScreen.perspW_byZ] * z + m[WorldToScreen.perspW_byW];
```

## Why alias instead of writing `clipX_byX = 0` directly

A bare number carries no information about what it's a position *in*. `M4.r0c0` tags the value with its shape. "cell (row 0, col 0) of a 4×4". So the definition is checkable against `M4`'s documented layout instead of trusted on faith or re-derived by hand. Not matrix-specific: the same split applies to indexing into any packed/structured data (a struct, a fixed-layout record) where a raw offset alone doesn't say what it identifies. Same idea as a branded/nominal type. The number alone is insufficient, you also need to know *what kind* of position it is.

Reach for this split once a single flat enum would need one member per meaningfully-named cell of a larger structure. The structural enum stays reusable for any same-shaped data, the semantic one documents what a specific algorithm does with it. Use `// prettier-ignore` above both so the aligned columns survive formatting.

## Gotchas

- A numeric enum's member can be initialized from another enum's member (`clipX_byX = M4.r0c0`). This is valid TypeScript, not a typo. It resolves to a plain number at compile time; the semantic enum has zero runtime cost over the structural one.
