import * as THREE from "three";

/**
 * Every JS value that can legally be assigned to a Three.js uniform.
 * Covers primitives, Three.js math objects, textures, typed arrays,
 * plain arrays, and recursive structs / arrays of structs.
 */
export type UniformValue =
  | number
  | boolean
  | THREE.Vector2
  | THREE.Vector3
  | THREE.Vector4
  | THREE.Color
  | THREE.Quaternion
  | THREE.Matrix3
  | THREE.Matrix4
  | THREE.Texture // ? covers Texture, CubeTexture, DataTexture, etc.
  | Float32Array
  | Int32Array
  | Array<number> // ? flat array for vec2/vec3/vec4/mat2/mat3/mat4
  | Array<THREE.Vector2> // ? array of vec2
  | Array<THREE.Vector3> // ? array of vec3
  | Array<THREE.Vector4> // ? array of vec4
  | Array<THREE.Color> // ? array of vec3 (color)
  | Array<THREE.Quaternion> // ? array of vec4
  | Array<THREE.Matrix3> // ? array of mat3
  | Array<THREE.Matrix4> // ? array of mat4
  | Array<THREE.Texture> // ? array of samplers
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
