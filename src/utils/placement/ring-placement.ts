import { randomInRange } from "@utils/numbers/range";
import * as THREE from "three";

export type Position2D = Pick<THREE.Vector3, "x" | "z">;

const ONE_REVOLUTION: number = 2 * Math.PI;

/**
 * Generates a random position within a ring using equal area distribution.
 * This prevents clustering near the inner circle by sampling area-uniformly.
 *
 * @param {number} minRadius - The inner radius of the ring (exclusion zone).
 * @param {number} maxRadius - The outer radius of the ring (boundary).
 * @returns {Position2D} A random (x, z) position within the ring.
 */
export function generateRandomRingPosition(
  minRadius: number,
  maxRadius: number,
): Position2D {
  const randomAngle: number = randomInRange({ max: ONE_REVOLUTION });

  // ? Equal area distribution: sample radius² uniformly, then sqrt, so area (not radius) is uniform
  const randomRadius: number = Math.sqrt(
    randomInRange({ min: minRadius ** 2, max: maxRadius ** 2 }),
  );

  return {
    x: randomRadius * Math.cos(randomAngle),
    z: randomRadius * Math.sin(randomAngle),
  };
}
