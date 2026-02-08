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

/**
 * Finds a position within an annulus using a simplified Mitchell's Best Candidate algorithm.
 * Generates K random candidates and picks the one with the most breathing room
 * (largest minimum distance to all already-placed positions).
 *
 * NOTE: This is a simplified version of the original algorithm. Key differences:
 * - Uses linear scan instead of a quadtree for nearest-neighbor lookup.
 * - Uses a fixed K instead of increasing it as the space fills up.
 * - Does not guarantee minimum spacing (best-effort only).
 *
 * @param {Position2D[]} placedPositions - Array of already-placed positions.
 * @param {number} candidateCount - Number of candidates to generate (K). Higher = better spacing, more computation.
 * @param {number} minRadius - The inner radius of the annulus.
 * @param {number} maxRadius - The outer radius of the annulus.
 * @returns {Position2D} The candidate with the largest minimum distance to all placed positions.
 *
 * @see {@link https://gist.github.com/mbostock/1893974} Mitchell's Best-Candidate by Mike Bostock
 */
export function findPositionMitchellBestCandidate(
  placedPositions: Position2D[],
  candidateCount: number,
  minRadius: number,
  maxRadius: number,
): Position2D {
  // ? First point has no neighbors to compare against, place it randomly
  if (placedPositions.length === 0) {
    return generateRandomAnnulusPosition(minRadius, maxRadius);
  }

  let bestCandidate: Position2D = generateRandomAnnulusPosition(
    minRadius,
    maxRadius,
  );
  let bestMinDistance: number = -1;

  for (let k = 0; k < candidateCount; k++) {
    const candidate = generateRandomAnnulusPosition(minRadius, maxRadius);

    // ? Find the closest already-placed neighbor for this candidate
    let closestDistance: number = Infinity;

    for (const placed of placedPositions) {
      const dx: number = candidate.x - placed.x;
      const dz: number = candidate.z - placed.z;
      const distance: number = Math.sqrt(dx ** 2 + dz ** 2);

      if (distance < closestDistance) {
        closestDistance = distance;
      }
    }

    // ? If this candidate's closest neighbor is farther than the current best, it wins
    if (closestDistance > bestMinDistance) {
      bestMinDistance = closestDistance;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

// * ==========================================
// * Bridson's Poisson Disk Sampling - Helpers
// * ==========================================

type BridsonGrid = {
  cells: number[];
  cols: number;
  rows: number;
  cellSize: number;
  offset: number;
};

type BridsonConfig = {
  minDistance: number;
  annulusMinRadius: number;
  annulusMaxRadius: number;
  maxTries?: number;
};

/**
 * Converts (col, row) grid coordinates to a flat array index.
 *
 * @param {number} col - The column index.
 * @param {number} row - The row index.
 * @param {number} cols - Total number of columns in the grid.
 * @returns {number} The flat index into the grid array.
 */
function toFlatIndex(col: number, row: number, cols: number): number {
  return col + row * cols;
}

/**
 * Checks if a position falls inside the annulus (ring) region.
 *
 * @param {Position2D} position - The position to check.
 * @param {number} minRadius - Inner radius of the annulus.
 * @param {number} maxRadius - Outer radius of the annulus.
 * @returns {boolean} `true` if the position is inside the annulus.
 */
function isInsideAnnulus(
  { x, z }: Position2D,
  minRadius: number,
  maxRadius: number,
): boolean {
  const distFromCenter: number = Math.sqrt(x ** 2 + z ** 2);

  return distFromCenter >= minRadius && distFromCenter <= maxRadius;
}

// * ==========================================
// * Bridson's Poisson Disk Sampling - Class
// * ==========================================

/**
 * Generates positions within an annulus using Bridson's Poisson Disk Sampling algorithm.
 * Uses a background grid for O(1) neighbor lookups, achieving O(N) total complexity.
 *
 * Unlike brute force and Mitchell's, this returns ALL positions at once.
 * The number of points is determined by the algorithm (fills the space until no more fit),
 * not by the caller.
 *
 * NOTE: The grid is rectangular (bounding box of the annulus). Points outside the annulus
 * are rejected via a simple distance-from-center check. Empty grid cells are wasted memory
 * but negligible for typical use cases.
 *
 * NOTE: This class is single-use. Create a new instance for each sampling run.
 *
 * @see {@link https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf} Bridson's original paper
 * @see {@link https://www.jasondavies.com/poisson-disc/} Interactive visualization by Jason Davies
 * @see {@link https://www.youtube.com/watch?v=mj_qBX-_pzg} "Episode 4 - Poisson disc | Bridson's algorithm" by The Big InT
 */
export class BridsonPoissonDiskSampler {
  private readonly minDistance: number;
  private readonly annulusMinRadius: number;
  private readonly annulusMaxRadius: number;
  private readonly maxTries: number;

  private readonly grid: BridsonGrid;
  private readonly placedPoints: Position2D[];
  private readonly activeList: number[];

  constructor({
    minDistance,
    annulusMinRadius,
    annulusMaxRadius,
    maxTries = 30,
  }: BridsonConfig) {
    this.minDistance = minDistance;
    this.annulusMinRadius = annulusMinRadius;
    this.annulusMaxRadius = annulusMaxRadius;
    this.maxTries = maxTries;

    // Cell size = minDistance / √2 guarantees at most one point per cell
    // (cell diagonal = cellSize * √2 = minDistance)
    const cellSize: number = minDistance / Math.SQRT2;
    const gridWidth: number = annulusMaxRadius * 2;
    const cols: number = Math.ceil(gridWidth / cellSize);
    const rows: number = Math.ceil(gridWidth / cellSize);

    this.grid = {
      cells: new Array(cols * rows).fill(-1),
      cols,
      rows,
      cellSize,
      offset: annulusMaxRadius,
    };

    this.placedPoints = [];
    this.activeList = [];
  }

  /**
   * Runs the Poisson Disk Sampling algorithm and returns all generated positions.
   *
   * @returns {Position2D[]} Array of all generated positions with guaranteed minimum spacing.
   */
  generate = (): Position2D[] => {
    // * Step 1: Place first point randomly in the annulus
    const firstPoint: Position2D = generateRandomAnnulusPosition(
      this.annulusMinRadius,
      this.annulusMaxRadius,
    );

    this.placedPoints.push(firstPoint);
    this.activeList.push(0);
    this.grid.cells[this.toGridIndex(firstPoint)] = 0;

    // * Step 2: Process active list until empty
    while (this.activeList.length > 0) {
      const randomActiveIndex: number = Math.floor(
        Math.random() * this.activeList.length,
      );
      const activePointIndex: number = this.activeList[randomActiveIndex];
      const activePoint: Position2D = this.placedPoints[activePointIndex];

      let foundValid: boolean = false;

      // ? Try K candidates around this active point
      for (let k = 0; k < this.maxTries; k++) {
        const candidate: Position2D = this.generateCandidateAround(activePoint);

        if (
          !isInsideAnnulus(
            candidate,
            this.annulusMinRadius,
            this.annulusMaxRadius,
          )
        ) {
          continue;
        }

        if (this.isTooCloseToNeighbors(candidate)) {
          continue;
        }

        // ? Valid candidate: add to grid, placed points, and active list
        const pointIndex: number = this.placedPoints.length;

        this.placedPoints.push(candidate);
        this.activeList.push(pointIndex);
        this.grid.cells[this.toGridIndex(candidate)] = pointIndex;

        foundValid = true;
        break;
      }

      // ? If no valid candidate was found, this point is exhausted
      if (!foundValid) {
        this.activeList.splice(randomActiveIndex, 1);
      }
    }

    return this.placedPoints;
  };

  /**
   * Converts a world position to a flat grid cell index.
   *
   * @param {Position2D} position - The world position.
   * @returns {number} The flat index into the grid array.
   */
  private toGridIndex = ({ x, z }: Position2D): number => {
    const { offset, cellSize, cols } = this.grid;

    const col: number = Math.floor((x + offset) / cellSize);
    const row: number = Math.floor((z + offset) / cellSize);

    return toFlatIndex(col, row, cols);
  };

  /**
   * Checks if a candidate position is too close to any existing point
   * by scanning the 5x5 grid neighborhood. O(1) lookup.
   *
   * @param {Position2D} candidate - The candidate position to check.
   * @returns {boolean} `true` if the candidate is too close to an existing point.
   */
  private isTooCloseToNeighbors = (candidate: Position2D): boolean => {
    const { cols, rows, cells } = this.grid;

    const candidateGridIndex: number = this.toGridIndex(candidate);
    const candidateCol: number = candidateGridIndex % cols;
    const candidateRow: number = Math.floor(candidateGridIndex / cols);

    const minDistSquared: number = this.minDistance ** 2;

    // ? Check 5x5 neighborhood around the candidate's cell
    for (let dRow = -2; dRow <= 2; dRow++) {
      for (let dCol = -2; dCol <= 2; dCol++) {
        const neighborCol: number = candidateCol + dCol;
        const neighborRow: number = candidateRow + dRow;

        const isOutOfBounds: boolean =
          neighborCol < 0 ||
          neighborCol >= cols ||
          neighborRow < 0 ||
          neighborRow >= rows;

        if (isOutOfBounds) {
          continue;
        }

        const cellIndex: number = toFlatIndex(neighborCol, neighborRow, cols);
        const pointIndex: number = cells[cellIndex];

        if (pointIndex === -1) {
          continue;
        }

        const { x: nx, z: nz } = this.placedPoints[pointIndex];
        const dx: number = candidate.x - nx;
        const dz: number = candidate.z - nz;

        if (dx ** 2 + dz ** 2 < minDistSquared) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * Generates a random candidate in a ring [minDistance, 2 * minDistance] around a point.
   *
   * @param {Position2D} point - The center point to generate around.
   * @returns {Position2D} A random position in the ring around the point.
   */
  private generateCandidateAround = (point: Position2D): Position2D => {
    const angle: number = randomInRange([0, ONE_REVOLUTION]);
    const radius: number = randomInRange([
      this.minDistance,
      2 * this.minDistance,
    ]);

    return {
      x: point.x + radius * Math.cos(angle),
      z: point.z + radius * Math.sin(angle),
    };
  };
}
