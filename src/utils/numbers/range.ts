type RangeMapping = {
  inputMin: number;
  inputMax: number;
  outputMin: number;
  outputMax: number;
};

/**
 * Maps a value from an input range to an output range.
 *
 * @param {number} value The value to map.
 * @param {RangeMapping} mapping The input and output range bounds.
 * @returns {number} The mapped value.
 *
 * @example
 * const newValue = getValueFromNewRange(0.5, { inputMin: 0, inputMax: 1, outputMin: -1, outputMax: 1 });
 * console.log(newValue); // 0
 */
export function getValueFromNewRange(
  value: number,
  { inputMin, inputMax, outputMin, outputMax }: RangeMapping,
): number {
  const slope: number = (outputMax - outputMin) / (inputMax - inputMin);

  return outputMin + (value - inputMin) * slope;
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
 * @param {number} min The minimum value of the range.
 * @param {number} max The maximum value of the range.
 * @param {"min" | "max" | "both" | "none"} inclusionRange The inclusion range to use.
 * @returns {number} A random number within the specified range.
 * @throws {Error} If the inclusion range is invalid.
 */
export function randomInRange(
  min: number,
  max: number,
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
