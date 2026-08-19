---
name: shader-uniforms
description: Use when declaring or updating uniforms in any ShaderMaterial or onBeforeCompile material. Covers naming convention, per-frame update, shared uniform refs across multiple materials, and pixel ratio.
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

Use `this.renderer.rendererPixelRatio` for point size uniforms. Not `window.devicePixelRatio`.

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

When the same uniform must stay in sync across several materials (e.g. Human. Body + shadow + outline):

```typescript
// Class property. Single object, all materials reference the same { value } wrapper
protected readonly customUniforms: THREE.ShaderMaterialProperties["uniforms"] = {
  uTime: { value: 0 },
  uAmplitude: { value: 0.5 },
  uFrequency: { value: 0 },
};

// In each onBeforeCompile. Assign by reference, not by value copy
material.onBeforeCompile = (params) => {
  params.uniforms.uTime = this.customUniforms.uTime;       // shared ref
  params.uniforms.uAmplitude = this.customUniforms.uAmplitude;
};

// In update(). Single write updates all materials
public update = (): void => {
  this.customUniforms.uTime.value = this.time.elapsedSeconds;
};
```

Assigning `params.uniforms.uTime = this.customUniforms.uTime` shares the `{ value }` object by reference. Mutating `.value` propagates to every material that holds that ref. No need to update each material separately.

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

---

## Tweening a Uniform with GSAP

To animate a uniform over time outside the per-frame `update()` loop, tween `.value` directly with `gsap.to()`. Keep the tween reference on the instance and kill it in `destroy()`.

```typescript
private readonly animationTween: GSAPTween;

constructor() {
  // ...
  this.animationTween = gsap.to(this.material.uniforms.uProgress, {
    value: 1,
    duration: 3,
    onComplete: this.onComplete,
  });
}

public destroy(): void {
  this.animationTween.kill();
}
```

---

## Resize-Reactive Uniforms

Any uniform derived from canvas size (`uResolution`, aspect-dependent point scaling) must resubscribe on resize and recompute. Setting it once in `setMaterial()` is not enough, since the value goes stale the moment the window changes size.

```typescript
constructor() {
  // ...
  this.sizes.on("resize", this.onResize);
}

private onResize = (): void => {
  const { width, height, pixelRatio } = this.sizes;
  this.material.uniforms.uResolution.value = new THREE.Vector2(
    width * pixelRatio,
    height * pixelRatio,
  );
};

public destroy(): void {
  this.sizes.off("resize", this.onResize);
}
```
