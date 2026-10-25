# GPGPU network particles

## What this is

A 3D particle effect: particles bounce inside a box, and each one draws a thin line to its closest neighbors. Everything (position, velocity, neighbor search) runs on the GPU through `GPUComputationRenderer`, no CPU readback at any point.

An earlier 2D version of this ran on a plain `<canvas>`. It looked fine and the code was simple, but performance was bad enough to push this GPGPU version instead.

Branch: `shader-network-particles`. Main files: `Network.ts` (coordinator), `NetworkGPGPU.ts` (the compute pipeline), `NetworkParticles.ts` (the points), `NetworkLines.ts` (the connecting lines).

---

## 1. Position + velocity: bouncing in a box

Two GPGPU variables, each depending on both of them:

```ts
computationRenderer.setVariableDependencies(particlesVariable, [
  particlesVariable,
  velocityVariable,
]);
computationRenderer.setVariableDependencies(velocityVariable, [
  particlesVariable,
  velocityVariable,
]);
```

Position needs velocity to know how far to move. Velocity needs position to know if it just hit a wall. Both also depend on themselves, since each reads its own previous frame (the ping-pong behind `GPUComputationRenderer`).

Position is the easy half:

```glsl
// position.glsl
vec4 position = texture(uParticles, uv);
vec4 velocity = texture(uVelocity, uv);

position.xyz += velocity.xyz * uDeltaTime;

gl_FragColor = position;
```

Velocity flips an axis when that axis has gone past the boundary:

```glsl
// velocity.glsl
bool checkBoxBoundary(float axisPosition, float axisVelocity) {
    // |position| >= boundary → we've reached the wall.
    // Alone that's not enough: next frame position is still past the boundary,
    // so it'd flip again and get stuck oscillating on the wall. Checking that
    // position and velocity still point the same way means "still pushing
    // outward", which is only true on the frame it actually crosses.
    return abs(axisPosition) >= uBoundary && sign(axisPosition) == sign(axisVelocity);
}
```

---

## 2. Nearest neighbors, on the GPU

A third GPGPU variable does a brute-force nearest-neighbor search: every particle checks its distance against every other particle, keeps the closest 4.

4 fits neatly because a compute texture is RGBA, 4 channels, 4 neighbor slots in one `vec4` with no extra packing:

```glsl
gl_FragColor = vec4(bestIndices[0], bestIndices[1], bestIndices[2], bestIndices[3]);
```

This variable has no self-dependency. It never reads its own previous output, it's a pure function of the current positions each frame:

```ts
computationRenderer.setVariableDependencies(neighborsVariable, [particlesVariable]);
```

It still renders through a framebuffer like the other two, `GPUComputationRenderer` builds render targets for every variable regardless. The only difference is it doesn't feed its own last frame back in.

Keeping the top 4 closest is an insertion sort. Track the current 4 best, and when a closer candidate shows up, shift the worse ones down to make room.

```glsl
void insertCandidate(
    inout float bestDistances[4],
    inout float bestIndices[4],
    float candidateDist,
    float candidateIndex
) {
    for(int i = 0; i < bestDistances.length(); i++) {
        if(candidateDist >= bestDistances[i]) {
            continue;
        }

        for(int j = 3; j > i; j--) {
            bestDistances[j] = bestDistances[j - 1];
            bestIndices[j] = bestIndices[j - 1];
        }

        bestDistances[i] = candidateDist;
        bestIndices[i] = candidateIndex;
        break;
    }
}
```

Two gotchas:

- **Padding texels.** The compute texture is always a square, `ceil(sqrt(particleCount))` per side, so it rounds up past the real particle count. Nothing ever seeds those leftover texels, they default to `(0,0,0)`, a fake particle sitting at the origin that every real particle nearby thought was a close neighbor. Excluding any candidate index past the real count fixes it:

  ```glsl
  if(candidateIndex >= uParticleCount) break;
  ```

  `break` and not `continue` works because `candidateIndex` only increases (row-major order), so once padding starts, everything after it is padding too.

