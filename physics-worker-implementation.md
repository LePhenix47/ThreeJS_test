# Physics Web Worker — Implementation

How the architecture described in `physics-worker.md` was actually built.

---

## File map

```
src/
├── workers/
│   └── physics.worker.ts          # Worker thread — owns the Cannon world
├── utils/
│   ├── classes/
│   │   ├── cannon-body-factory.ts # Pure Cannon body construction (no Three.js)
│   │   ├── physics-manager.ts     # Main-thread wrapper around the Worker API
│   │   └── physics-object.ts      # Main-thread mesh + audio (no Cannon)
│   └── types/
│       └── physics-worker.types.ts # Shared discriminated union message protocol
└── components/
    └── ThreeScene/
        └── ThreeScene.tsx         # Wires everything together, owns the RAF loop
```

---

## Shared message protocol (`physics-worker.types.ts`)

Both threads import from the same types file — that's the contract.

```ts
// Vec3Like is plain data, safe to cross postMessage
export type Vec3Like = { x: number; y: number; z: number };

// Main → Worker
export type WorkerInboundMessage =
  | { type: 'addBody';    id: string; shape: 'sphere' | 'box' | 'plane'; mass: number; material: 'concrete' | 'plastic'; position: Vec3Like; rotation?: Vec3Like; radius?: number; dimensions?: Vec3Like }
  | { type: 'removeBody'; id: string }
  | { type: 'setGravity'; x: number; y: number; z: number }
  | { type: 'step';       delta: number };

// Worker → Main
export type WorkerOutboundMessage =
  | { type: 'transforms'; data: Float32Array }   // 7 floats per body, transferred
  | { type: 'collision';  id: string; velocity: number };
```

**Why discriminated unions?** TypeScript narrows the type inside each `switch` case — no casting needed, and the `default: never` trick gives an exhaustive check at compile time.

---

## Worker thread (`physics.worker.ts`)

Everything Cannon lives here. The main thread never imports Cannon.

### `PhysicsWorldWorker` class

All state is private. The public surface matches the inbound message types exactly.

```ts
class PhysicsWorldWorker {
  private readonly concreteMaterial: CANNON.Material;
  private readonly plasticMaterial:  CANNON.Material;
  private readonly world:   CANNON.World;
  private readonly ids:     string[];           // insertion-ordered, see below
  private readonly entries: Map<string, BodyEntry>;

  addBody(msg: AddBodyMessage): void   // delegates to CannonBodyFactory + registerBody
  removeBody(id: string): void
  setGravity(x, y, z): void
  step(delta: number): void            // steps world, posts Float32Array
}
```

### Why `ids: string[]` and not a `Map` or `Set`

The transform buffer is a flat `Float32Array` where body `i` occupies floats `[i*7 … i*7+6]`.
The only way to know which body corresponds to index `i` is an ordered list — `ids[i]`.

A `Map<id, index>` looks appealing but breaks on removal: when body at index 3 is removed,
indices 3, 4, 5 … all shift. Keeping the map in sync costs O(n) updates — the same as
`indexOf + splice` on the array, with more code. The array is the right trade-off.

### `createCollisionHandler` — why a factory, not a method

The collision listener needs to capture `id` to know which body to report.
A plain method has no way to do that. The factory closes over `id` and returns a
`CollisionHandler` bound to that specific body:

```ts
private createCollisionHandler = (id: string): CollisionHandler => {
  return ({ contact }) => {
    const velocity = contact.getImpactVelocityAlongNormal();
    if (Math.abs(velocity) < 1.5) return;  // ignore micro-collisions
    self.postMessage({ type: 'collision', id, velocity: Math.abs(velocity) });
  };
};
```

The returned reference is stored in `entries` alongside the body so that `removeBody`
can call `body.removeEventListener('collide', collisionHandler)` with the **exact same
function reference** — Cannon ignores removals that pass a different one.

### Transform buffer layout

7 floats per body, packed in insertion order:

```
[ px, py, pz, qx, qy, qz, qw,  px, py, pz, qx, qy, qz, qw,  ... ]
  ─── body 0 ───────────────    ─── body 1 ───────────────
```

Written with `Float32Array.set`:

