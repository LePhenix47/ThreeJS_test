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

Add a new enum to that file for any other fixed-component buffer (e.g. UV `S`/`T`) rather than inventing ad-hoc offsets. For indexing into something more structured than a flat vector (a matrix, a packed record), see the `layered-enums` skill.

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
