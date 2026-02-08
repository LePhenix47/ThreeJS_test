import { randomInRange } from "@utils/numbers/range";
import * as THREE from "three";

export type Position2D = Pick<THREE.Vector3, "x" | "z">;

const ONE_REVOLUTION: number = 2 * Math.PI;

/**
 * Generates a random position within an annulus (ring) using equal area distribution.
 * This prevents clustering near the inner circle by sampling area-uniformly.
 *
 * @param {number} minRadius - The inner radius of the annulus (exclusion zone).
 * @param {number} maxRadius - The outer radius of the annulus (boundary).
 * @returns {Position2D} A random (x, z) position within the annulus.
 *
 * @see EQUAL_AREA_DISTRIBUTION.md for the mathematical derivation.
 */
export function generateRandomAnnulusPosition(
  minRadius: number,
  maxRadius: number,
): Position2D {
  const randomAngle: number = randomInRange([0, ONE_REVOLUTION]);

  // ? Equal area distribution, see EQUAL_AREA_DISTRIBUTION.md for details
  const randomRadius: number = Math.sqrt(
    randomInRange([minRadius ** 2, maxRadius ** 2]),
  );

  return {
    x: randomRadius * Math.cos(randomAngle),
    z: randomRadius * Math.sin(randomAngle),
  };
}

/**
 * Checks if a candidate position overlaps with any already-placed position.
 * Treats items as circles on the XZ plane (cylinder bounding volumes).
 *
 * @param {Position2D} candidate - The candidate position to check.
 * @param {Position2D[]} placedPositions - Array of already-placed positions.
 * @param {number} minDistance - Minimum allowed distance between two items (sum of both radii).
 * @returns {boolean} `true` if the candidate overlaps with any placed position.
 */
export function hasOverlapWithPlaced(
  candidate: Position2D,
  placedPositions: Position2D[],
  minDistance: number,
): boolean {
  return placedPositions.some((placed) => {
    const dx: number = candidate.x - placed.x;
    const dz: number = candidate.z - placed.z;
    const distance: number = Math.sqrt(dx ** 2 + dz ** 2);

    return distance < minDistance;
  });
}

/**
 * Finds a non-overlapping position within an annulus using brute force rejection.
 * Generates random candidates and retries until one doesn't overlap with existing positions.
 *
 * @param {Position2D[]} placedPositions - Array of already-placed positions.
 * @param {number} objectBoundingRadius - The bounding circle radius of a single item.
 * @param {number} minRadius - The inner radius of the annulus.
 * @param {number} maxRadius - The outer radius of the annulus.
 * @param {number} itemIndex - The index of the current item (used for warning messages).
 * @returns {Position2D} A non-overlapping (x, z) position, or a random one if max retries exceeded.
 */
export function findPositionBruteForce(
  placedPositions: Position2D[],
  objectBoundingRadius: number,
  minRadius: number,
  maxRadius: number,
  itemIndex: number,
): Position2D {
  const maxRetries: number = 100;
  const minDistance: number = objectBoundingRadius * 2;

  let candidate: Position2D = {
    x: 0,
    z: 0,
  };
  let retries: number = 0;

  let hasOverlap = true;
  while (hasOverlap && retries < maxRetries) {
    candidate = generateRandomAnnulusPosition(minRadius, maxRadius);
    hasOverlap = hasOverlapWithPlaced(candidate, placedPositions, minDistance);

    retries++;
  }

  if (retries >= maxRetries) {
    console.warn(
      `Item ${itemIndex}: Could not find a non-overlapping position after ${maxRetries} retries`,
    );
  }

  return candidate;
}
