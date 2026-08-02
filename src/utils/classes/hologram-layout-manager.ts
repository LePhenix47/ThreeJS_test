import type { ScreenCircle } from "@utils/classes/mesh-silhouette-extractor";
import type { TextRun } from "@utils/classes/circle-text-layout";
import type {
  MeshData,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@utils/types/hologram-layout-worker.types";

type ResultCallback = (circles: ScreenCircle[], runs: TextRun[]) => void;

/**
 * Main-thread wrapper around the hologram layout Web Worker.
 *
 * Mirrors the PhysicsManager pattern: owns the Worker instance, exposes a
 * typed API (`init`, `tick`), and calls `onResult` when the worker responds.
 */
class HologramLayoutManager {
  private readonly worker: Worker;

  onResult: ResultCallback | null = null;

  constructor() {
    this.worker = new Worker(
      new URL("../../workers/hologram-layout.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.onmessage = ({
      data,
    }: MessageEvent<WorkerOutboundMessage>) => {
      if (data.type === "result") {
        this.onResult?.(data.circles, data.runs);
      }
    };

    this.worker.onerror = (event) => {
      console.error("[HologramLayoutManager] Worker error:", event);
    };
  }

  /**
   * Sends text and font data to the worker once — runs `prepareWithSegments`
   * inside the worker so glyph measurement only happens on init, not per frame.
   */
  init = (
    text: string,
    font: string,
    lineHeight: number,
    horizontalPadding?: number,
    verticalPadding?: number,
  ): void => {
    this.worker.postMessage({
      type: "init",
      text,
      font,
      lineHeight,
      horizontalPadding,
      verticalPadding,
    } satisfies WorkerInboundMessage);
  };

  /**
   * Sends per-frame mesh data to the worker and transfers the underlying
   * buffers (zero-copy ownership handoff). The Float32Arrays in `meshes` must
   * be copies — never pass Three.js geometry buffers directly or Three.js
   * loses access to its own vertex data.
   */
  tick = (meshes: MeshData[], width: number, height: number): void => {
    const transferables = meshes.flatMap((m) => [
      m.positions.buffer,
      m.combinedMatrix.buffer,
    ]);

    this.worker.postMessage(
      { type: "tick", meshes, width, height } satisfies WorkerInboundMessage,
      { transfer: transferables },
    );
  };

  dispose = (): void => {
    this.worker.terminate();
  };
}

export default HologramLayoutManager;
