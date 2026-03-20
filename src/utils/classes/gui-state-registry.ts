import { WebStorage } from "@lephenix47/webstorage-utility";

type Primitive = string | number | boolean;

type RegistryEntry = {
  value: Primitive;
  onRestore: (value: Primitive) => void;
};

function isPrimitive(value: unknown): value is Primitive {
  const type = typeof value;
  return type === "string" || type === "number" || type === "boolean";
}

class GUIStateRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  private readonly savedValues: Record<string, unknown>;
  private readonly storageKey: string;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(storageKey: string) {
    this.storageKey = storageKey;

    /*
     * Read once on construction — all `register` calls then look up from this
     * in-memory snapshot instead of hitting storage on every call.
     */
    this.savedValues =
      WebStorage.getKey<Record<string, unknown>>(storageKey, true) ?? {};
  }

  /*
   * Declares a persisted value.
   *
   * - Looks up any previously saved value for `key`.
   * - Falls back to `defaultValue` if nothing is saved or the saved type
   *   doesn't match (guards against stale state after a refactor).
   * - Calls `onRestore` immediately so the scene reflects the saved state
   *   before the GUI is even built.
   * - Returns the resolved value so it can seed the GUI-bound params object
   *   directly — the controller will display the correct value from the start.
   */
  register = <T extends Primitive>(
    key: string,
    defaultValue: T,
    onRestore: (value: T) => void,
  ): T => {
    const saved: unknown = this.savedValues[key];

    /*
     * Type-check the saved value against the default — if someone renames a
     * param or changes its type, the stale saved value is silently discarded
     * and the default takes over instead of crashing.
     */
    const value =
      isPrimitive(saved) && typeof saved === typeof defaultValue
        ? (saved as T)
        : defaultValue;

    this.entries.set(key, {
      value,
      onRestore: onRestore as (value: Primitive) => void,
    });

    onRestore(value);

    return value;
  };

  /*
   * Call this inside each GUI `.onChange` handler after applying the value to
   * the scene. Schedules a debounced write — only registered primitive keys
   * are ever written, so functions, Three.js objects, etc. can't sneak in.
   */
  update = (key: string, value: Primitive): void => {
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.value = value;
    this.scheduleSave();
  };

  private scheduleSave = (): void => {
    clearTimeout(this.saveTimer);

    this.saveTimer = setTimeout(() => {
      const data = Object.fromEntries(
        [...this.entries.entries()].map(([key, { value }]) => [key, value]),
      );

      WebStorage.setKey(this.storageKey, data, true);
    }, 150);
  };

  /* Call in the GUI cleanup function to cancel any pending debounced write. */
  dispose = (): void => {
    clearTimeout(this.saveTimer);
  };
}

export default GUIStateRegistry;
