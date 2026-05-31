type IterateStr<S extends string> = S extends `${infer Head}${infer Rest}`
  ? [Head, ...IterateStr<Rest>]
  : [];

export type NoUnderscore<S extends string> = S extends `${string}_${string}`
  ? never
  : S;