```ts
const { position: p, quaternion: q } = body;
cannonBuffer.set([p.x, p.y, p.z, q.x, q.y, q.z, q.w], i * 7);
```

Transferred (zero-copy ownership handoff) — after `postMessage` returns, `cannonBuffer`
must not be read:

```ts
self.postMessage(
  { type: 'transforms', data: cannonBuffer },
  { transfer: [cannonBuffer.buffer] },
);
```

---

## Body factory (`cannon-body-factory.ts`)

Pure static methods — given dimensions/position/rotation, return a `CANNON.Body`.
No world registration, no materials, no side effects.

Extracted into its own file so it can be imported by the worker without pulling in
any main-thread code. Key detail for `box`: Cannon takes **half-extents**, not full
dimensions — each axis is halved before being passed to `CANNON.Box`.

---

## Main-thread wrapper (`physics-manager.ts`)

Hides the raw `Worker` API. Consumers call typed methods; they never call `postMessage` directly.

```ts
class PhysicsManager {
  addBody(params): void
  removeBody(id): void
  setGravity(x, y, z): void
  step(delta): void
  dispose(): void           // worker.terminate()

  onTransforms: ((data: Float32Array, ids: readonly string[]) => void) | null;
  onCollision:  ((id: string, velocity: number) => void) | null;
}
```

`ids[]` on this side mirrors the worker's `ids[]` — both are kept in sync by `addBody`
and `removeBody`. The `onTransforms` callback receives both the buffer and the id list
so the caller can resolve `ids[i]` → mesh without another lookup structure.

---

## Render side (`ThreeScene.tsx`)

`PhysicsObject` is now mesh + audio only — no Cannon imports.

### Transform application

```ts
physicsManager.onTransforms = (data, ids) => {
  for (let i = 0; i < ids.length; i++) {
    const obj = objectsById.get(ids[i]);
    if (!obj) continue; // floor is not in objectsById — static, never needs updates

    const [px, py, pz, qx, qy, qz, qw] = data.subarray(i * 7, i * 7 + 7);
    obj.mesh.position.set(px, py, pz);
    obj.mesh.quaternion.set(qx, qy, qz, qw);
  }
};
```

`subarray` returns a typed view into the same buffer — no allocation, no copy.

### RAF loop

```ts
timer.update();
physicsManager.step(timer.getDelta()); // getDelta() called exactly once — not idempotent
```

`step` posts a message to the worker. The worker steps the world and posts `transforms`
back asynchronously. There is one frame of latency between the step command and the
transform update — imperceptible at 60 fps.

### Why audio stays on the main thread

`HTMLAudioElement` and `AudioContext` cannot be created inside a worker. The worker
detects the collision, measures the velocity, and sends a `collision` message back.
The main thread plays the sound:

```ts
physicsManager.onCollision = (id, velocity) => {
  objectsById.get(id)?.playSound(velocity);
};
```

`shitpostMode` never needs to go to the worker at all — it only affects which audio
clip to play, which is a main-thread decision.

---

## Cannon material setup

Two named materials (`concrete`, `plastic`) plus a `ContactMaterial` that pairs them,
defining friction and restitution for that specific combination. A `defaultContactMaterial`
covers any pair not explicitly defined.

```
CANNON.Material      — just a name tag
CANNON.ContactMaterial — the actual physics: friction + restitution for a pair
world.defaultContactMaterial — fallback for unregistered pairs
```

- `friction: 0.1` — low resistance to sliding (objects don't grip)
- `restitution: 0.7` — bouncy but not perfectly elastic

---

## Key gotchas

| Gotcha | Detail |
|--------|--------|
| `getDelta()` is not idempotent | Call it exactly once per frame and pass the result. Calling it twice resets the internal clock. |
| Transferable buffers are neutered | After `postMessage({ transfer: [buf.buffer] })`, `buf` is detached. Don't read it. |
| Cannon `removeEventListener` needs the exact reference | Store the handler in `entries` at registration time. |
| Floor is not in `objectsById` | It's static — transforms are never applied to it. Skipped silently by the `!obj` guard. |
| `ids[]` order must stay in sync on both threads | `addBody` pushes, `removeBody` splices — same operation on both sides. |
