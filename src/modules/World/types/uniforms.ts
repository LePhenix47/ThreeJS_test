import * as THREE from "three";

/**
 * A single, non-array JavaScript value that can legally be assigned to a
 * Three.js uniform's value.
 *
 * Maps to GLSL scalars, vectors, matrices and samplers:
 * - `number`            → `int` / `uint` / `float`
 * - `boolean`           → `bool`
 * - `THREE.Vector2/3/4` → `vec2` / `vec3` / `vec4`
 * - `THREE.Color`       → `vec3`
 * - `THREE.Quaternion`  → `vec4`
 * - `THREE.Matrix3/4`   → `mat3` / `mat4`
 * - `THREE.Texture`     → `sampler2D` / `samplerCube` (also covers
 *                         `CubeTexture`, `DataTexture`, `CompressedTexture`, …)
 * - `Float32Array`      → `vec*` / `mat*` (flat)
 * - `Int32Array`        → `ivec*` / `bvec*` (flat)
 */
type UniformTypes =
  | number
  | boolean
  | THREE.Vector2
  | THREE.Vector3
  | THREE.Vector4
  | THREE.Color
  | THREE.Quaternion
  | THREE.Matrix3
  | THREE.Matrix4
  | THREE.Texture
  | Float32Array
  | Int32Array;

/**
 * Distributes `Array<…>` over a union, producing the union of array types
 * for each member. `never` for anything outside {@link UniformTypes}.
 *
 * @example
  ToUniformTypeArray<THREE.Vector3 | number>
  // => Array<THREE.Vector3> | Array<number>
 */
type ToUniformTypeArray<T extends unknown> = T extends UniformTypes
  ? Array<T>
  : never;

/**
 * The subset of {@link UniformTypes} that is legal to use as the element
 * type of an array uniform.
 *
 * Excludes:
 * - `Float32Array` / `Int32Array` — already flat buffers; arrays of them are
 *   not valid uniform values.
 * - `boolean` — `bvec` arrays are supplied as `Int32Array`, not `Array<boolean>`.
 */
type ArrayableUniformType = Exclude<
  UniformTypes,
  Float32Array | Int32Array | boolean
>;

/**
 * Every JS value that can legally be assigned to a Three.js uniform.
 * Covers primitives, Three.js math objects, textures, typed arrays,
 * plain arrays, and recursive structs / arrays of structs.
 */
export type UniformValue =
  | UniformTypes
  | ToUniformTypeArray<ArrayableUniformType>
  | { [key: string]: UniformValue } // ? struct
  | Array<{ [key: string]: UniformValue }>; // ? array of structs

/**
 * Wraps every property of a plain value-map in `THREE.IUniform<T>`, so `material.uniforms.uX.value`
 * autocompletes and type-checks instead of falling back to `THREE.ShaderMaterial`'s untyped
 * `{ [uniform: string]: IUniform<any> }` index signature. Write the raw per-uniform value types
 * once, wrap the whole object with this instead of hand-typing `IUniform<T>` per key.
 *
 * @example
 * type FireworkUniforms = MapAsUniforms<{
 *   uColor: THREE.Color;
 *   uProgress: number;
 * }>;
 *
 * private material: TypedShaderMaterial<FireworkUniforms>;
 */
export type MapAsUniforms<T extends UniformValue> = {
  [K in keyof T]: THREE.IUniform<T[K]>;
};

export type TypedRawShaderMaterial<
  TUniforms extends MapAsUniforms<UniformValue>,
> = THREE.RawShaderMaterial & {
  uniforms: TUniforms;
};

/** A `THREE.ShaderMaterial` with `uniforms` autocompletion and types */
export type TypedShaderMaterial<TUniforms extends MapAsUniforms<UniformValue>> =
  THREE.ShaderMaterial & {
    uniforms: TUniforms;
  };