- **Self-comparison.** Distance to yourself is always 0, which would always win a slot and bump out a real neighbor. Fixed with a direct index check:

  ```glsl
  if(candidateIndex == selfIndex) continue;
  ```

  Skip this one and the particle shows 3 real connections instead of 4, miss it and it always shows 3 real ones plus an invisible zero-length line to itself.

---

## 3. Drawing the connecting lines

`LineSegments` (native `GL_LINES`) has no per-vertex width control, so no way to make a line shrink with distance the way `gl_PointSize` does for points.

The fix: draw each line as a thin rectangle (a ribbon), 2 triangles, offset perpendicular to the line's direction in view-space, before the projection matrix is applied. Offsetting before projection is what makes the width shrink with distance for free, same reason points already do.

```glsl
mat4 viewModelMatrix = viewMatrix * modelMatrix;
vec4 ownerView = viewModelMatrix * vec4(ownerPosition, 1.0);
vec4 neighborView = viewModelMatrix * vec4(neighborPosition, 1.0);

vec4 baseView = mix(ownerView, neighborView, endpoint);

vec2 lineDirection = direction(ownerView.xy, neighborView.xy);
vec2 perpendicular = vec2(-lineDirection.y, lineDirection.x);

baseView.xy += perpendicular * uLineWidth * 0.5 * side;

return projectionMatrix * baseView;
```

`viewMatrix * modelMatrix` is combined once into a local `viewModelMatrix` since the same transform gets applied to two different positions (owner and neighbor) right below it, cheaper than redoing the `mat4 * mat4` twice.

### Why the vertex count is `particleCount * neighborCount * 6`

This geometry has no `position` attribute. Every vertex's actual location is computed in the shader, from sampling `uParticlesTexture`. The CPU side only needs to hand each vertex a "recipe": which particle, which of its neighbors, and which corner of that one line's rectangle.

A rectangle has 4 corners, but with no index buffer, 2 triangles means 6 vertex slots, some corners repeated:

```ts
private static readonly QUAD_CORNERS: readonly QuadCorner[] = [
  { endpoint: 0, side: -1 }, // owner,    left
  { endpoint: 0, side: 1 },  // owner,    right
  { endpoint: 1, side: -1 }, // neighbor, left
  { endpoint: 0, side: 1 },  // owner,    right   (shared edge)
  { endpoint: 1, side: 1 },  // neighbor, right
  { endpoint: 1, side: -1 }, // neighbor, left    (shared edge)
];
```

`endpoint` picks which end of the line (0 = this particle, 1 = its neighbor). `side` picks which edge of the ribbon's width (left/right of the line's direction). The two repeated corners are the shared diagonal between the two triangles.

Every particle can have up to `neighborCount` (4) lines, every line is a 6-vertex quad, so every particle contributes `4 * 6 = 24` vertices total, all sharing the same `aOwnerUv`, differing only in `aNeighborSlot`/`aEndpoint`/`aSide`:

```ts
for (let particleIndex = 0; particleIndex < particleCount; particleIndex++) {
  const { u, v } = particleIndexToUv(particleIndex, size); // same for all 24

  for (let neighborSlot = 0; neighborSlot < neighborCount; neighborSlot++) {
    for (const corner of QUAD_CORNERS) {
      // write aOwnerUv = (u, v), aNeighborSlot, aEndpoint = corner.endpoint, aSide = corner.side
    }
  }
}
```

In the vertex shader, `aOwnerUv` samples the owner's live position, `aNeighborSlot` picks which of the 4 neighbor-texture entries to follow for the neighbor's live position, and `aEndpoint`/`aSide` pick which of the quad's 4 real corners this vertex is.

---

## Known limitations (left as-is, on purpose)

- **Particle count is fixed at build time**, tied to the seed box's own vertex count. Making it live-tunable would mean rebuilding the seed geometry, the GPGPU textures, and every attribute buffer in `NetworkParticles`/`NetworkLines` on the fly.
- **Neighbor count is hardcoded at K = 4**, baked into fixed-size GLSL arrays (`float bestDistances[4]`) and the RGBA packing of the neighbor texture. Supporting more would need either a wider texture format or multiple texture reads per particle.

Both would add real complexity for a side project that's already at a result worth stopping on. Documented here instead of implemented.
