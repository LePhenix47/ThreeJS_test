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
