---
name: web-worker-offload
description: Use when asked to move per-frame CPU-bound computation (physics, layout, clustering math) into a Web Worker — covers the Manager+Worker class pairing, typed discriminated-union message protocol, and the transferable-buffer copy rule. Not a decision aid for whether to use a worker — only for how to structure one once requested.
metadata:
  type: reference
---

# Web Worker Offload

Not a "should I use a worker" heuristic — this pattern applies once a Web Worker version of something has already been requested (e.g. "move this layout/physics calc into a worker"). At that point, follow this structure rather than improvising one from scratch.

## Manager + Worker Pairing

A `*Manager` class in `src/utils/classes/` owns the `Worker` instance, exposes typed methods that `postMessage`, exposes a callback property invoked from `worker.onmessage`, and a `dispose()` that terminates it:

```typescript
class LayoutManager {
  private readonly worker: Worker;
  onResult: ((result: Result) => void) | null = null;

  constructor() {
    this.worker = new Worker(
      new URL("../../workers/layout.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.onmessage = ({ data }: MessageEvent<WorkerOutboundMessage>) => {
      if (data.type === LayoutMessageType.Result) this.onResult?.(data.result);
    };
    this.worker.onerror = (event) => console.error("[LayoutManager]", event);
  }

  tick = (payload: TickPayload): void => {
    const transferables = [payload.positions.buffer];
    this.worker.postMessage(
      { type: LayoutMessageType.Tick, ...payload } satisfies WorkerInboundMessage,
      { transfer: transferables },
    );
  };

  dispose = (): void => {
    this.worker.terminate();
  };
}
```

## Typed Message Protocol

Messages are a discriminated union tagged by an enum, never a loose object:

```typescript
enum LayoutMessageType { Init, Tick, Result }

type WorkerInboundMessage =
  | { type: LayoutMessageType.Init; /* ... */ }
  | { type: LayoutMessageType.Tick; /* ... */ };

type WorkerOutboundMessage =
  | { type: LayoutMessageType.Result; result: Result };
```

The worker's `onmessage` switches on the tag; the `default` branch asserts `never` for compile-time exhaustiveness:

```typescript
self.onmessage = ({ data }: MessageEvent<WorkerInboundMessage>) => {
  switch (data.type) {
    case LayoutMessageType.Init: /* ... */ break;
    case LayoutMessageType.Tick: /* ... */ break;
    default: {
      const _exhaustive: never = data;
      console.warn("[layout.worker] Unknown message type:", _exhaustive);
    }
  }
};
```

## Boundaries

- Data sent to the worker must be plain, transferable buffers that are **copies** — never hand a live Three.js geometry buffer to `postMessage`'s `transfer` list, or Three.js loses its own view of that memory.
- A worker has no GPU/Three.js API access — only the CPU-side math (layout, physics, clustering) moves into it. Results get posted back and applied to Three.js objects on the main thread.
