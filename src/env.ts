import { z } from "zod";
import type { ImportMetaEnv } from "./vite-env";

/* ? Vite only injects DEV/PROD/SSR as real compile-time booleans. Every
 *   custom VITE_* var comes from .env text, so it always arrives as a raw
 *   string ("true", "42", ...) even when it's conceptually a boolean or
 *   number — z.boolean()/z.number() alone would reject those strings.
 *   These preprocessors coerce the raw string before the real check runs. */
function coerceBoolean(value: unknown): unknown {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function coerceNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.trim() === "") return value;
  return Number(value);
}

const envBoolean = z.preprocess(coerceBoolean, z.boolean());
export const envNumber = z.preprocess(coerceNumber, z.number());

/**
 * Environment variables schema using Zod for runtime validation
 * This ensures type safety and validates that all required env vars are present
 * Must match the ImportMetaEnv interface in vite-env.d.ts
 */
const EnvSchema = z.object({
  // Vite built-in variables
  /* ? Despite the name, BASE_URL is Vite's app *base path* (e.g. "/",
   *   "/ThreeJS_test/"), not a full URL — it's whatever `base` resolves to
   *   in vite.config.ts. Do NOT switch this to z.string().url(), it will
   *   reject every real value Vite ever produces here. */
  BASE_URL: z.string().min(1),
  DEV: envBoolean,
  /* ? Vite's mode CAN be any custom string via `--mode <name>`, but this
   *   project's scripts (package.json) only ever run plain `vite` /
   *   `vite build` / `vite preview` — no --mode flag anywhere — so the
   *   only real values are "development" and "production". Closed enum
   *   gives real autocomplete + rejection of typos. Extend the list if a
   *   custom mode script gets added later. */
  MODE: z.enum(["development", "production"]),
  PROD: envBoolean,
  SSR: envBoolean,

  // Custom environment variables
  VITE_BASE_PATH: z.string().min(1, "VITE_BASE_PATH is required for routing."),
  VITE_STRICT_MODE: envBoolean,
  // Add more custom variables here
  // IMPORTANT: Also add them to ImportMetaEnv in vite-env.d.ts
  // Example:
  // VITE_API_URL: z.string().url(),
  // VITE_API_KEY: z.string().min(1),
  // VITE_MAX_RETRIES: envNumber,   // "3"    -> 3
  // VITE_DEBUG_MODE: envBoolean,   // "true" -> true
}) satisfies z.ZodType<ImportMetaEnv>;

/**
 * Type inference from the schema
 */
export type EnvType = z.infer<typeof EnvSchema>;

/**
 * Parse and validate environment variables at runtime
 */
function validateEnv(): EnvType {
  try {
    console.log(import.meta.env);
    const parsed = EnvSchema.parse(import.meta.env);

    if (parsed.MODE === "development") {
      console.log("Parsed ENV", parsed);
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment variable validation failed:");
      console.error(error.format());
    }
    throw new Error(
      "Failed to validate environment variables. Check console for details.",
    );
  }
}

/**
 * Validated and typed environment variables
 * Use this throughout the app instead of import.meta.env
 */
const env = validateEnv();

export default env;
