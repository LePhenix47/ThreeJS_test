import * as THREE from "three";

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
export type MapAsUniforms<T extends object> = {
  [K in keyof T]: THREE.IUniform<T[K]>;
};

export type TypedRawShaderMaterial<TUniforms extends object> =
  THREE.RawShaderMaterial & {
    uniforms: TUniforms;
  };

/** A `THREE.ShaderMaterial` with `uniforms` autocompletion and types */
export type TypedShaderMaterial<TUniforms extends object> =
  THREE.ShaderMaterial & {
    uniforms: TUniforms;
  };
