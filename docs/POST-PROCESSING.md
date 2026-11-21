# Post-processing

Concepts from the Three.js Journey post-processing lesson, as implemented in this project's `PostProcessing.ts` and `three/passes/`.

## Why a render target instead of the canvas

Post-processing doesn't touch the canvas directly. The scene renders onto a render target first, basically a texture holding a 3D projection of the world, then each effect reads that texture, modifies it, and writes the result to another texture. Repeat per pass.

That's ping-pong buffering: two render targets, one read, one write, swapping roles after each pass (similar in spirit to GPGPU techniques). `EffectComposer` really does use exactly two (`renderTarget1`/`renderTarget2`, the second a clone of the first), confirmed by reading its source.

`EffectComposer` hides all of this. You never manage the targets yourself.

## EffectComposer replaces direct rendering

Normally the renderer draws the scene every tick. With post-processing, a `RenderPass` (wrapping scene + camera) gets added to the composer instead, and the composer renders every tick, not the renderer directly.

Oddity worth noting: the renderer still needs its own resize logic on window resize, even though the composer also gets resized. Skipping the renderer's resize causes aspect ratio bugs, even though the composer looks like it should own that responsibility alone.

The composer itself only takes a renderer and an optional render target; it needs size and pixel ratio set on it directly (`composer.setSize()`, `composer.setPixelRatio()`). Scene and camera aren't passed to the composer at all, they're what the `RenderPass` added to it needs, since that pass is the one doing the actual scene render.

Resizing the composer doesn't resize the renderer itself. Both need their own `setSize()` call on resize, missing either one causes aspect ratio bugs.

## Color space fix (gamma pass)

The composer's output is linear RGB. The canvas expects sRGB. Without a fix, colors look washed out or wrong.

Fix: add a `GammaCorrectionShader` pass. It must be the last shader pass in the chain, since it's converting the final color, not an intermediate one.

## Anti-aliasing breaks, and has to be added back

Rendering to a texture instead of directly to the canvas bypasses the browser's default edge anti-aliasing. Jagged edges on 3D geometry show up again.

Two ways to bring it back, depending on support:

- **MSAA**, via a `WebGLRenderTarget` created with a `samples` option, passed into the `EffectComposer` constructor. Needs WebGL2. The GPU resolves the multisampling automatically, no extra pass needed.
- **SMAA** (or similar), as a regular post-processing pass (`SMAAPass`) added after the gamma pass, for when WebGL2/MSAA isn't available.

MSAA and SMAA are different techniques, not interchangeable names for the same thing. Anti-aliasing in general is a tradeoff between performance and visual accuracy; SMAA is a reasonable middle ground when MSAA isn't an option.

## Custom shader passes

A custom pass is a trimmed-down `ShaderMaterial`: uniforms, a vertex shader (mostly just forwarding attributes to the fragment shader), and a fragment shader (where the actual effect happens).

The previous pass's rendered image comes in through `tDiffuse`. You declare it as an empty placeholder texture uniform; the `EffectComposer` fills it in automatically with the prior pass's output before rendering. The standard `vUv` varying works exactly like it does on a regular mesh.

## Cost

Each added pass is a full extra render. Passes aren't free, use them deliberately, not reflexively.
