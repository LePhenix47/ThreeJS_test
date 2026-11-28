/** The message types exchanged between the main thread and the texture-decode worker. */
export enum TextureDecodeWorkerMessageType {
  Decode = "decode",
  Result = "result",
  Error = "error",
}

// ─── Main → Worker ────────────────────────────────────────────────────────────

export type WorkerInboundMessage = {
  type: TextureDecodeWorkerMessageType.Decode;
  id: string;
  url: string;
};

// ─── Worker → Main ────────────────────────────────────────────────────────────

export type WorkerOutboundMessage =
  | {
      type: TextureDecodeWorkerMessageType.Result;
      id: string;
      bitmap: ImageBitmap;
    }
  | {
      type: TextureDecodeWorkerMessageType.Error;
      id: string;
      message: string;
    };
