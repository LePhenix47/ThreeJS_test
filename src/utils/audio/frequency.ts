/** Average of frequencyData[start, start + count), normalized to 0-1. 0 for an empty/out-of-range slice. */
export function averageFrequencyRange(
  frequencyData: Uint8Array,
  start: number,
  count: number,
): number {
  const bins = frequencyData.subarray(start, start + count);
  if (bins.length === 0) return 0;

  const sum = bins.reduce((total, value) => total + value, 0);
  return sum / bins.length / 255;
}
