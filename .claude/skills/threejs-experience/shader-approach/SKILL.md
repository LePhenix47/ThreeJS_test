---
name: shader-approach
description: Use when adding any custom shader behavior to a World entity — determines whether to use ShaderMaterial with .glsl files or onBeforeCompile injection based on whether PBR lighting must be preserved, and how to structure onBeforeCompile injections (shared helpers, shadow-matching, outline meshes) once Path B is chosen.
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

---

## Finding Injection Points

When you don't know which `#include <chunkName>` to patch, or in what order chunks run relative to `main()`, don't guess — read the actual Three.js shader source:

- `node_modules/three/src/renderers/shaders/ShaderLib/<material>.glsl.js` — shows the built-in material's full chunk order
- `node_modules/three/src/renderers/shaders/ShaderChunk/<name>.glsl.js` — shows an individual chunk's source

This is how `beginnormal_vertex`/`begin_vertex` get identified for a twist/deform effect on `MeshStandardMaterial`.

---

## Factor Repeated Injection Across Materials

When the same deformation must be patched into more than one material (e.g. a visible body material + its shadow/outline counterparts), extract two private helpers instead of duplicating the `.replace()` calls per material:

```typescript
/** Registers shared uniform refs on a shader's params object. Call at the top of every onBeforeCompile. */
private injectDeformUniforms = (
  params: THREE.WebGLProgramParametersWithUniforms,
): void => {
  params.uniforms.uTime = this.customUniforms.uTime;
  params.uniforms.uAmplitude = this.customUniforms.uAmplitude;
};

/**
 * Replaces #include <common> to declare shared uniforms + helper functions outside main().
 * @param extraUniforms - Optional extra GLSL uniform declarations only one material needs.
 */
private injectDeformCommonChunk = (
  params: THREE.WebGLProgramParametersWithUniforms,
  extraUniforms = "",
): void => {
  params.vertexShader = params.vertexShader.replace(
    /* glsl */ `#include <common>`,
    /* glsl */ `
    #include <common>
    uniform float uTime;
    uniform float uAmplitude;
    ${extraUniforms}
    `,
  );
};
```

Call both helpers first inside every `onBeforeCompile`, then add the material-specific `.replace()` for the chunk that actually needs the deformation applied.

---

## Shadow-Matched Deformation

If a vertex shader deforms a mesh's position, its cast shadow will not match unless a `MeshDepthMaterial` gets the *same* deformation injected via the same helpers:

```typescript
const shadowMaterial = new THREE.MeshDepthMaterial({
  depthPacking: THREE.RGBADepthPacking,
});
shadowMaterial.onBeforeCompile = (params) => {
  this.injectDeformUniforms(params);
  this.injectDeformCommonChunk(params);
  params.vertexShader = params.vertexShader.replace(
    /* glsl */ `#include <begin_vertex>`,
    /* glsl */ `#include <begin_vertex>\n/* apply deformation to transformed */`,
  );
};
mesh.customDepthMaterial = shadowMaterial;
```

---

## Inverted-Hull Outline

A cheap outline technique: a second mesh sharing the same geometry, `BackSide` material, vertex shader pushes each vertex outward along its normal by a thickness uniform.

```typescript
const outlineMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
outlineMaterial.onBeforeCompile = (params) => {
  params.uniforms.uOutlineThickness = this.customUniforms.uOutlineThickness;
  params.vertexShader = params.vertexShader.replace(
    /* glsl */ `#include <begin_vertex>`,
    /* glsl */ `
    #include <begin_vertex>
    transformed += normal * uOutlineThickness;
    `,
  );
};
const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
```
