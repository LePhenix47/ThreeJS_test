# GLSL Primer

- [GLSL Primer](#glsl-primer)
  - [What is GLSL](#what-is-glsl)
  - [The Pipeline](#the-pipeline)
  - [Primitives](#primitives)
  - [Vertex Buffer (VBO)](#vertex-buffer-vbo)
  - [Data Types](#data-types)
    - [`uniform`](#uniform)
    - [`attribute`](#attribute)
    - [`varying`](#varying)
  - [Data Flow Summary](#data-flow-summary)
  - [RawShaderMaterial vs ShaderMaterial](#rawshadermaterial-vs-shadermaterial)
  - [Matrix Chain (vertex shader)](#matrix-chain-vertex-shader)


## What is GLSL

**GLSL** = OpenGL Shading Language. Language written for the GPU, not the CPU.
Syntax like C. Runs in parallel — same function, every vertex or pixel simultaneously.
WebGL uses a subset of GLSL ES (Embedded Systems variant).

---

## The Pipeline

CPU sends geometry + data to GPU. GPU processes in stages:

```
CPU (JS/Three.js)
  ↓ vertices, attributes, uniforms
Vertex Buffer       ← VRAM, passes data from CPU to GPU
  ↓ positions, color & geometry
Vertex Shader       ← runs once per vertex, in parallel
  ↓ gl_Position (clip space coords), varyings
Rasterization       ← GPU interpolates between vertices automatically
  ↓ internal GPU step, fragments (candidate pixels) + interpolated varyings
Fragment Shader     ← runs once per fragment, in parallel
  ↓ gl_FragColor (final pixel color)
Framebuffer → screen
```

---

## Primitives

**Vertex** — a point in 3D space. Plane 32×32 = 1089 vertices.

**Fragment** — candidate pixel between vertices after rasterization.
Not 1:1 with screen pixels — one screen pixel may have multiple fragments.

---

## Vertex Buffer (VBO)

Before any shader runs, geometry data lives in **Vertex Buffer Objects** (VBOs) — blocks of memory uploaded from CPU RAM to GPU VRAM.

Each VBO stores one **attribute** — position, normal, UV, color, or custom data.
Layout is a flat array of floats. The GPU reads it per-vertex during the vertex stage.

In Three.js, `BufferAttribute` maps directly to a VBO:

```ts
// 3 floats per vertex (vec3) — position
geometry.attributes.position // THREE auto-creates this

// 1 float per vertex — custom random value
const data = new Float32Array(vertexCount);
geometry.setAttribute("aRandom", new THREE.BufferAttribute(data, 1));
//                                                               ^ itemSize (floats per vertex)
```

In the vertex shader, `attribute` variables read from VBOs — one value per vertex invocation:

```glsl
attribute vec3 position;   // built-in, uploaded by Three.js
attribute float aRandom;   // custom, uploaded manually
```

**Key:** attributes are GPU-side read-only during render. To update, call `attribute.needsUpdate = true` after mutating the JS array.

---

## Data Types

### `uniform`
- Set from CPU (JS), same value for every vertex and fragment
- Read-only in shader
- Available in **both** vertex and fragment shader
- Examples: `uTime`, `uColor`, `uFrequency`

```glsl
uniform float uTime;
uniform vec3 uColor;
```

### `attribute`
- Per-vertex data, set from CPU via `BufferAttribute`
- **Vertex shader only** — not accessible in fragment shader
- Each vertex gets its own value
- Examples: `position`, `uv`, `aRandom`

```glsl
attribute vec3 position;
attribute float aRandom;
```

### `varying`
- Bridge from vertex → fragment shader
- Vertex shader writes it, fragment shader reads it
- GPU **interpolates** the value between vertices automatically
- Name must match exactly in both shaders

```glsl
// vertex shader — write
varying float vRandom;
void main() {
    vRandom = aRandom;
}

// fragment shader — read (interpolated)
varying float vRandom;
void main() {
    gl_FragColor = vec4(vRandom, 0.0, 0.0, 1.0);
}
```

---

## Data Flow Summary

```
JS (CPU)
  uniforms ──────────────────→ vertex shader
  uniforms ──────────────────→ fragment shader
  attributes (BufferAttribute) → vertex shader only

vertex shader
  varyings ──────────────────→ fragment shader (interpolated)
  gl_Position ───────────────→ rasterizer
```

---

## RawShaderMaterial vs ShaderMaterial

|                                          | `RawShaderMaterial` | `ShaderMaterial` |
| ---------------------------------------- | ------------------- | ---------------- |
| Precision declaration                    | Manual              | Auto-injected    |
| Built-in uniforms (modelViewMatrix etc.) | Manual              | Auto-injected    |
| Control                                  | Full                | Partial          |

With `RawShaderMaterial`, declare everything yourself. With `ShaderMaterial`, Three.js injects boilerplate.

---

## Matrix Chain (vertex shader)

```glsl
// modelMatrix    — object local → world space
// viewMatrix     — world → camera space
// projectionMatrix — camera → clip space

// Option A: Three.js shortcut (modelViewMatrix = viewMatrix * modelMatrix)
gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

// Option B: explicit (same result)
gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
```

Order is right-to-left. Matrix mult is non-commutative — wrong order = wrong result.
