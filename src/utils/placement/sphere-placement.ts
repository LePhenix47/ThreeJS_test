import { getValueFromNewRange } from "../numbers/range";

function getRandomRho(minRadius: number = 0, maxRadius: number = 10) {
  const volumeRandom: number = Math.random();

  const smallRhoCubed: number = minRadius ** 3;
  const bigRhoCubed: number = maxRadius ** 3;
  /*
   * V = 4π/3 × ρ³
   * ↔
   * ρ = ∛(ρ_min³ + u × (ρ_max³ - ρ_min³))
   */
  const randomRho: number = Math.cbrt(
    getValueFromNewRange(volumeRandom, [0, 1], [smallRhoCubed, bigRhoCubed]),
  );

  return randomRho;
}

export function getRandomUniformSpherePlacement(
  minRadius: number,
  maxRadius: number,
) {
  // ? Horizontal position - Spherical coordinates: [0, 2π[
  const randomTheta: number = getValueFromNewRange(
    Math.random(),
    [0, 1],
    [0, 2 * Math.PI],
  );

  // ? Vertical position - Spherical coordinates: [0, π]
  let randomPhi: number = getValueFromNewRange(
    Math.random(),
    [0, 1],
    [0, Math.PI],
  );

  // ? putting a random angle to φ won't suffice here because the
  randomPhi = Math.acos(1 - 2 * randomPhi);

  // ? Distance from the origin, a.k.a. radius in a 3D sphere, computed from a spherical volume
  const randomRho: number = getRandomRho(minRadius, maxRadius);

  /*
  * In 2D space the circular coords are
  * x: r*cos(θ) 
  * y: r*sin(θ)

  * In 3D space the radius is: 
  * x: ρ*sin(φ)*cos(θ)
  * y: ρ*sin(φ)*sin(θ)
  * z: ρ*cos(φ)
  */
  const xyPlaneRadius: number = randomRho * Math.sin(randomPhi);

  const x: number = xyPlaneRadius * Math.cos(randomTheta);
  const y: number = xyPlaneRadius * Math.sin(randomTheta);
  const z: number = randomRho * Math.cos(randomPhi);

  return { x, y, z };
}
