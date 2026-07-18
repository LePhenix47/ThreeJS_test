---
name: shader-approach
description: Use when adding any custom shader behavior to a World entity — determines whether to use ShaderMaterial with .glsl files or onBeforeCompile injection based on whether PBR lighting must be preserved.
metadata:
  type: reference
---

# Shader Approach

## Decision

```
Does the entity need Three.js PBR lighting / shadows / depth pass?
  NO  → Path A: ShaderMaterial + separate .glsl files
  YES → Path B: onBeforeCompile + inline GLSL strings  ⚠️ painful, may evolve
```

---

## Path A: ShaderMaterial (no PBR needed)

**Applies to:** standalone geometry with full custom shader — ShaderPlane, Galaxy particles, CoffeeSmoke smoke mesh

You write every line of vertex + fragment. PBR lighting is not available.

### File structure

```
src/shaders/
  <lesson-name>/
    vertex.glsl
    fragment.glsl
```

### Import + use

```typescript
import vertexShader from "@shaders/coffee-smoke/vertex.glsl";
import fragmentShader from "@shaders/coffee-smoke/fragment.glsl";

this.smokeMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: { uTime: { value: 0 } },
  transparent: true,
  depthWrite: false,
});
```

**NEVER inline GLSL strings in a `ShaderMaterial`. Always separate `.glsl` files via `@shaders/`.**

- `vite.config.ts`: `glsl()` plugin already configured
- `tsconfig.json`: `"@shaders/*": ["./src/shaders/*"]` alias + `"types": ["vite-plugin-glsl/ext"]`

---

## Path B: onBeforeCompile (keep PBR)

⚠️ **Current approach — known to be painful.** `onBeforeCompile` is Three.js's only hook into its built-in shader compilation pipeline. String-patching shader source is fragile and hard to read. This pattern may be replaced in future lessons. Do not treat it as the ideal solution — it's just the current one.

**Applies to:** GLTF model that must keep Three.js PBR lighting, shadows, env maps (e.g. Human)

Inline GLSL inside `.ts` is correct here. Use `/* glsl */` tagged comments for syntax highlighting:

```typescript
material.onBeforeCompile = (params: THREE.WebGLProgramParametersWithUniforms) => {
  // Inject uniforms into the params object first
  params.uniforms.uTime = this.customUniforms.uTime;

  // Patch #include <common> — outside main() — for function definitions + uniform declarations
  params.vertexShader = params.vertexShader.replace(
    /* glsl */ `#include <common>`,
    /* glsl */ `
    #include <common>
    uniform float uTime;
    mat2 get2dRotationMatrix(float angle) { ... }
    `,
  );

  // Patch #include <beginnormal_vertex> — inside main() — to rotate objectNormal (affects lighting)
  params.vertexShader = params.vertexShader.replace(
    /* glsl */ `#include <beginnormal_vertex>`,
    /* glsl */ `
    #include <beginnormal_vertex>
    objectNormal.xz = rotatedMatrix * objectNormal.xz;
    `,
  );

  // Patch #include <begin_vertex> — inside main() — to mutate transformed (vertex position)
  params.vertexShader = params.vertexShader.replace(
    /* glsl */ `#include <begin_vertex>`,
    /* glsl */ `
    #include <begin_vertex>
    transformed.xz = rotatedMatrix * transformed.xz;
    `,
  );
};
```

**No separate `.glsl` files for onBeforeCompile injections.**

### Key injection chunks

| Chunk | Location | Purpose |
|---|---|---|
| `#include <common>` | Outside `main()` | Function definitions, uniform declarations |
| `#include <beginnormal_vertex>` | Inside `main()` | Rotate `objectNormal` — affects lighting |
| `#include <begin_vertex>` | Inside `main()` | Mutate `transformed` — vertex position |

`beginnormal_vertex` runs before `begin_vertex` — declare variables (angle, matrix) in `beginnormal_vertex`, reuse in `begin_vertex`. Declaring in both = redefinition compile error.
