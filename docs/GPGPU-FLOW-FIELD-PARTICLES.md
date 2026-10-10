# GPGPU Flow Field Particles

## Context

Thousands of particles, each with a position that evolves every frame, following a flow field. Computing that on the CPU (a JS loop touching every particle, every frame) doesn't scale. This lesson moves the per-particle update onto the GPU.

---

## GPGPU

General-Purpose computing on GPU: using the GPU — normally dedicated to rendering pixels — to run arbitrary numeric computation instead.

For particles specifically: store each particle's state (position, velocity, whatever) as pixels in a texture, one pixel per particle. Write a fragment shader that computes the *next* state from the *current* state. The GPU runs that shader for every pixel in parallel, updating every particle in one pass.

---

## Flow field

A vector field: every point in space has a direction (and usually a magnitude) assigned to it, typically generated from noise (simplex/Perlin) so it varies smoothly instead of randomly jittering.

A particle "follows" the field by sampling the field's direction at its *own current position*, each frame, and nudging itself that way — not following a fixed, precomputed path.

---

## The core problem: persistence

The effect is expensive, and worse: particle positions need to **persist** across frames. This frame's output position has to become next frame's input. You can't recompute everything from nothing each frame — the simulation has state, and that state has to live somewhere the GPU can both read and write across frame boundaries.

---

## The solution: FBO (Framebuffer Object)

A secondary, invisible "canvas" the GPU renders into instead of the visible one. In Three.js, this is `THREE.WebGLRenderTarget`.

**Familiar analogy:** real-time reflections. A `WebGLCubeRenderTarget` + `CubeCamera` captures the live scene from a reflective object's position into a texture — that's how reflections show the *actual* moving objects around it, not just a static baked envmap frozen at bake time. Same underlying mechanism (render-to-texture instead of render-to-screen), different use case.

For particles: instead of relying on a geometry's `position` attribute directly, build a **second, fully offscreen scene** —

- An orthographic camera.
- A single plane filling the entire view.
- That plane's fragment shader computes/updates particle data and writes it as pixel color.

Read that render target back as a texture, and decode it: **RGB channels encode XYZ position**. That texture becomes the "position texture" fed into the real, visible particle `Points` object.

---

## Three problems FBOs introduce

### 1. Can't read and write the same FBO in one pass

A shader can't simultaneously sample a texture it's currently rendering into. Fix: **two render targets, ping-ponged**. Each frame, read from buffer A and write to buffer B, then swap which one is "current" for the next frame.

### 2. Pixel format and precision

A pixel isn't just one thing. Two separate questions:

- **Range/precision**: a standard texture is 8-bit per channel (0–255). Nowhere near enough for arbitrary float position data (negative values, fractions, large magnitudes). Needs a float-type texture (`FloatType`/`HalfFloatType`) — and not every GPU/context supports rendering to one without extensions.
- **Channel layout**: RGBA? RGB only? Just R? Depends on how many values per particle you're packing in.

### 3. Building blind

The FBO renders offscreen — there's no visual feedback into it directly. You build the whole simulation without seeing anything, and only find out if it worked once the output texture is wired into something visible. Common workaround: temporarily render the FBO's output texture onto a visible debug plane, or color-code particles by a value read from it, while building.

---

## What `GPUComputationRenderer` actually solves

Three.js ships `GPUComputationRenderer` (in `three/addons`) to manage this pattern. It solves:

- **Problem 1** — manages the ping-pong pair of render targets for you.
- **Problem 2** — picks a sensible, supported texture type/format automatically, checking renderer capabilities.

It does **not** solve **problem 3**. The blind-build workflow is still on you; the library gives no built-in visual debugging into the compute textures.
