import type { ScreenCircle } from "@utils/classes/mesh-silhouette-extractor";
import type { TextRun } from "@utils/classes/circle-text-layout";
import { M4 } from "@utils/enums/matrices";

// m[MVPIdx.clipX_byX] = "how much vertex X contributes to clip-space X"
// prettier-ignore
export enum WorldToScreen  {
  clipX_byX = M4.r0c0,  clipX_byY = M4.r0c1,  clipX_byZ = M4.r0c2,  clipX_byW = M4.r0c3,
  clipY_byX = M4.r1c0,  clipY_byY = M4.r1c1,  clipY_byZ = M4.r1c2,  clipY_byW = M4.r1c3,
  clipZ_byX = M4.r2c0,  clipZ_byY = M4.r2c1,  clipZ_byZ = M4.r2c2,  clipZ_byW = M4.r2c3,
  perspW_byX = M4.r3c0, perspW_byY = M4.r3c1, perspW_byZ = M4.r3c2, perspW_byW = M4.r3c3,
}

export enum HologramWorkerMessageType {
  Init = "init",
  Tick = "tick",
  Result = "result",
}

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
      type: HologramWorkerMessageType.Init;
      text: string;
      font: string;
      lineHeight: number;
      horizontalPadding?: number;
      verticalPadding?: number;
    }
  | {
      type: HologramWorkerMessageType.Tick;
      meshes: MeshData[];
      width: number;
      height: number;
    };

// ─── Worker → Main ────────────────────────────────────────────────────────────

export type WorkerOutboundMessage = {
  type: HologramWorkerMessageType.Result;
  circles: ScreenCircle[];
  runs: TextRun[];
};
