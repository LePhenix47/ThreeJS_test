import * as CANNON from "cannon-es";

import type {
  AddBodyMessage,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@utils/types/physics-worker.types";

import CannonBodyFactory from "@utils/classes/cannon-body-factory";

// ─── Types ────────────────────────────────────────────────────────────────────

type CollisionHandler = (event: { contact: CANNON.ContactEquation }) => void;

type BodyEntry = {
  body: CANNON.Body;
  collisionHandler: CollisionHandler;
};

// ─── Physics World for the Web Worker ─────────────────────────────────────────────────────────────

/**
 * Self-contained physics simulation that runs entirely inside the Web Worker.
 *
 * Owns the Cannon-es world, all registered bodies, and the ordered `ids` array
 * that maps index `i` to the i-th body's 7-float block in each `transforms`
 * `Float32Array`.
 *
 * Communicates with the main thread exclusively via `self.postMessage`:
 * - `transforms` — emitted every step, carries position + quaternion for every body
 * - `collision`  — emitted when an impact exceeds the velocity threshold
 */
class PhysicsWorldWorker {
  private readonly defaultMaterial = new CANNON.Material("default");

  private readonly concreteMaterial = new CANNON.Material("concrete");
  private readonly plasticMaterial = new CANNON.Material("plastic");

  private readonly world: CANNON.World;

  /**
   * Ordered list of body IDs — mirrors the worker-side `ids[]` in PhysicsManager.
   *
   * Must be an array (not `Set` or `Map`) because the transform loop needs O(1)
   * integer index access: `ids[i]` maps directly to the i-th body's 7-float block
   * in the `Float32Array`. Removal is O(n) via `indexOf + splice`, but removals are
   * rare compared to the per-frame step, so the array is the right trade-off.
   */
  private readonly ids: string[] = [];
  private readonly entries = new Map<string, BodyEntry>();

  constructor() {
    this.world = this.initWorld();
  }

  // ─── World setup ────────────────────────────────────────────────────────────

  /**
   * Creates and configures the Cannon-es physics world.
   *
   * - `SAPBroadphase` (Sweep and Prune): sorts bodies along axes and only tests
   *   pairs that overlap — O(n log n) vs the default `NaiveBroadphase`'s O(n²).
   * - `allowSleep`: bodies that come to rest are removed from simulation entirely
   *   until disturbed, saving physics budget on inactive objects.
   *
   * A `CANNON.Material` is just a named tag — physical behaviour (friction,
   * restitution) is defined on `CANNON.ContactMaterial`, which describes what
   * happens when two specific materials collide.
   *
   * - `friction`    — resistance to sliding (0 = ice, 1 = rubber)
   * - `restitution` — bounciness (0 = no bounce, 1 = perfectly elastic)
   */
  private initWorld = (): CANNON.World => {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    /*
     * NaiveBroadphase (default) checks every body against every other — O(n²).
     * SAPBroadphase sorts bodies along axes and only tests overlapping pairs,
     * keeping cost closer to O(n log n) for large scenes.
     */
    world.broadphase = new CANNON.SAPBroadphase(world);

    /*
     * Bodies that have come to rest stop being simulated entirely until disturbed.
     * Avoids wasting physics budget on objects that aren't moving.
     */
    world.allowSleep = true;

    const plasticConcreteContactMaterial = new CANNON.ContactMaterial(
      this.concreteMaterial,
      this.plasticMaterial,
      {
        friction: 0.1,
        restitution: 0.7,
      },
    );
    world.addContactMaterial(plasticConcreteContactMaterial);

    const defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.1,
        restitution: 0.7,
      },
    );
    world.defaultContactMaterial = defaultContactMaterial;

    return world;
  };

  // ─── Body registration ──────────────────────────────────────────────────────

  private createCollisionHandler = (id: string): CollisionHandler => {
    return ({ contact }) => {
      const velocity = contact.getImpactVelocityAlongNormal();
      if (Math.abs(velocity) < 1.5) return;

      self.postMessage({
        type: "collision",
        id,
        velocity: Math.abs(velocity),
      } satisfies WorkerOutboundMessage);
    };
  };

  private registerBody = (
    body: CANNON.Body,
    id: string,
    material: "concrete" | "plastic",
  ): void => {
    body.material =
      material === "concrete" ? this.concreteMaterial : this.plasticMaterial;

    const collisionHandler = this.createCollisionHandler(id);

    body.addEventListener("collide", collisionHandler);
    this.world.addBody(body);

    this.entries.set(id, { body, collisionHandler });
    this.ids.push(id);
  };

  // ─── Message handlers ────────────────────────────────────────────────────────

  addBody = (msg: AddBodyMessage): void => {
    switch (msg.shape) {
      case "sphere": {
        const body = CannonBodyFactory.sphere(msg.radius ?? 0.5, msg.position);
        this.registerBody(body, msg.id, msg.material);
        break;
      }
      case "box": {
        const body = CannonBodyFactory.box(
          msg.dimensions ?? { x: 1, y: 1, z: 1 },
          msg.position,
          msg.rotation,
        );
        this.registerBody(body, msg.id, msg.material);
        break;
      }
      case "plane": {
        // position and rotation ignored — always static at origin
        const body = CannonBodyFactory.floor();
        this.registerBody(body, msg.id, msg.material);
        break;
      }
    }
  };

  removeBody = (id: string): void => {
    const entry = this.entries.get(id);
    if (!entry) return;

    const { body, collisionHandler } = entry;
    body.removeEventListener("collide", collisionHandler);
    this.world.removeBody(body);

    this.entries.delete(id);
    this.ids.splice(this.ids.indexOf(id), 1);
  };

  setGravity = (x: number, y: number, z: number): void => {
    this.world.gravity.set(x, y, z);
  };

  step = (delta: number): void => {
    const tickRate = 1 / 60;
    this.world.step(tickRate, delta, 3);

    const cannonBuffer = new Float32Array(this.ids.length * 7);

    for (let i = 0; i < this.ids.length; i++) {
      const { body } = this.entries.get(this.ids[i])!;
      const o = i * 7;

      cannonBuffer[o] = body.position.x;
      cannonBuffer[o + 1] = body.position.y;
      cannonBuffer[o + 2] = body.position.z;
      cannonBuffer[o + 3] = body.quaternion.x;
      cannonBuffer[o + 4] = body.quaternion.y;
      cannonBuffer[o + 5] = body.quaternion.z;
      cannonBuffer[o + 6] = body.quaternion.w;
    }

    self.postMessage(
      {
        type: "transforms",
        data: cannonBuffer,
      } satisfies WorkerOutboundMessage,
      { transfer: [cannonBuffer.buffer] },
    );
  };
}

// ─── Message dispatcher ───────────────────────────────────────────────────────

const physicsForWorker = new PhysicsWorldWorker();

self.onmessage = ({ data }: MessageEvent<WorkerInboundMessage>) => {
  switch (data.type) {
    case "addBody":
      physicsForWorker.addBody(data);
      break;
    case "removeBody":
      physicsForWorker.removeBody(data.id);
      break;
    case "setGravity":
      physicsForWorker.setGravity(data.x, data.y, data.z);
      break;
    case "step":
      physicsForWorker.step(data.delta);
      break;
    default: {
      const _exhaustive: never = data;
      console.warn("[physics.worker] Unknown message type:", _exhaustive);
    }
  }
};
