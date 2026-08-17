import { z } from "zod";
import type { ImportMetaEnv } from "./vite-env";
import EnvCoercion from "@utils/classes/env-coercion";

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
  DEV: EnvCoercion.boolean,
  /* ? Vite's mode CAN be any custom string via `--mode <name>`, but this
   *   project's scripts (package.json) only ever run plain `vite` /
   *   `vite build` / `vite preview` — no --mode flag anywhere — so the
   *   only real values are "development" and "production". Closed enum
   *   gives real autocomplete + rejection of typos. Extend the list if a
   *   custom mode script gets added later. */
  MODE: z.enum(["development", "production"]),
  PROD: EnvCoercion.boolean,
  SSR: EnvCoercion.boolean,

  // Custom environment variables
  VITE_BASE_PATH: z.string().min(1, "VITE_BASE_PATH is required for routing."),
  /* ? deploy.yml builds CI's .env from .env.example (sed-stripping everything
   *   after "# Facultative"), and VITE_STRICT_MODE was never in
   *   .env.example at all — so the key is genuinely ABSENT in CI, not just
   *   present-and-empty. .default(false) (not .optional()) is what fixes
   *   this without turning VITE_STRICT_MODE into an optional property:
   *   the parsed OUTPUT is always a real, required `boolean` either way, so
   *   ImportMetaEnv in vite-env.d.ts needs no `?:` change — confirmed via
   *   z.infer, omitting the key from an object literal typed as the
   *   inferred output still errors as "missing", same as any other
   *   required field. */
  VITE_STRICT_MODE: EnvCoercion.boolean.default(false),
  // Add more custom variables here
  // IMPORTANT: Also add them to ImportMetaEnv in vite-env.d.ts
  // Example:
  // VITE_API_URL: z.string().url(),
  // VITE_API_KEY: z.string().min(1),
  // VITE_MAX_RETRIES: EnvCoercion.number,   // "3"    -> 3
  // VITE_DEBUG_MODE: EnvCoercion.boolean,   // "true" -> true
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
