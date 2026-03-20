import { WebStorage } from "@lephenix47/webstorage-utility";

type Primitive = string | number | boolean;

function isPrimitive(value: unknown): value is Primitive {
  const type = typeof value;
  return type === "string" || type === "number" || type === "boolean";
}

class GUIStateRegistry<T extends Record<string, Primitive>> {
  /*
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

  /*
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
        if (typeof key !== "string") return Reflect.set(target, key, value);

        Reflect.set(target, key, value);
        this.applyCallbacks.get(key)?.(value as Primitive);
        this.scheduleSave();

        return true;
      },
    });
  }

  /*
   * Registers an apply callback for a key and calls it immediately with the
   * current value (which is already the saved value if one exists).
   *
   * Returns `this` so calls can be chained:
   *   registry
   *     .bind("metalness", v => { material.metalness = v; })
   *     .bind("roughness", v => { material.roughness = v; });
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

  /*
   * Registers an expensive apply callback that should only fire when the user
   * finishes interacting (e.g. geometry rebuilds, shader recompiles).
   *
   * - Applied once immediately on init so restored values take effect on load.
   * - NOT called by the Proxy trap on mid-drag writes — only fires via lil-gui's
   *   `onFinishChange`, which receives the returned callback directly:
   *
   *   gui.add(registry.state, "subdivisions")
   *     .onFinishChange(registry.bindFinal("subdivisions", v => rebuildGeometry(v)));
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

  /* Call in the GUI cleanup to cancel any pending debounced write. */
  dispose = (): void => {
    clearTimeout(this.saveTimer);
  };
}

export default GUIStateRegistry;
