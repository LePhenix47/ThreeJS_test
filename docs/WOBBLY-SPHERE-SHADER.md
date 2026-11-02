# Wobbly Sphere Shader

How `WobblyGroup` turns a plain `MeshPhysicalMaterial` into a noise-displaced, audio-reactive blob without losing PBR lighting.

---

## 1. Why CustomShaderMaterial

A vanilla `THREE.ShaderMaterial` gives you a blank slate: no lighting, no shadows, nothing. You'd have to reimplement PBR yourself to get the same look as `MeshPhysicalMaterial`.

`CustomShaderMaterial` (CSM) splices your GLSL into three.js's own generated shader for a real material, so you keep its lighting/transmission/metalness logic and only hook in at specific points:

```ts
this.material = new CustomShaderMaterial({
  baseMaterial: THREE.MeshPhysicalMaterial,
  vertexShader,
  fragmentShader,
  uniforms: this.uniforms,
  color, metalness, roughness, transmission, ior, thickness,
});
```

**Why:** get the wobble effect without rebuilding PBR from scratch.

---

## 2. Shadows need their own displaced geometry

Shadow maps render depth in a separate pass, using whichever material is assigned as `customDepthMaterial`. Left at the default, that pass renders the mesh's original, flat geometry, so the shadow's silhouette doesn't match the wobbled surface you actually see.

Fix: give the mesh a depth material that runs the *same* vertex shader, so the depth pass displaces vertices identically to the visible one:

```ts
private setDepthMaterial(): void {
  this.depthMaterial = new CustomShaderMaterial({
    baseMaterial: THREE.MeshDepthMaterial,
    vertexShader,
    uniforms: this.uniforms,
    depthPacking: THREE.RGBADepthPacking,
  }) as unknown as THREE.Material;
}
```

**Why:** the shadow pass and the visible pass must agree on where the surface actually is.

---

## 3. mergeVertices + computeTangents

`THREE.IcosahedronGeometry` is non-indexed: every triangle owns its own three vertices, nothing shared between triangles. `computeTangents()` needs an index to know which triangles share a vertex, same requirement as normal averaging. Without one, it can't run.

```ts
const geometry = new THREE.IcosahedronGeometry(radius, detail);

// IcosahedronGeometry is NOT indexed so we can't get the tangent & bit-tangent
// without indexing, we have duplicate vertices, to make it indexed → mergeVertices
const indexedGeometry = mergeVertices(geometry);
indexedGeometry.computeTangents();
```

**Why:** `mergeVertices()` collapses the duplicate verts into one indexed geometry, which is the only thing that makes `computeTangents()` possible at all. Costly (vertex-count dependent), so it's a one-time setup step, not something run per frame.

---

## 4. Recomputing the normal after displacement

Displacement happens in the vertex shader, on the GPU, every frame. The geometry's baked-in normal attribute has no idea the surface moved, so it goes stale the instant you displace a vertex.

Fix: sample two more points near the current one, along the surface's own local directions (`tangent` and its perpendicular, `bitangent`), displace those too, then cross the resulting direction vectors to get a normal that reflects the actual wobbled surface:

```glsl
vec3 computeSphereNormal(vec3 originalPosition, vec3 changedPosition, float shift) {
    vec3 bitTangent = cross(normal, tangent.xyz);

    vec3 originA = originalPosition + tangent.xyz * shift;
    vec3 originB = originalPosition + bitTangent.xyz * shift;
    originA += getWobble(originA) * normal;
    originB += getWobble(originB) * normal;

    vec3 toA = direction(changedPosition, originA);
    vec3 toB = direction(changedPosition, originB);

    return cross(toA, toB);
}
```

The two offsets are **not** arbitrary world-axis nudges (`+ vec3(shift, 0, 0)`). `tangent`/`bitangent` live in the surface's local tangent plane at that exact vertex, so the technique works the same on a tilted face of Suzanne as on the top of the sphere, no matter how that patch of surface is oriented. That's also why this isn't actually sphere-specific: it only needs a `tangent` attribute and the same displacement function, nothing about closed topology.

**Why:** the only way to get a correct normal for a GPU-displaced surface is to re-derive it from nearby displaced points, not from the original static geometry.

---

## 5. Displacing along the normal

The baseline move-a-vertex equation:

```
attrPos = pos + displacement * normal
```

`displacement` here is `getWobble(position)`, a scalar. Multiplying by `normal` turns that scalar into a push outward (or inward) along the surface's own facing direction, so the bump reads as part of the surface instead of a random offset:

```glsl
float wobble = getWobble(originalPosition);
csm_Position = originalPosition + wobble * normal;
```

**Why:** displacing along the normal is what makes noise look like surface deformation instead of noise.

---

## 6. Noise applied twice (domain warping)

`getWobble()` calls `simplexNoise4d()` twice, chained:

```glsl
float getWobble(vec3 position) {
    vec3 warpedPosition = position;

    warpedPosition += simplexNoise4d(vec4(
        warpedPosition * uWarpPositionFrequency,
        uTime * uWarpTimeFrequency
    )) * (uWarpStrengthAmplitude + uAudioFrequency);

    vec4 noisedPosition = vec4(
        warpedPosition * uPositionFrequency,
        uTime * uTimeFrequency
    );

    float wobble = simplexNoise4d(noisedPosition) * getStrengthAmplitude();
    return wobble;
}
```

First call warps the sample position itself. Second call samples noise *at that warped position* for the final wobble value. This is domain warping: it breaks up the regular look a single noise call would give, at the cost of an extra noise evaluation.

Worth knowing: `computeSphereNormal` calls `getWobble()` twice more (for `originA` and `originB`), so each vertex runs `getWobble()` three times per frame, six noise samples total. Not a bug, just the price of the normal-recompute trick.

**Why:** one noise call gives smooth, predictable bumps. Warping the input first gives the organic, less-uniform look the effect is going for.

---

## 7. Fragment color remap

`vWobble` comes out of the vertex shader roughly in `[-1, 1]` (noise's natural range, un-scaled back down by the same amplitude it was scaled up by):

```glsl
vWobble = wobble / getStrengthAmplitude();
```

The fragment shader turns that into a color pick:

```glsl
float colorMix = smoothstep(-1.0, 1.0, vWobble);
vec3 color = mix(uLowColor, uHighColor, colorMix);
csm_DiffuseColor.rgb = color;
```

`smoothstep(-1.0, 1.0, vWobble)` remaps `[-1, 1]` to `[0, 1]` with an S-curve (not a linear remap), then `mix()` uses that `0-1` value to blend between the two gradient colors.

**Why:** ties surface color directly to how displaced that point currently is, low points one color, high points the other.

---

## 8. csm_* outputs instead of raw GLSL

CSM injects your code into three's generated `main()` before assembling the final output, so you write to `csm_Position`, `csm_Normal`, `csm_DiffuseColor` instead of `gl_Position`, a raw `normal` write, or a direct color assignment:

```glsl
csm_Position = originalPosition + wobble * normal;
csm_Normal = computedNormal;
csm_DiffuseColor.rgb = color;
```

**Why:** CSM owns final shader assembly (lighting, PBR, tone mapping). Writing to three's native outputs directly would get silently overwritten or skip the lighting pipeline entirely.
