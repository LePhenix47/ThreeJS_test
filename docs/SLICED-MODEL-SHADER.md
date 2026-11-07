# Sliced Model Shader

## Checking if an angle sits inside the slice

```glsl
float angle = atan(vPosition.y, vPosition.x) + PI;

bool isWithinSliceArea(float angle, float offset, float stop) {
    float end = offset + stop;

    if (end <= TAU) {
        // * Normal slice (doesn't cross the boundary)
        return angle >= offset && angle <= end;
    }

    // * The slice wraps around the 0/2π boundary
    float wrappedEnd = mod(end, TAU);
    return angle >= offset || angle <= wrappedEnd;
}
```

**Why:** `atan(y, x)` returns an angle in `[-π, π]`. Shifting by `PI` remaps it to `[0, 2π]`, matching the range `uSliceStart`/`uSliceArc` are expressed in. A slice spanning `[offset, offset + stop]` is a plain range check as long as it stays under `2π`. Once `offset + stop` goes past `2π`, the slice wraps across the same seam `atan` jumps across at `0`/`2π`, so the check flips from "between offset and end" to "past offset, OR before the wrapped end".

---

## patchMap — reaching into the base material's own shader

```ts
private patchMap = {
  csm_SliceUniform: {
    // ? "uniform" only legal at global scope, "#include <common>" sits before main(), unlike <colorspace_fragment>
    "#include <common>": /* glsl */ `
          #include <common>
          uniform vec3 uGapFillColor;
      `,
  },
  csm_Slice: {
    "#include <colorspace_fragment>": /* glsl */ `
          #include <colorspace_fragment>

          if(!gl_FrontFacing)
              gl_FragColor = vec4(uGapFillColor, 1.0);
      `,
  },
};
```

**Why:** `CustomShaderMaterial`'s own `vertexShader`/`fragmentShader` only replace the entry point of the base material's generated shader (`csm_Position`, `csm_DiffuseColor`, …). `patchMap` does a literal find-and-replace against the base material's full generated source, so it can inject code around any `#include <chunk>` in there. A `uniform` declaration is only legal at global scope, and `#include <colorspace_fragment>` sits inside `main()`, so declaring `uGapFillColor` there throws `'uniform' : only allowed at global scope`. Splitting the patch in two fixes it: the declaration goes on `#include <common>` (runs before `main()`), the actual usage, flattening the color to `uGapFillColor` whenever the fragment is back-facing (the camera looking at the inside wall through the slice), stays on `colorspace_fragment`, right before the final pixel color is written.

---

## Shadows not following the sliced silhouette

```ts
protected setSlicedDepthMaterial() {
  this.slicedDepthMaterial = new CustomShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: slicedVertexShader,
    fragmentShader: slicedFragmentShader,
    baseMaterial: THREE.MeshDepthMaterial,
    patchMap: this.patchMap,
  }) as SliceModelDepthMaterialType;
}

// setModel():
child.customDepthMaterial = this.slicedDepthMaterial;
```

**Why:** three.js renders shadow maps with a separate depth-only pass, using `MeshDepthMaterial` by default or `child.customDepthMaterial` when one is set. That pass never sees the color fragment shader's `discard`, so without a matching depth material, the shadow map renders the model's full, unsliced depth, the shadow keeps the original silhouette even though the visible mesh has a gap cut into it. Giving the depth pass its own `CustomShaderMaterial`, same vertex/fragment shaders, same uniforms, same discard logic, makes it drop the exact same fragments, so the shadow's gap lines up with the visible slice.
