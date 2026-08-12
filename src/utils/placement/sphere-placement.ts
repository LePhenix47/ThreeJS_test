import { getValueFromNewRange, randomInRange } from "@utils/numbers/range";

function getRandomRho(minRadius: number = 0, maxRadius: number = 10) {
  const smallRhoCubed: number = minRadius ** 3;
  const bigRhoCubed: number = maxRadius ** 3;
  /*
   * V = 4π/3 × ρ³
   * ρ = ∛((3/4π) * V)
   *
   * If V is uniform random value between range
   * V = V_max - V_min
   * V = (4π/3 × ρ_max³) - (4π/3 × ρ_min³)
   * V = (4π/3) × (ρ_max³ - ρ_min³)
   *
   * Then take value to new range:
   * V_random = V_min + rand() (V_max - V_min)
   *
   * V_random =(4π/3) ρ_min³  + rand()(4π/3)(ρ_max³ - ρ_min³)
   * V_random =(4π/3) (ρ_min³  + rand()(ρ_max³ - ρ_min³))
   *
   * ρ_random = ∛((3/4π) * V_random)
   * ρ_random = ∛((3/4π) * (4π/3) (ρ_min³  + rand()(ρ_max³ - ρ_min³)))
   * ↔
   * ρ_random = ∛(ρ_min³ + rand() × (ρ_max³ - ρ_min³))
   */
  const randomRho: number = Math.cbrt(
    randomInRange(smallRhoCubed, bigRhoCubed),
  );

  return randomRho;
}

/**
 * Generates a random 3D scatter offset using uniform sphere sampling.
 *
 * Direction is sampled uniformly across the sphere (avoiding pole clustering),
 * magnitude follows a power-law distribution controlled by `randomnessPower`,
 * and the Y component is scaled down by `squash` to flatten the scatter into a disc.
 *
 * @returns A `{x, y, z}` offset to apply to a star's spiral arm position.
 */
export function getRandomUniformSpherePlacement(
  minRadius: number,
  maxRadius: number,
) {
  // ? Horizontal position - Spherical coordinates: [0, 2π[
  const randomTheta: number = randomInRange(0, 2 * Math.PI);

  // ? Vertical position - Spherical coordinates: [-1, 1]
  const randomPhi: number = Math.acos(1 - 2 * Math.random());

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

export function generateSphericalRandomness({
  randomness,
  randomnessPower,
  squash,
  heightFalloff = 1,
}: {
  randomness: number;
  randomnessPower: number;
  squash: number;
  /** Vertical taper factor `[0..1]`. `1 - distanceFromCenter / radius` gives disc shape. */
  heightFalloff?: number;
}): {
  x: number;
  y: number;
  z: number;
} {
  const theta: number = Math.random() * 2 * Math.PI;
  const phi: number = Math.acos(2 * Math.random() - 1);
  const rho: number = Math.pow(Math.random(), randomnessPower) * randomness;

  const xzPlanes3dRadius = rho * Math.sin(phi);

  return {
    x: xzPlanes3dRadius * Math.cos(theta),
    z: xzPlanes3dRadius * Math.sin(theta),
    y: rho * Math.cos(phi) * squash * heightFalloff,
  };
}
