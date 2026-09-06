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

For a non-primitive value (`THREE.Color`, `THREE.Vector2/3/4`, a texture), use the `{ value: ... }` object literal, not `new THREE.Uniform(...)`. A constructor call nested inside another constructor call reads worse than a plain object property:

```typescript
// ✅ { value } — the constructor call reads as one thing, not nested inside another
uColor: { value: new THREE.Color(color) },
uLightPosition: { value: new THREE.Vector3(x, y, z) },

// ❌ new THREE.Uniform(...) wrapping a non-primitive constructor call
uColor: new THREE.Uniform(new THREE.Color(color)),
uLightPosition: new THREE.Uniform(new THREE.Vector3(x, y, z)),
```

Both compile to the exact same shape (`THREE.Uniform` is just `{ value }` with a constructor), this is purely a readability rule. Primitive values (`number`, `boolean`) can use either — `new THREE.Uniform(x)` or `{ value: x }` — no nested-constructor problem there.

---

## Type-Safe Uniforms with TypedShaderMaterial

`THREE.ShaderMaterial` isn't generic over its `uniforms` shape, so `material.uniforms.uColor.value` has no autocomplete or type-checking by default. Use the two generic helpers in `src/modules/World/types/uniforms.ts`:

```typescript
export type MapAsUniforms<T extends object> = {
  [K in keyof T]: THREE.IUniform<T[K]>;
};
export type TypedShaderMaterial<TUniforms extends object> = THREE.ShaderMaterial & {
  uniforms: TUniforms;
};
```

Declare the uniforms shape once, build the object literal as its own annotated `const`, then cast the material:

```typescript
type MyUniforms = MapAsUniforms<{
  uTime: number;
  uColor: THREE.Color;
}>;

protected material: TypedShaderMaterial<MyUniforms>;

protected setMaterial(): void {
  const uniforms: MyUniforms = {
    uTime: new THREE.Uniform(0),
    uColor: { value: new THREE.Color(color) },
  };

  this.material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  }) as TypedShaderMaterial<MyUniforms>;
}
```

**The separate `const uniforms: MyUniforms = {...}` is required, not optional style.** `new THREE.ShaderMaterial({...})`'s own `uniforms` parameter is typed against Three.js's loose `{[key: string]: IUniform<any>}`. Building the object literal inline inside the constructor call, then casting the whole material afterward with `as TypedShaderMaterial<MyUniforms>`, only fixes typing for later *usage* — the literal itself is never checked against `MyUniforms`, so a typo'd key or wrong value type at the *definition* site compiles clean and only breaks at runtime. Assigning to the annotated `const` first catches that at compile time, before the unconditional cast ever happens.

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
