import { WebStorage } from "@lephenix47/webstorage-utility";

type Primitive = string | number | boolean;

type StateKey<TState> = keyof TState & string;

/**
 * A map of state keys to their scene-apply callbacks, used by {@link GUIStateRegistry.bindLinked}.
 * Include only the keys you want to link; all must belong to the same state type.
 */
type LinkedCallbackMap<T extends Record<string, Primitive>> = Partial<{
  [K in keyof T & string]: (value: T[K]) => void;
}>;

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
   * Links any number of state keys under a boolean toggle key.
   *
   * When `state[bindKey]` is `true`, changing any linked key automatically
   * mirrors its value to all other linked keys — both in the scene (via each
   * key's callback) and in the state object, so `.listen()`-enabled GUI
   * controls follow visually.
   *
   * A single `isSyncing` guard shared across all linked keys prevents infinite
   * recursion: keyA fires → sets keyB → keyB's callback sees guard → stops.
   *
   * When the toggle is switched on, all linked keys immediately synchronize to
   * the current value of the first key in `callbacks` (the master on activation).
   *
   * ```ts
   * registry.bindLinked("bindIntensity", {
   *   environmentMapIntensity: (v) => { scene.environmentIntensity = v; },
   *   backgroundIntensity:     (v) => { scene.backgroundIntensity = v; },
   *   fogIntensity:            (v) => { scene.fogIntensity = v; },
   * });
   * ```
   *
   * @param bindKey   - The boolean toggle key that enables/disables sync.
   * @param callbacks - Map of linked state keys to their scene-apply callbacks.
   *                    The first entry is treated as the master on activation.
   * @returns `this` for chaining.
   */
  bindLinked = <BindKey extends StateKey<T>>(
    bindKey: BindKey,
    callbacks: LinkedCallbackMap<T>,
  ): this => {
    const entries = (
      Object.entries(callbacks) as Array<
        [StateKey<T>, ((value: Primitive) => void) | undefined]
      >
    ).filter(
      (entry): entry is [StateKey<T>, (value: Primitive) => void] =>
        entry[1] !== undefined,
    );

    if (entries.length === 0) return this;

    const [[masterKey]] = entries;

    /**
     * Shared flag across all linked-key callbacks.
     * Raised while a propagation is in flight so receiving callbacks skip
     * their own outward propagation, breaking the potential recursion loop.
     */
    let isSyncing = false;

    /**
     * Writes `value` into every linked key except `sourceKey`.
     * No-ops when the toggle is off or a propagation is already in progress.
     */
    const propagateToAll = (sourceKey: StateKey<T>, value: Primitive): void => {
      if (!(this.state[bindKey] as boolean) || isSyncing) return;

      isSyncing = true;
      for (const [key] of entries) {
        if (key === sourceKey) continue;
        this.state[key] = value as T[typeof key];
      }
      isSyncing = false;
    };

    for (const [key, apply] of entries) {
      this.bind(key, (v) => {
        apply(v as Primitive);
        propagateToAll(key, v as Primitive);
      });
    }

    /*
     * Fires when the toggle is switched on or off.
     * On activation, snaps every non-master key to the current master value so
     * all linked keys start in sync (first entry in callbacks is the master).
     */
    this.bind(bindKey, (v) => {
      if (!(v as boolean)) return;

      const masterValue = this.state[masterKey] as Primitive;
      isSyncing = true;
      for (const [key] of entries) {
        if (key === masterKey) continue;
        this.state[key] = masterValue as T[typeof key];
      }
      isSyncing = false;
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
