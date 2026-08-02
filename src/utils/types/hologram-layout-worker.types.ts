import type { ScreenCircle } from "@utils/classes/mesh-silhouette-extractor";
import type { TextRun } from "@utils/classes/circle-text-layout";

/** Raw geometry data extracted from a THREE.Mesh — safe to send across threads. */
export type MeshData = {
  /** Vertex positions (x, y, z interleaved) — a copy of the geometry buffer. */
  positions: Float32Array;
  /** projectionMatrix × viewMatrix × modelMatrix, column-major (16 floats). */
  combinedMatrix: Float32Array;
  stride: number;
  k: number;
};

// ─── Main → Worker ────────────────────────────────────────────────────────────

export type WorkerInboundMessage =
  | {
      type: "init";
      text: string;
      font: string;
      lineHeight: number;
      horizontalPadding?: number;
      verticalPadding?: number;
    }
  | {
      type: "tick";
      meshes: MeshData[];
      width: number;
      height: number;
    };

// ─── Worker → Main ────────────────────────────────────────────────────────────

export type WorkerOutboundMessage = {
  type: "result";
  circles: ScreenCircle[];
  runs: TextRun[];
};
