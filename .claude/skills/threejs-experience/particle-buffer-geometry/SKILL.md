---
name: particle-buffer-geometry
description: Use when hand-writing Float32Array buffer attributes for a particle system (positions, colors, custom per-vertex attributes) — covers indexing components by name instead of magic numbers, deriving stride, keeping placement/distribution math as pure functions, and resolving GUI-state vs defaults.
metadata:
  type: reference
---

# Particle Buffer Geometry

## Index by Name, Not Magic Number

The codebase has `SpaceEnum` (`X`/`Y`/`Z`) and `ColorEnum` (`Red`/`Green`/`Blue`) in `src/utils/enums/space-color.ts` for indexing interleaved `Float32Array` attributes. Use them instead of raw offsets:

```typescript
positions[i3 + SpaceEnum.X] = x;
positions[i3 + SpaceEnum.Y] = y;
positions[i3 + SpaceEnum.Z] = z;
```

Add a new enum to that file for any other fixed-component buffer (e.g. UV `S`/`T`) rather than inventing ad-hoc offsets.

## Layered Enums for Complex Indexing

A flat `X`/`Y`/`Z` enum stops being enough once the indexing itself is structured — e.g. reading cells out of a flattened matrix. Split it into two layers instead of hand-deriving offsets inline:

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

2. A **semantic enum** for the specific computation, whose members alias the structural enum's values instead of restating raw numbers — naming convention `<output>_by<input>`:

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

**Why alias instead of writing `clipX_byX = 0` directly:** a bare number carries no information about what it's a position *in*. `M4.r0c0` tags the value with its shape — "cell (row 0, col 0) of a 4×4" — so the definition is checkable against `M4`'s documented layout instead of trusted on faith or re-derived by hand. This isn't matrix-specific — the same split applies to indexing into any packed/structured data (a struct, a fixed-layout record) where a raw offset alone doesn't say what it identifies. It's the same idea as a branded/nominal type: the number alone is insufficient, you also need to know *what kind* of position it is.

Reach for this split once a single flat enum would need one member per meaningfully-named cell of a larger structure — the structural enum stays reusable for any same-shaped data, the semantic one documents what a specific algorithm does with it. Use `// prettier-ignore` above both so the aligned columns survive formatting.

## Derive Stride from the Enum

```typescript
import Enum from "@/utils/enums";

const stride: number = Enum.length(SpaceEnum); // 3 — don't hardcode it
const positions = new Float32Array(count * stride);
```

`Enum` (`src/utils/enums/index.ts`) also exposes `.keys()`, `.values()`, `.entries()`, `.has()`, `.hasValue()`, `.getName()`.

## Keep Placement Math as Pure Functions

Distribution math (sphere sampling, scatter, falloff curves) belongs in standalone pure functions under `src/utils/placement/*.ts` returning `{x, y, z}` — not inlined in the entity's `setGeometry()`. This keeps the math reusable across any particle entity and easy to reason about in isolation from Three.js/GUI concerns.

```typescript
// src/utils/placement/sphere-placement.ts
export function getRandomUniformSpherePlacement(
  minRadius: number,
  maxRadius: number,
): { x: number; y: number; z: number } {
  /* ... */
}
```

## Resolving GUI State vs Defaults

When an entity's geometry/material must be rebuildable from either live GUI state or defaults, expose a single fallback getter instead of repeating `guiRegistry?.state ?? debugDefaults` at every call site:

```typescript
private get state(): MyParticleState {
  return this.guiRegistry?.state ?? this.debugDefaults;
}

protected setGeometry = (): void => {
  const { count, radius } = this.state; // one fallback point, not repeated per field
};
```

---

## Gotchas

- `SpaceEnum`/`ColorEnum` members are declared as string literals (`"X"`, `"Y"`, `"Z"`) inside a numeric enum purely for readability — they still resolve to plain numeric indices at runtime, so `positions[i3 + SpaceEnum.X]` is exactly `positions[i3 + 0]`.
- `Enum.length()` counts only non-numeric keys (it filters out the reverse-mapping entries TypeScript numeric enums generate) — safe to use for stride, don't hand-roll a count.
- A numeric enum's member can be initialized from another enum's member (`clipX_byX = M4.r0c0`) — this is valid TypeScript, not a typo. It resolves to a plain number at compile time; the semantic enum has zero runtime cost over the structural one.
