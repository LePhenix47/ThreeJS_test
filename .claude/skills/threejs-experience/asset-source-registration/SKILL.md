---
name: asset-source-registration
description: Use when adding any new model or texture asset to the project — covers the file structure, Vite import pattern, and how to register the source so Resources can load it.
metadata:
  type: reference
---

# Asset Source Registration

## File Structure

```
src/modules/Experience/sources/
  models/
    <asset-name>/
      <asset-name>.ts     ← one file per asset
    index.ts              ← imports all, exports array + ModelNames type
  textures/
    <asset-name>/
      <asset-name>.ts     ← one file per asset
    index.ts              ← imports all, exports array + type helpers
```

One asset = one subfolder = one `.ts` file. Never inline source objects directly in `index.ts`.

## Model source file

```typescript
import { Source } from "@modules/Experience/utils/Resources/types";
import coffeeSmokeModel from "@public/models/coffee-smoke/bakedModel.glb?url";

const coffeeSmoke = {
  name: "coffee-smoke",
  type: "gltf",
  path: coffeeSmokeModel,
} as const satisfies Source;

export default coffeeSmoke;
```

## Texture source file

```typescript
import { Source } from "@modules/Experience/utils/Resources/types";
import perlin from "@public/textures/coffee-smoke/perlin.png";

const coffeeSmokeTextures = {
  name: "coffee-smoke",
  type: "texture",
  paths: { color: perlin },
} as const satisfies Source;

export default coffeeSmokeTextures;
```

## Vite import rules

- GLB files: **must use `?url` suffix** → `import model from "@public/models/foo/bar.glb?url"`
- Images/textures: **direct import** → `import tex from "@public/textures/foo/bar.png"`

## index.ts (update after adding source file)

```typescript
import coffeeSmoke from "./coffee-smoke/coffee-smoke";

const models = [coffeeSmoke] as const;
export type ModelNames = (typeof models)[number]["name"];
export default models;
```

## Why `as const satisfies Source`

- `as const` locks `name` to its literal type (`"coffee-smoke"` not `string`), so the index type can derive `ModelNames` as a string-literal union — which is what `resources.getGltf()` / `resources.getTextures()` use for type-safe key lookup
- `satisfies Source` validates the shape at compile time without widening the type

## Assets go in `public/`

Files must be copied to `public/models/<name>/` or `public/textures/<name>/` before they can be imported. The `@public/*` alias maps to `public/`.
