export type Vec3Like = { x: number; y: number; z: number };

// ─── Main → Worker ────────────────────────────────────────────────────────────

export type AddBodyMessage = {
  type: 'addBody';
  id: string;
  shape: 'sphere' | 'box' | 'plane';
  mass: number;
  material: 'concrete' | 'plastic';
  position: Vec3Like;
  rotation?: Vec3Like;
  radius?: number;
  dimensions?: Vec3Like;
};

export type WorkerInboundMessage =
  | AddBodyMessage
  | { type: 'removeBody'; id: string }
  | { type: 'setGravity'; x: number; y: number; z: number }
  | { type: 'step'; delta: number };

// ─── Worker → Main ────────────────────────────────────────────────────────────

export type WorkerOutboundMessage =
  | { type: 'transforms'; data: Float32Array }
  | { type: 'collision'; id: string; velocity: number };
