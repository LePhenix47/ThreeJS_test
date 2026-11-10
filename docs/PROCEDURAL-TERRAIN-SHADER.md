# Procedural Terrain Shader

## Overview

`Terrain.ts` uses `CustomShaderMaterial` on a flat `PlaneGeometry`. The vertex shader displaces height from layered noise, the fragment shader colors by height and slope. Same vertex shader and uniforms also drive `customDepthMaterial`, so shadows match the displaced surface.

---

## Elevation: domain warping + fractal noise

`getElevation(position)`:

1. **Time offset.** `offsetWithTime` shifts the sample position by `uTime`, scrolling the whole noise field.
2. **Domain warping.** Before the real noise sample, position gets perturbed by a first noise lookup: `warpedPosition += simplexNoise2d(warpedPosition * frequency * warpFrequency) * warpStrength`. Breaks the grid-like look raw simplex noise has on its own.

The `for` loop is fractal Brownian motion (fBm): 3 octaves, frequency `1, 2, 4`, amplitude `÷2, ÷4, ÷8`. Frequency doubles, amplitude halves, each octave. First octave sets big shapes, later octaves add shrinking detail.

`signedPow(elevation, 2.0)` squares while keeping sign. Plain `pow(x, 2)` always returns positive, mirroring valleys into bumps. `signedPow` factors sign out first: `sign(x) * pow(abs(x), power)`.

---

## Normal from displacement: finite-difference neighbor sampling

Flat `PlaneGeometry` ships with a trivial baked normal (straight up), wrong once `.y` gets displaced per vertex.

A sphere has a closed-form parametrization, so tangent/bitangent stuff.

A displaced terrain plane has no such formula, so `computeElevationNormal` approximates numerically: sample a neighbor along `+X` and one along `-Z` (to get normal vec to point upward), run both through `getElevation()`, build tangent vectors from center to each neighbor, cross them.

Center point needs its own elevation added before the diff, same as the neighbors. Skip it and the tangent vectors encode absolute height instead of the height *difference*, normal comes out wrong almost everywhere, not just on steep slopes.

---

## Fragment layering

Five bands stacked with `mix()`, water gradient first, hard cutoffs on top:

1. **Water.** `smoothstep(-1.0, -0.1, y)` blends `uColorWaterDeep` → `uColorWaterSurface`. Only soft-edged layer.
2. **Sand, grass.** `step(threshold, y)`, hard cutoff.
3. **Rock.** Not height-based. `dot(normal, up)` measures closeness to flat. `step(0.8, dot)` inverted, so flat → `0`, tilted past ~37° → `1`. Multiplied by `grassRange` so water/sand can't show rock.
4. **Snow.** Hard `step()` again, but threshold perturbed by `simplexNoise2d(vElevatedPosition.xz * 15.0)` so the line wobbles instead of sitting flat.

`getElevation` scrolls its noise lookup over time, so `vElevatedPosition.xz` gets the same `offsetWithTime` before reaching the fragment shader's snow lookup. Skip that and the snow noise samples a static grid while the height field scrolls under it, desyncs, line jitters every frame.

---

## Sandbox board (three-bvh-csg)

`Sandbox.ts` carves the board instead of modeling it in one piece. Fill `BoxGeometry` (whole board) + hole `BoxGeometry` (smaller footprint, taller to poke through), both wrapped in a `Brush`. `Evaluator.evaluate(fill, hole, SUBTRACTION)` returns one mesh with the hole cut out.

---

## Custom depth material

Shadows render from a depth pass: light's point of view, depth material decides what's in shadow. A default depth material doesn't know about the vertex shader's displacement, so it sees the flat silhouette and shadows land on the wrong spot.

Fix: `mesh.customDepthMaterial`, a `CustomShaderMaterial` on `MeshDepthMaterial`, same vertex shader + same uniforms object as the visible material. No fragment shader needed, depth doesn't care about color. Shared uniforms keep both materials' displacement in sync automatically.
