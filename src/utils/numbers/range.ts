/**
 * Maps a value from an old range to a new range.
 *
 * @param {number} value The value to map.
 * @param {[number, number]} oldRange The old range [min, max].
 * @param {[number, number]} newRange The new range [min, max].
 * @returns {number} The mapped value.
 *
 * @example
 * const oldValue = 0.5;
 * const oldRange = [0, 1];
 * const newRange = [-1, 1];
 * const newValue = getValueFromNewRange(oldValue, oldRange, newRange);
 * console.log(newValue); // 0
 */
export function getValueFromNewRange(
  value: number,
  oldRange: [number, number],
  newRange: [number, number],
): number {
  const [oldMin, oldMax] = oldRange;
  const [newMin, newMax] = newRange;

  const slope: number = (newMax - newMin) / (oldMax - oldMin);

  return newMin + (value - oldMin) * slope;
}

/**
 * Returns a random number within the specified range.
 * The inclusion range can be "min", "max", "both", or "none".
 * `"min"`, the minimum value is included.
 *
 * `"max"`, the maximum value is included.
 *
 * `"both"`, both the minimum and maximum values are included.
 *
 * `"none"`, neither the minimum nor maximum values are included.
 *
 * @param {[number, number]} range The range [min, max] to generate a random number within.
 * @param {"min" | "max" | "both" | "none"} inclusionRange The inclusion range to use.
 * @returns {number} A random number within the specified range.
 * @throws {Error} If the inclusion range is invalid.
 */
export function randomInRange(
  [min, max]: [number, number],
  inclusionRange: "min" | "max" | "both" | "none" = "min",
): number {
  if (min > max) {
    throw new RangeError(`Invalid range: ${min} > ${max}`);
  }

  const rangeOperatorMap = new Map(
    Object.entries({
      min: randomIncludeMinExcludeMax,
      max: randomExcludeMinIncludeMax,
      both: randomIncludeBoth,
      none: randomExcludeBoth,
    }),
  );

  const randomOperator = rangeOperatorMap.get(inclusionRange);

  if (!randomOperator) {
    throw new Error(`Invalid inclusion range: ${inclusionRange}`);
  }

  return randomOperator(min, max);
}

// --- Helper Functions ---
function randomIncludeMinExcludeMax(min: number, max: number): number {
  // ? [min, max[
  return min + Math.random() * (max - min);
}

function randomExcludeMinIncludeMax(min: number, max: number): number {
  // ? ]min, max]
  return max - Math.random() * (max - min);
}

function randomExcludeBoth(min: number, max: number): number {
  // ? ]min, max[
  const tinyOffset = getTinyOffset(min);
  const adjustedMin = min + tinyOffset;
  const adjustedMax = max - tinyOffset;

  return adjustedMin + Math.random() * (adjustedMax - adjustedMin);
}

function randomIncludeBoth(min: number, max: number): number {
  // ? [min, max]
  return min + Math.random() * (max - min);
}

function getTinyOffset(reference: number): number {
  return Number.EPSILON * Math.max(1, Math.abs(reference));
}
