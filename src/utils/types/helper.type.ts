/**
 * Utility type that filters out all function properties from a type.
 * Useful for extracting only data properties (non-methods, non-functions) from classes or objects.
 *
 * @example
 * type DataOnly = NonFunctionProperties<SomeClass>;
 */
export type NonFunctionProperties<T extends object> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

/**
 * Widens a literal union to `string` while keeping editor autocomplete for
 * the known literal members. `T | string` alone would collapse to plain
 * `string` and lose the suggestions — intersecting with `{}` stops that
 * collapse without changing what's actually accepted at runtime.
 *
 * @example
 * type Mode = LooseAutocomplete<"development" | "production">;
 */
export type LooseAutocomplete<T extends string> = T | (string & {});

/** A JSON-serializable, GUI/storage-friendly scalar — the only value shapes lil-gui controls and sessionStorage persistence can round-trip. */
export type Primitive = string | number | boolean;
