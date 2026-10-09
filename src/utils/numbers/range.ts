export type RoundingMode = keyof Pick<typeof Math, "floor" | "round" | "ceil">;

/** Applies `rounding` to `value`, or returns `value` unchanged when `rounding` is omitted. */
function applyRounding(value: number, rounding?: RoundingMode): number {
  if (!rounding) return value;

  return Math[rounding](value);
}

type RemapOptions = {
  value: number;
  /** Input range `[min, max]`. Defaults to `[0, 1]`. */
  input?: [min: number, max: number];
  /** Output range `[min, max]`. Omitted: `value` is passed through unmapped (rounding still applies). */
  output?: [min: number, max: number];
  /** Rounds the mapped value, e.g. when the output range represents an integer count. Skipped when omitted. */
  rounding?: RoundingMode;
};

/**
 * Maps `value` from the input range to the output range.
 *
 * @example
 * const newValue = remap({ value: 0.5, input: [0, 1], output: [-1, 1] });
 * console.log(newValue); // 0
 */
export function remap({
  value,
  input = [0, 1],
  output,
  rounding,
}: RemapOptions): number {
  const mapped: number = output ? mapToRange(value, input, output) : value;

  return applyRounding(mapped, rounding);
}

function mapToRange(
  value: number,
  [inputMin, inputMax]: [number, number],
  [outputMin, outputMax]: [number, number],
): number {
  const slope: number = (outputMax - outputMin) / (inputMax - inputMin);

  return outputMin + (value - inputMin) * slope;
}

type RandomInRangeOptions = {
  /** Defaults to `0`. */
  min?: number;
  /** Defaults to `1`. */
  max?: number;
  /** Rounds the result, e.g. when the range represents an integer count. Skipped when omitted. */
  rounding?: RoundingMode;
};

/**
 * Returns a random number in `[min, max)`.
 *
 * @throws {RangeError} If `min > max`.
 */
export function randomInRange({
  min = 0,
  max = 1,
  rounding,
}: RandomInRangeOptions = {}): number {
  if (min > max) {
    throw new RangeError(`Invalid range: ${min} > ${max}`);
  }

  const result: number = min + Math.random() * (max - min);

  return applyRounding(result, rounding);
}
