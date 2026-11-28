import {
  TextureDecodeWorkerMessageType,
  type WorkerInboundMessage,
  type WorkerOutboundMessage,
} from "@utils/types/texture-decode-worker.types";

type PendingDecode = {
  resolve: (bitmap: ImageBitmap) => void;
  reject: (error: Error) => void;
};

/**
 * Main-thread wrapper around the texture-decode Web Worker.
 *
 * Unlike a single-stream tick/result worker, texture decoding needs several requests in
 * flight at once (e.g. 6 cube-map faces loading together), so each `decode()` call is
 * correlated to its response by a generated id instead of a single `onResult` field.
 */
class TextureDecodeManager {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingDecode>();

  constructor() {
    this.worker = new Worker(
      new URL("../../workers/texture-decode.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.onmessage = this.handleMessage;
    this.worker.onerror = this.handleError;
  }

  private handleMessage = ({
    data,
  }: MessageEvent<WorkerOutboundMessage>): void => {
    const { id } = data;

    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);

    if (data.type === TextureDecodeWorkerMessageType.Error) {
      pending.reject(new Error(data.message));
      return;
    }

    pending.resolve(data.bitmap);
  };

  private handleError = (event: ErrorEvent): void => {
    console.error("[TextureDecodeManager] Worker error:", event);
  };

  public decode = (url: string): Promise<ImageBitmap> => {
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      const message = {
        type: TextureDecodeWorkerMessageType.Decode,
        id,
        url,
      } satisfies WorkerInboundMessage;

      this.worker.postMessage(message);
    });
  };

  dispose = (): void => {
    this.worker.terminate();
    this.pending.clear();
  };
}

export default TextureDecodeManager;
