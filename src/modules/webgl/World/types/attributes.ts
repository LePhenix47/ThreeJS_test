import * as THREE from "three";

type StandardAttributeKeys = "position" | "color" | "uv" | "normal";

/**
 * Minimal, hand-maintained map of the standard/built-in Three.js attribute names this codebase
 * actually touches as values (read or write), to their `THREE.BufferAttribute` type.
 *
 * Deliberately NOT exhaustive — three.js defines many more standard attribute names (`uv1`, `uv2`,
 * `skinIndex`, `skinWeight`, morph targets, `tangent`, …), and three's own types don't expose any
 * canonical list of them to begin with. Add a slot here only once a real entity reads or writes it;
 * growing this list ahead of actual use just duplicates three's internals for no payoff. `normal` is
 * intentionally omitted: current usage only ever calls `geometry.deleteAttribute("normal")`, which
 * doesn't need the map to know the value's type.
 *
 * Use `Pick<StandardAttributes, ...>` to declare only the slots a given entity actually uses,
 * unioned with that entity's own custom attribute names. Mirrors `EntityTexture` in `mesh-entity.ts`.
 */
export type StandardAttributes = Record<
  StandardAttributeKeys,
  THREE.BufferAttribute
>;

/**
 * Maps a union of attribute names to `THREE.BufferAttribute`, so `geometry.attributes.x` /
 * `geometry.setAttribute("x", ...)` autocompletes and type-checks against a closed set of names
 * instead of falling back to `THREE.BufferGeometry`'s default `NormalBufferAttributes`
 * (`Record<string, BufferAttribute | InterleavedBufferAttribute>`).
 *
 * Unlike {@link MapAsUniforms "uniforms.ts"}, an attribute's stored value is always a plain
 * `THREE.BufferAttribute` regardless of itemSize — there's no per-key value-shape distinction to
 * preserve (TS can't encode itemSize at the type level), so this takes a plain name union, not a
 * value-map, there's nothing for per-key values to carry.
 *
 * @example
 * type MorphParticlesAttributes = MapAsAttributes<"position" | "aPositionTarget">;
 *
 * protected geometry: TypedBufferGeometry<MorphParticlesAttributes>;
 */
export type MapAsAttributes<TKeys extends string> = Record<
  TKeys,
  THREE.BufferAttribute
>;

/**
 * A `THREE.BufferGeometry` with `attributes`/`setAttribute`/`getAttribute` narrowed to a specific,
 * named set of attribute slots. Thin alias over three's own `Attributes` generic — unlike
 * `TypedShaderMaterial`, no intersection hack is needed, `BufferGeometry` is already natively
 * generic over its attributes map.
 */
export type TypedBufferGeometry<
  TAttributes extends Record<string, THREE.BufferAttribute>,
> = THREE.BufferGeometry<TAttributes>;
