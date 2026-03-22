import { WebStorage } from "@lephenix47/webstorage-utility";

type Primitive = string | number | boolean;

function isPrimitive(value: unknown): value is Primitive {
  return ["string", "number", "boolean"].includes(typeof value);
}

class GUIStateRegistry<T extends Record<string, Primitive>> {
  /**
   * The Proxy-wrapped state object — pass this directly to `gui.add()`.
   *
   * Every write lil-gui makes (e.g. `state.metalness = 0.7`) is intercepted
   * by the `set` trap, which:
   *   1. Applies the value to the scene via the registered callback.
   *   2. Schedules a debounced save to sessionStorage.
   *
   * No `onChange` wiring needed — the Proxy handles everything centrally.
   */
  readonly state: T;

  private readonly applyCallbacks = new Map<
    string,
    (value: Primitive) => void
  >();

  /**
   * Callbacks registered via `bindFinal` — intentionally NOT in `applyCallbacks`
   * so the Proxy trap never calls them on mid-drag writes. They are applied once
   * on init (restore) and then only when lil-gui fires `onFinishChange`.
   */
  private readonly finalCallbacks = new Map<
    string,
    (value: Primitive) => void
  >();
  private readonly storageKey: string;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(storageKey: string, defaults: T) {
    this.storageKey = storageKey;

    /*
     * Merge saved values over defaults — if a saved value's type doesn't
     * match the default (stale key after a refactor), fall back to the default
     * silently rather than crashing.
     */
    const saved =
      WebStorage.getKey<Record<string, unknown>>(storageKey, true) ?? {};

    const raw = { ...defaults };

    for (const key in defaults) {
      const savedValue: unknown = saved[key];
      if (
        !isPrimitive(savedValue) ||
        typeof savedValue !== typeof defaults[key]
      ) {
        continue;
      }

      raw[key] = savedValue as T[typeof key];
    }

    this.state = new Proxy(raw, {
      set: (target, key, value): boolean => {
        // * Symbols can't be storage keys — let them pass through untouched
        if (typeof key !== "string") {
          return Reflect.set(target, key, value);
        }

        // * Write the new value to the underlying raw object using the Reflect API
        Reflect.set(target, key, value);

        // * Apply the value to the scene if a callback was registered for this key
        const applyCallback = this.applyCallbacks.get(key);
        applyCallback?.(value);

        // * Schedule a debounced write to sessionStorage
        this.scheduleSave();

        return true;
      },
    });
  }

  /**
   * Registers a callback for `key` and immediately applies the current value.
   *
   * The callback fires on every lil-gui write (mid-drag included) via the Proxy
   * trap — suitable for cheap operations like updating a material property.
   *
   * Returns `this` so calls can be chained:
   * ```ts
   * registry
   *   .bind("metalness", v => { material.metalness = v; })
   *   .bind("roughness", v => { material.roughness = v; });
   * ```
   *
   * @param key   - The state key to watch.
   * @param apply - Called with the current (or new) value whenever it changes.
   * @returns `this` for chaining.
   */
  bind = <K extends keyof T & string>(
    key: K,
    apply: (value: T[K]) => void,
  ): this => {
    this.applyCallbacks.set(key, apply as (value: Primitive) => void);

    const currentValue: T[K] = this.state[key];
    apply(currentValue);
    return this;
  };

  /**
   * Registers an expensive callback that should only fire when the user
   * finishes interacting (e.g. geometry rebuilds, shader recompiles).
   *
   * - Applied once immediately on init so restored values take effect on load.
   * - NOT called by the Proxy trap on mid-drag writes — only fires via lil-gui's
   *   `onFinishChange`, which receives the returned callback directly:
   *
   * ```ts
   * gui.add(registry.state, "subdivisions")
   *   .onFinishChange(registry.bindFinal("subdivisions", v => rebuildGeometry(v)));
   * ```
   *
   * @param key   - The state key to watch.
   * @param apply - Called once on init and again on `onFinishChange`.
   * @returns The same `apply` function, for passing directly to `.onFinishChange()`.
   */
  bindFinal = <K extends keyof T & string>(
    key: K,
    apply: (value: T[K]) => void,
  ): ((value: T[K]) => void) => {
    this.finalCallbacks.set(key, apply as (value: Primitive) => void);

    const currentValue: T[K] = this.state[key];
    apply(currentValue);

    return apply;
  };

  private scheduleSave = (): void => {
    clearTimeout(this.saveTimer);

    this.saveTimer = setTimeout(() => {
      WebStorage.setKey(this.storageKey, { ...this.state }, true);
    }, 150);
  };

  /**
   * Cancels any pending debounced sessionStorage write.
   * Call this in the GUI cleanup function to avoid writing after disposal.
   */
  dispose = (): void => {
    clearTimeout(this.saveTimer);
  };
}

export default GUIStateRegistry;
