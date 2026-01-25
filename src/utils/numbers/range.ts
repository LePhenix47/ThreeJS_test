/**
 * Maps a value from an old range to a new range.
 *
 * @param {number} value The value to map.
 * @param {[number, number]} oldRange The old range [min, max].
 * @param {[number, number]} newRange The new range [min, max].
 * @returns {number} The mapped value.
 *
 @example 
 * const oldValue = 0.5;
 * const oldRange = [0, 1];
 * const newRange = [-1, 1];
 * const newValue = getValueFromNewRange(oldValue, oldRange, newRange);
 * console.log(newValue); // 10
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
