import { randomInRange } from "@utils/numbers/range";
import * as THREE from "three";

/** Generates a random position uniformly distributed inside a cube of `size`, centered on the origin. */
export function generateRandomBoxPosition(size: number): THREE.Vector3Like {
  const halfSize: number = size / 2;

  return {
    x: randomInRange({ min: -halfSize, max: halfSize }),
    y: randomInRange({ min: -halfSize, max: halfSize }),
    z: randomInRange({ min: -halfSize, max: halfSize }),
  };
}
