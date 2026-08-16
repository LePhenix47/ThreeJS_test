/// <reference types="vite/client" />

export interface ImportMetaEnv {
  // Vite built-in variables
  readonly BASE_URL: string;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly SSR: boolean;

  // Custom environment variables
  readonly VITE_BASE_PATH: string;
  /* ? Raw Vite injection is actually the string "true"/"false" — this says
   *   `boolean` because it's typed as env.ts's coerced GUARANTEE (env.ts
   *   runs it through envBoolean before anyone touches it), not the literal
   *   Vite value. Never read import.meta.env.VITE_STRICT_MODE directly for
   *   that reason — always go through the validated `env` default export. */
  readonly VITE_STRICT_MODE: boolean;

  // Add more custom variables here following the VITE_ prefix convention
  // Example:
  // readonly VITE_API_URL: string;
  // readonly VITE_API_KEY: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
