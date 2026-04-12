import { WebStorage } from "@lephenix47/webstorage-utility";

type Primitive = string | number | boolean;

type StateKey<TState> = keyof TState & string;

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
  bind = <K extends StateKey<T>>(
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
  bindFinal = <K extends StateKey<T>>(
    key: K,
    apply: (value: T[K]) => void,
  ): ((value: T[K]) => void) => {
    this.finalCallbacks.set(key, apply as (value: Primitive) => void);

    const currentValue: T[K] = this.state[key];
    apply(currentValue);

    return apply;
  };

  /**
   * Wires two state keys for bidirectional sync, gated by a boolean toggle key.
   *
   * When `state[bindKey]` is `true`, changing either value automatically mirrors
   * it to the other — both in the scene (via `applyA`/`applyB`) and in the state
   * object, so `.listen()`-enabled GUI controls follow visually.
   *
   * An `isSyncing` guard local to this pair prevents infinite recursion:
   * keyA fires → sets `state[keyB]` → keyB fires → sees guard → stops.
   *
   * When the toggle is switched on, `state[keyB]` is immediately snapped to
   * the current value of `state[keyA]` (A is the master on activation).
   *
   * ```ts
   * registry.bindBidirectional(
   *   "bindIntensity",
   *   "environmentMapIntensity", (v) => { scene.environmentIntensity = v; },
   *   "backgroundIntensity",     (v) => { scene.backgroundIntensity = v; },
   * );
   * ```
   *
   * @returns `this` for chaining.
   */
  bindBidirectional = <
    BindKey extends StateKey<T>,
    KeyA extends StateKey<T>,
    KeyB extends StateKey<T>,
  >(
    bindKey: BindKey,
    keyA: KeyA,
    applyA: (value: T[KeyA]) => void,
    keyB: KeyB,
    applyB: (value: T[KeyB]) => void,
  ): this => {
    /**
     * Shared flag between the keyA and keyB callbacks.
     * When one side propagates to the other, it raises this flag so the
     * receiving side skips its own propagation — breaking the potential loop.
     */
    let isSyncing = false;

    /**
     * Pushes `value` into `targetKey` if the binding toggle is on and we're
     * not already mid-propagation. Owns the isSyncing bookend so callers
     * don't have to repeat the guard logic.
     */
    const propagateTo = (targetKey: StateKey<T>, value: Primitive): void => {
      const isLinked = this.state[bindKey] as boolean;
      if (!isLinked || isSyncing) return;

      isSyncing = true;
      this.state[targetKey] = value as T[typeof targetKey];
      isSyncing = false;
    };

    this.bind(keyA, (v) => {
      applyA(v);
      propagateTo(keyB, v);
    });

    /*
     * Mirror of the keyA callback — applies the B-side scene change and
     * pushes back to keyA when linked.
     */
    this.bind(keyB, (v) => {
      applyB(v);
      propagateTo(keyA, v);
    });

    /*
     * Fires when the toggle is switched on or off.
     * On activation, snaps keyB to the current value of keyA so both sides
     * start in sync (A is the master on activation).
     */
    this.bind(bindKey, (v) => {
      const isNowLinked = v as boolean;
      if (!isNowLinked) return;

      const currentValueOfA = this.state[keyA];
      const snapValueForB = currentValueOfA as unknown as T[KeyB];
      this.state[keyB] = snapValueForB;
    });

    return this;
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
