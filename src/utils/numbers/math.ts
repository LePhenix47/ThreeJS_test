type DistanceOptions = {
  noSqrt?: boolean;
  subtract?: boolean;
};

export function distance(
  x: number,
  y: number,
  options: DistanceOptions = {},
): number {
  const { noSqrt = false, subtract = false } = options;

  const xSquared: number = x ** 2;
  const ySquared: number = y ** 2;

  const yMultiplier = subtract ? -1 : 1;
  const squared: number = xSquared + yMultiplier * ySquared;

  return noSqrt ? squared : Math.sqrt(squared);
}
