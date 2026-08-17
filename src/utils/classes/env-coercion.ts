import { z } from "zod";

/**
 * Raw-string -> typed-value zod preprocessors for env vars. Vite only
 * injects DEV/PROD/SSR as real compile-time booleans — every custom
 * VITE_* var comes from .env text, so it always arrives as a raw string
 * ("true", "42", ...) even when it's conceptually a boolean or number,
 * and z.boolean()/z.number() alone would reject those strings.
 */
class EnvCoercion {
  static readonly boolean = z.preprocess(EnvCoercion.toBoolean, z.boolean());
  static readonly number = z.preprocess(EnvCoercion.toNumber, z.number());

  private static toBoolean(value: unknown): unknown {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }

  private static toNumber(value: unknown): unknown {
    if (typeof value !== "string") return value;
    if (value.trim() === "") return value;
    return Number(value);
  }
}

export default EnvCoercion;
