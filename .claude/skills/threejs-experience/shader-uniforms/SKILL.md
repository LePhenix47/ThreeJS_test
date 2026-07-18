---
name: shader-uniforms
description: Use when declaring or updating uniforms in any ShaderMaterial or onBeforeCompile material — covers naming convention, per-frame update, shared uniform refs across multiple materials, and pixel ratio.
metadata:
  type: reference
---

# Shader Uniforms

## Naming Convention

All uniform names are prefixed with `u`: `uTime`, `uSize`, `uFrequency`, `uAmplitude`, `uOffset`.

---

## Declaring Uniforms in ShaderMaterial

```typescript
protected setMaterial = (): void => {
  const { size } = this.debugDefaults;

  this.material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size * this.renderer.rendererPixelRatio },
    },
  });
};
```

Use `this.renderer.rendererPixelRatio` for point size uniforms — not `window.devicePixelRatio`.

---

## Per-Frame Update in update()

```typescript
public update = (): void => {
  this.material.uniforms.uTime.value = this.time.elapsedSeconds;
};
```

Access time via `private get time() { return this.experience!.time; }`.

---

## Shared Uniforms Across Multiple Materials

When the same uniform must stay in sync across several materials (e.g. Human — body + shadow + outline):

```typescript
// Class property — single object, all materials reference the same { value } wrapper
protected readonly customUniforms: THREE.ShaderMaterialProperties["uniforms"] = {
  uTime: { value: 0 },
  uAmplitude: { value: 0.5 },
  uFrequency: { value: 0 },
};

// In each onBeforeCompile — assign by reference, not by value copy
material.onBeforeCompile = (params) => {
  params.uniforms.uTime = this.customUniforms.uTime;       // shared ref
  params.uniforms.uAmplitude = this.customUniforms.uAmplitude;
};

// In update() — single write updates all materials
public update = (): void => {
  this.customUniforms.uTime.value = this.time.elapsedSeconds;
};
```

Assigning `params.uniforms.uTime = this.customUniforms.uTime` shares the `{ value }` object by reference. Mutating `.value` propagates to every material that holds that ref — no need to update each material separately.

---

## GUI-Controlled Uniforms

Bind GUI changes directly to the uniform value:

```typescript
registry.bind("frequency", (v) => {
  this.customUniforms.uFrequency.value = v;
});

registry.bind("size", (v) => {
  this.material.uniforms.uSize.value = v * this.renderer.rendererPixelRatio;
});
```
