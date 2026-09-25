---
name: env-variables
description: Use when reading any environment variable in the app. Reference it through env.ts, never access import.meta.env keys directly.
---

# Environment Variables in React

## Rule
Always import environment variables from `env.ts`. Never use `import.meta.env` directly.

## ✅ Good (Import from env.ts)
```tsx
import env from "@env";

function MyComponent() {
  if (env.MODE) {
    console.log("Development mode");
  }

  return <div>Version: {env.APP_VERSION}</div>;
}
```

## The VITE_ prefix

Vite only exposes variables that start with `VITE_`, so the prefix stays everywhere Vite or the schema sees the variable: `.env`, `vite-env.d.ts` and the Zod schema in `env.ts`. `env.ts` strips it from the exported object, so code reads the bare name (`VITE_API_URL` in `.env` is `env.API_URL` in code).

- Vite's built-ins (`BASE_URL`, `DEV`, `MODE`, `PROD`, `SSR`) have no prefix and are exported as they are.
- `env.ts` throws at startup if a stripped name collides with another key (a `VITE_MODE` would clash with the built-in `MODE`), so pick a different name.
- `BASE_URL` (Vite's built-in base, like `/ThreeJS_test/`) and `BASE_PATH` (from `VITE_BASE_PATH`, like `ThreeJS_test`) are different values.

## ❌ Bad (Direct import.meta.env)
```tsx
function MyComponent() {
  // MODE might not be defined!
  if (import.meta.env.MODE === "development") {
    console.log("Development mode");
  }

  return <div>Version: {import.meta.env.VITE_APP_VERSION}</div>;
}
```

## Why?
- Centralized type safety
- Validated environment variables
- Prevents typos
- Clear documentation of available variables
- Build-time errors vs runtime errors

## env.ts Location
`src/env.ts`

## When in Doubt
Open `env.ts` and confirm:
1. The variable name exists
2. The value source is correct
3. The type is properly defined

## Adding New Variables

1. Add to `.env`:
```bash
VITE_API_URL=http://localhost:3000
```

1. Add to `vite-env.d.ts`:
```typescript
export interface ImportMetaEnv {
  ...
  readonly VITE_API_URL: URL;
}
```

1. Add to `env.ts`:
Make sure the Zod constriction matches the type in the `ImportMetaEnv`
```typescript
const EnvSchema = z.object({
    // Vite built-in variables
    ...
   // Custom environment variables
    ...
    VITE_API_URL: z.url();
})  satisfies z.ZodType<ImportMetaEnv>;
```

1. Use in components:
```tsx
import env from "@env";

...
console.log(env.API_URL) // ? Prefix stripped, see "The VITE_ prefix"
```