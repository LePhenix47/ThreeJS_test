type EventMap = Record<string, unknown[]>;

type EventCallback<T extends unknown[]> = (...args: T) => void;

type EventOptions = Partial<{
  once: boolean;
}>;

type Listener<T extends unknown[] = unknown[]> = {
  callback: EventCallback<T>;
  once: boolean;
};

abstract class EventEmitter<TEvents extends EventMap> {
  private readonly events: Map<string, Listener[]>;
  private readonly DEBUG_MODE = false; // Set to true for logging

  constructor() {
    this.events = new Map();
  }

  private log = (message: string): void => {
    if (!this.DEBUG_MODE) {
      return;
    }
    console.log(
      `%c${message}`,
      "background: blue; color: white; font-weight: bold",
    );
  };

  /**
   * Registers an event listener
   * @param event - Event name (autocompleted from TEvents)
   * @param callback - Typed callback matching the event's arg tuple
   * @param options - Configuration options (e.g., once: true for single execution)
   * @returns This EventEmitter instance for chaining
   */
  public on = <K extends keyof TEvents & string>(
    event: K,
    callback: EventCallback<TEvents[K]>,
    options: EventOptions = {},
  ): this => {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event)!.push({
      callback: callback as EventCallback<unknown[]>,
      once: options.once || false,
    });

    this.log(`[EventEmitter] Listener added for "${event}"`);

    return this;
  };

  /**
   * Registers a one-time event listener (automatically removed after first execution)
   */
  public once = <K extends keyof TEvents & string>(
    event: K,
    callback: EventCallback<TEvents[K]>,
  ): this => {
    return this.on(event, callback, { once: true });
  };

  /**
   * Emits an event, spreading all args to every listener.
   * @returns True if the event had listeners, false otherwise
   */
  protected emit = <K extends keyof TEvents & string>(
    event: K,
    ...args: TEvents[K]
  ): boolean => {
    const listeners = this.events.get(event);

    if (!listeners || listeners.length === 0) {
      if (this.DEBUG_MODE) {
        console.warn(`[EventEmitter] No listeners for "${event}"`);
      }
      return false;
    }

    const listenersToExecute = [...listeners];
    const onceListeners: Listener[] = [];

    for (const listener of listenersToExecute) {
      try {
        listener.callback(...args);

        if (listener.once) {
          onceListeners.push(listener);
        }
      } catch (error) {
        console.error(
          `[EventEmitter] Error in listener for "${event}":`,
          error,
        );
      }
    }

    if (onceListeners.length > 0) {
      const remainingListeners = listeners.filter(
        (listener) => !onceListeners.includes(listener),
      );

      if (remainingListeners.length === 0) {
        this.events.delete(event);
      } else {
        this.events.set(event, remainingListeners);
      }
    }

    this.log(
      `[EventEmitter] Emitted "${event}" to ${listenersToExecute.length} listener(s)`,
    );

    return true;
  };

  /**
   * Removes a specific event listener
   * @returns True if the listener was removed, false if not found
   */
  public off = <K extends keyof TEvents & string>(
    event: K,
    callback: EventCallback<TEvents[K]>,
  ): boolean => {
    const listeners = this.events.get(event);

    if (!listeners) {
      return false;
    }

    const initialLength: number = listeners.length;
    const filteredListeners = listeners.filter(
      (listener) => listener.callback !== callback,
    );

    if (filteredListeners.length === 0) {
      this.events.delete(event);
    } else if (filteredListeners.length < initialLength) {
      this.events.set(event, filteredListeners);
    } else {
      return false;
    }

    this.log(`[EventEmitter] Removed listener for "${event}"`);

    return true;
  };

  /**
   * Removes all listeners for a specific event or all events
   * @param event - Optional event name. If not provided, removes all listeners
   */
  public removeAllListeners = (event?: keyof TEvents & string): this => {
    if (event) {
      this.events.delete(event);
      this.log(`[EventEmitter] Removed all listeners for "${event}"`);
    } else {
      this.events.clear();
      this.log(`[EventEmitter] Removed all listeners`);
    }
    return this;
  };

  /**
   * Gets the number of listeners for a specific event
   */
  public listenerCount = (event: keyof TEvents & string): number => {
    return this.events.get(event)?.length || 0;
  };

  /**
   * Gets all registered event names
   */
  public get eventNames(): (keyof TEvents & string)[] {
    return Array.from(this.events.keys()) as (keyof TEvents & string)[];
  }
}

export default EventEmitter;
