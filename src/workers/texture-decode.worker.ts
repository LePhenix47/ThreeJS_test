import {
  TextureDecodeWorkerMessageType,
  type WorkerInboundMessage,
  type WorkerOutboundMessage,
} from "@utils/types/texture-decode-worker.types";

/**
 * Decodes images off the main thread: fetches the raw bytes and runs createImageBitmap
 * (the actual JPEG/PNG decode) inside the worker, then transfers the finished ImageBitmap
 * back. Only the GPU upload still has to happen on the main thread.
 */
class TextureDecodeWorker {
  constructor() {
    self.onmessage = this.handleMessage;
  }

  private handleMessage = ({
    data,
  }: MessageEvent<WorkerInboundMessage>): void => {
    switch (data.type) {
      case TextureDecodeWorkerMessageType.Decode: {
        this.decode(data.id, data.url);
        break;
      }
      default: {
        const _exhaustive: never = data.type;
        console.warn(
          "[texture-decode.worker] Unknown message type:",
          _exhaustive,
        );
      }
    }
  };

  private decode = async (id: string, url: string): Promise<void> => {
    try {
      const response: Response = await fetch(url);
      const blob: Blob = await response.blob();
      const bitmap: ImageBitmap = await createImageBitmap(blob);

      const message = {
        type: TextureDecodeWorkerMessageType.Result,
        id,
        bitmap,
      } satisfies WorkerOutboundMessage;

      // ? transfer moves the bitmap's ownership to the main thread instead of copying it.
      // ? Without this, postMessage would clone the whole decoded image across the thread boundary
      self.postMessage(message, { transfer: [bitmap] });
    } catch (error) {
      const message = {
        type: TextureDecodeWorkerMessageType.Error,
        id,
        message: error instanceof Error ? error.message : String(error),
      } satisfies WorkerOutboundMessage;

      self.postMessage(message);
    }
  };
}

new TextureDecodeWorker();
