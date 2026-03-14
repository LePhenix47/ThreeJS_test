import * as CANNON from "cannon-es";

import type {
  AddBodyMessage,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "@utils/types/physics-worker.types";

// ─── Types ────────────────────────────────────────────────────────────────────

type CollisionHandler = (event: { contact: CANNON.ContactEquation }) => void;

type BodyEntry = {
  body: CANNON.Body;
  collisionHandler: CollisionHandler;
};

// ─── World setup ──────────────────────────────────────────────────────────────

const world = new CANNON.World();
const entries = new Map<string, BodyEntry>();
const ids: string[] = [];

const concreteMaterial = new CANNON.Material("concrete");
const plasticMaterial = new CANNON.Material("plastic");

world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.addContactMaterial(
  new CANNON.ContactMaterial(concreteMaterial, plasticMaterial, {
    friction: 0.1,
    restitution: 0.7,
  }),
);

// ─── Body helpers ─────────────────────────────────────────────────────────────

function createCannonBody(msg: AddBodyMessage): CANNON.Body {
  if (msg.shape === "sphere") {
    return new CANNON.Body({
      mass: msg.mass,
      shape: new CANNON.Sphere(msg.radius ?? 0.5),
    });
  }

  if (msg.shape === "box") {
    const { x, y, z } = msg.dimensions ?? { x: 1, y: 1, z: 1 };
    return new CANNON.Body({
      mass: msg.mass,
      shape: new CANNON.Box(new CANNON.Vec3(x / 2, y / 2, z / 2)),
    });
  }

  // plane — always static, always rotated flat
  const body = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
  return body;
}

function registerBody(
  body: CANNON.Body,
  id: string,
  material: "concrete" | "plastic",
): void {
  body.material = material === "concrete" ? concreteMaterial : plasticMaterial;

  const collisionHandler: CollisionHandler = ({ contact }) => {
    const velocity = contact.getImpactVelocityAlongNormal();
    if (Math.abs(velocity) < 1.5) return;

    self.postMessage({
      type: "collision",
      id,
      velocity: Math.abs(velocity),
    } satisfies WorkerOutboundMessage);
  };

  body.addEventListener("collide", collisionHandler);
  world.addBody(body);

  entries.set(id, { body, collisionHandler });
  ids.push(id);
}

// ─── Message handlers ─────────────────────────────────────────────────────────

function handleAddBody(msg: AddBodyMessage): void {
  const body = createCannonBody(msg);

  if (msg.shape !== "plane") {
    const { x, y, z } = msg.position;
    body.position.set(x, y, z);

    if (msg.rotation) {
      body.quaternion.setFromEuler(
        msg.rotation.x,
        msg.rotation.y,
        msg.rotation.z,
      );
    }
  }

  registerBody(body, msg.id, msg.material);
}

function handleRemoveBody(id: string): void {
  const entry = entries.get(id);
  if (!entry) return;

  const { body, collisionHandler } = entry;
  body.removeEventListener("collide", collisionHandler);
  world.removeBody(body);

  entries.delete(id);
  ids.splice(ids.indexOf(id), 1);
}

function handleStep(delta: number): void {
  world.step(1 / 60, delta, 3);

  const buffer = new Float32Array(ids.length * 7);

  for (let i = 0; i < ids.length; i++) {
    const { body } = entries.get(ids[i])!;
    const o = i * 7;

    buffer[o] = body.position.x;
    buffer[o + 1] = body.position.y;
    buffer[o + 2] = body.position.z;
    buffer[o + 3] = body.quaternion.x;
    buffer[o + 4] = body.quaternion.y;
    buffer[o + 5] = body.quaternion.z;
    buffer[o + 6] = body.quaternion.w;
  }

  self.postMessage(
    { type: "transforms", data: buffer } satisfies WorkerOutboundMessage,
    { transfer: [buffer.buffer] },
  );
}

// ─── Message dispatcher ───────────────────────────────────────────────────────

self.onmessage = ({ data }: MessageEvent<WorkerInboundMessage>) => {
  switch (data.type) {
    case "addBody":
      handleAddBody(data);
      break;
    case "removeBody":
      handleRemoveBody(data.id);
      break;
    case "setGravity":
      world.gravity.set(data.x, data.y, data.z);
      break;
    case "step":
      handleStep(data.delta);
      break;
    default: {
      const _exhaustive: never = data;
      console.warn("[physics.worker] Unknown message type:", _exhaustive);
    }
  }
};
