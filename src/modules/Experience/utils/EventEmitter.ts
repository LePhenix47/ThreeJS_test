type EventCallback<T = unknown[]> = (
  ...args: T extends unknown[] ? T : never
) => void;

type EventOptions = Partial<{
  once: boolean;
}>;

type Listener<T = unknown[]> = {
  callback: EventCallback<T>;
  once: boolean;
};

class EventEmitter {
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
   * @param event - Event name
   * @param callback - Function to execute when event is emitted
   * @param options - Configuration options (e.g., once: true for single execution)
   * @returns This EventEmitter instance for chaining
   */
  public on = <T = unknown[]>(
    event: string,
    callback: EventCallback<T>,
    options: EventOptions = {},
  ): this => {
    // * Create an empty array if the event doesn't exist
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    // * Add the listener
    this.events.get(event)!.push({
      callback: callback as EventCallback,
      once: options.once || false,
    });

    this.log(`[EventEmitter] Listener added for "${event}"`);

    return this;
  };

  /**
   * Registers a one-time event listener (automatically removed after first execution)
   */
  public once = <T = unknown[]>(
    event: string,
    callback: EventCallback<T>,
  ): this => {
    return this.on(event, callback, { once: true });
  };

  /**
   * Emits an event with optional arguments
   * @param event - Event name
   * @param args - Arguments to pass to the callbacks
   * @returns True if the event had listeners, false otherwise
   */
  public emit = <T = unknown[]>(
    event: string,
    ...args: T extends unknown[] ? T : never
  ): boolean => {
    const listeners = this.events.get(event);

    if (!listeners || listeners.length === 0) {
      if (this.DEBUG_MODE) {
        console.warn(`[EventEmitter] No listeners for "${event}"`);
      }
      return false;
    }

    // * Create a copy to avoid mutation issues if callbacks modify the listeners array
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

    // Remove once listeners after execution
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
  public off = <T = unknown[]>(
    event: string,
    callback: EventCallback<T>,
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
      return false; // Callback not found
    }

    this.log(`[EventEmitter] Removed listener for "${event}"`);

    return true;
  };

  /**
   * Removes all listeners for a specific event or all events
   * @param event - Optional event name. If not provided, removes all listeners
   */
  public removeAllListeners = (event?: string): this => {
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
  public listenerCount = (event: string): number => {
    return this.events.get(event)?.length || 0;
  };

  /**
   * Gets all registered event names
   */
  public get eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

export default EventEmitter;
