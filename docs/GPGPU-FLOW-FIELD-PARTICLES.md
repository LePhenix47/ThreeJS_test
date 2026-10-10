# GPGPU Flow Field Particles

## Context

Thousands of particles, each with a position that evolves every frame, following a flow field. Computing that on the CPU, a JS loop touching every particle every frame, doesn't scale. This lesson moves the per-particle update onto the GPU.

---

## GPGPU

General-purpose computing on GPU. Using the GPU, normally dedicated to rendering pixels, to run arbitrary numeric computation instead.

For particles: store each particle's state (position, velocity, whatever) as pixels in a texture, one pixel per particle. Write a fragment shader that computes the *next* state from the *current* state. The GPU runs that shader on every pixel in parallel, updating every particle in one pass.

```
CPU (serial)                       GPU (parallel)
for i in 0..10000:                 texture, one pixel per particle
  particle[i].pos += ...             ↓
  (10000 sequential steps)         fragment shader runs on every
                                    pixel at once, same frame
```

---

## Flow field

A vector field. Every point in space has a direction, and usually a magnitude, assigned to it, typically generated from noise (simplex/Perlin) so it varies smoothly instead of jittering randomly.

A particle follows the field by sampling the field's direction at its own current position, each frame, and nudging itself that way. Not a fixed, precomputed path, a fresh read every frame.

```
→ → ↗ ↑ ↑        A particle sitting at any point just reads
→ ↗ ↑ ↑ ↖        the arrow under it and moves that way next frame.
↗ ↑ ↑ ↖ ←        Smooth noise means neighboring points have
↑ ↑ ↖ ← ←        similar directions, so paths curve, not jitter.
```

---

## The core problem: persistence

The effect is expensive, and worse, particle positions need to persist across frames. This frame's output position has to become next frame's input. There's no recomputing everything from nothing each frame. The simulation has state, and that state has to live somewhere the GPU can both read and write across frame boundaries.

---

## The solution: FBO (Framebuffer Object)

A secondary, invisible canvas the GPU renders into instead of the visible one. In Three.js, this is `THREE.WebGLRenderTarget`.

Familiar analogy: real-time reflections. A `WebGLCubeRenderTarget` and a `CubeCamera` capture the live scene from a reflective object's position into a texture. That's how reflections show the actual moving objects around it, not a static baked envmap frozen at bake time. Same mechanism, render to texture instead of render to screen, different use case.

For particles, instead of relying on a geometry's `position` attribute directly, build a second, fully offscreen scene:

- An orthographic camera.
- A single plane filling the entire view.
- That plane's fragment shader computes/updates particle data and writes it as pixel color.

Read that render target back as a texture, and decode it. RGB channels encode XYZ position. That texture becomes the position texture fed into the real, visible particle `Points` object.

```
Offscreen scene                           Visible scene
┌─────────────────────┐                   ┌─────────────────────┐
│ OrthographicCamera   │                   │ PerspectiveCamera   │
│ ┌─────────────────┐ │   render to       │                     │
│ │ full-view plane │ │   texture         │   Points (particles)│
│ │ (update shader) │ │ ────────────────▶ │   reads position    │
│ └─────────────────┘ │   RGB = XYZ       │   from that texture │
└─────────────────────┘                   └─────────────────────┘
   never shown on screen                      what you actually see
```

---

## Three problems FBOs introduce

### 1. Can't read and write the same FBO in one pass

A shader can't sample a texture it's currently rendering into. Fix: two render targets, ping-ponged. Each frame, read from buffer A and write to buffer B, then swap which one is current for the next frame.

```
Frame N:    read Buffer A  →  update shader  →  write Buffer B
Frame N+1:  read Buffer B  →  update shader  →  write Buffer A
Frame N+2:  read Buffer A  →  update shader  →  write Buffer B
            (swap which buffer is "current" every frame)
```

### 2. Pixel format and precision

A pixel isn't just one thing. Two separate questions apply here.

Range and precision: a standard texture is 8-bit per channel (0-255). Nowhere near enough for arbitrary float position data, negative values, fractions, large magnitudes. Needs a float-type texture (`FloatType`/`HalfFloatType`), and not every GPU or context supports rendering to one without extensions.

Channel layout: RGBA, RGB only, or just R. Depends on how many values per particle you're packing in.

### 3. Building blind

The FBO renders offscreen, so there's no visual feedback into it directly. You build the whole simulation without seeing anything, and only find out if it worked once the output texture is wired into something visible. It's a genuinely annoying way to debug. The usual workaround: temporarily render the FBO's output texture onto a visible debug plane, or color-code particles by a value read from it, while building.

---

## What `GPUComputationRenderer` actually solves

Three.js ships `GPUComputationRenderer` (in `three/addons`) to manage this pattern. It solves problem 1 by managing the ping-pong pair of render targets for you, and problem 2 by picking a sensible, supported texture type and format automatically, checking renderer capabilities.

It does not solve problem 3. The blind-build workflow is still on you. The library gives no built-in visual debugging into the compute textures.
