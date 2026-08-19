---
name: config-key-subset-typing
description: Use when a config or lookup object must type-check its keys against a subset of another type's keys instead of duplicating a string-literal union by hand.
---

# Config Key Subset Typing

## Rule

When a config/lookup object must only cover a *subset* of another type's keys. And stay in sync if that type changes. Type it against that subset instead of re-declaring the key union by hand.

```typescript
export type ObjectKeysExtract<T extends object, K extends keyof T> = keyof Pick<T, K>;
```

## ✅ Keys checked against the source type

```typescript
type Options = {
  position: THREE.Vector3;
  size: number;
  count: number;
  color: string;
};

type ConfigKey = ObjectKeysExtract<Options, "position" | "size" | "count">;

const CONFIG: Record<ConfigKey, { min: number; max: number }> = {
  position: { min: 15, max: 50 },
  size: { min: 5, max: 20 },
  count: { min: 50, max: 150 },
};
```

If `Options` drops or renames a field the config keys reference, this fails to compile.

## ❌ Hand-maintained union, can silently drift

```typescript
type ConfigKey = "position" | "size" | "count"; // no link back to Options

const CONFIG: Record<ConfigKey, { min: number; max: number }> = {
  /* ... */
};
```

Nothing catches it if `Options.position` gets renamed to `Options.origin`. `CONFIG.position` keeps compiling against a field that no longer exists.
