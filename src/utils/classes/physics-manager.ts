import type {
  AddBodyMessage,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@/utils/types/physics-worker.types";

type TransformsCallback = (data: Float32Array, ids: readonly string[]) => void;
type CollisionCallback = (id: string, velocity: number) => void;

class PhysicsManager {
  private readonly workerUrl = new URL(
    "../../workers/physics.worker.ts",
    import.meta.url,
  );

  private readonly worker: Worker;
  /**
   * Array — not `Set` or `Map` — because the transform loop needs O(1) integer index access:
   * `ids[i]` maps directly to the i-th body's 7-float block in the `Float32Array`.
   *
   * A `Map<id, index>` seems appealing but indices shift on every removal, making
   * the map stale and requiring O(n) updates — the same cost as `indexOf + splice`.
   *
   * Array optimizes the hot path (every frame) at the cost of O(n) removal (rare).
   */
  private readonly ids: string[] = [];

  onTransforms: TransformsCallback | null = null;
  onCollision: CollisionCallback | null = null;

  constructor() {
    this.worker = new Worker(this.workerUrl, { type: "module" });

    this.initWorkerListeners();
  }

  private initWorkerListeners = (): void => {
    this.worker.onmessage = ({ data }: MessageEvent<WorkerOutboundMessage>) => {
      this.handleWorkerMessage(data);
    };

    this.worker.onerror = (event) => {
      console.error("[PhysicsManager] Worker error:", event);
    };
  };

  addBody = (params: Omit<AddBodyMessage, "type">): void => {
    this.ids.push(params.id);
    this.worker.postMessage({
      type: "addBody",
      ...params,
    } satisfies WorkerInboundMessage);
  };

  removeBody = (id: string): void => {
    const indexToRemove: number = this.ids.indexOf(id);

    if (indexToRemove === -1) {
      console.warn("[PhysicsManager] Body not found:", id);
      return;
    }

    this.ids.splice(indexToRemove, 1);
    this.worker.postMessage({
      type: "removeBody",
      id,
    } satisfies WorkerInboundMessage);
  };

  setGravity = (x: number, y: number, z: number): void => {
    this.worker.postMessage({
      type: "setGravity",
      x,
      y,
      z,
    } satisfies WorkerInboundMessage);
  };

  step = (delta: number): void => {
    this.worker.postMessage({
      type: "step",
      delta,
    } satisfies WorkerInboundMessage);
  };

  dispose = (): void => {
    this.worker.terminate();
  };

  private handleWorkerMessage = (data: WorkerOutboundMessage): void => {
    switch (data.type) {
      case "transforms":
        this.onTransforms?.(data.data, this.ids);
        break;
      case "collision":
        this.onCollision?.(data.id, data.velocity);
        break;
      default: {
        const _exhaustive: never = data;
        console.warn(
          "[PhysicsManager] Unknown outbound message type:",
          _exhaustive,
        );
      }
    }
  };
}

export default PhysicsManager;
