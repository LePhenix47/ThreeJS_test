import type {
  AddBodyMessage,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@/utils/types/physics-worker.types";

type TransformsCallback = (data: Float32Array, ids: readonly string[]) => void;
type CollisionCallback = (id: string, velocity: number) => void;

class PhysicsManager {
  private readonly worker: Worker;
  private readonly ids: string[] = [];

  onTransforms: TransformsCallback | null = null;
  onCollision: CollisionCallback | null = null;

  constructor() {
    this.worker = new Worker(
      new URL("../../workers/physics.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.onmessage = ({ data }: MessageEvent<WorkerOutboundMessage>) => {
      this.handleWorkerMessage(data);
    };

    this.worker.onerror = (event) => {
      console.error("[PhysicsManager] Worker error:", event);
    };
  }

  addBody(params: Omit<AddBodyMessage, "type">): void {
    this.ids.push(params.id);
    this.worker.postMessage({
      type: "addBody",
      ...params,
    } satisfies WorkerInboundMessage);
  }

  removeBody(id: string): void {
    this.ids.splice(this.ids.indexOf(id), 1);
    this.worker.postMessage({
      type: "removeBody",
      id,
    } satisfies WorkerInboundMessage);
  }

  setGravity(x: number, y: number, z: number): void {
    this.worker.postMessage({
      type: "setGravity",
      x,
      y,
      z,
    } satisfies WorkerInboundMessage);
  }

  step(delta: number): void {
    this.worker.postMessage({
      type: "step",
      delta,
    } satisfies WorkerInboundMessage);
  }

  dispose(): void {
    this.worker.terminate();
  }

  private handleWorkerMessage(data: WorkerOutboundMessage): void {
    if (data.type === "transforms") {
      this.onTransforms?.(data.data, this.ids);
      return;
    }

    if (data.type === "collision") {
      this.onCollision?.(data.id, data.velocity);
      return;
    }

    const _exhaustive: never = data;
    console.warn(
      "[PhysicsManager] Unknown outbound message type:",
      _exhaustive,
    );
  }
}

export default PhysicsManager;
