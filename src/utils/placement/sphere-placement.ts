import * as THREE from "three";
import { randomInRange } from "@/utils/numbers/range";

type SphereCoordinates = {
  rho: number;
  phi: number;
  theta: number;
};

/**
 * Converts spherical coordinates to a Cartesian point.
 *
 * ? Math convention, not Three's: φ is measured from +Z (not +Y), so this is z-up.
 * ? Reusing it for anything Three-facing needs φ = 90° - latitude and a Y/Z axis swap —
 * ? see `getSphereFromGeographicCoordinates` for that dedicated, y-up version.
 */
export function getSphereFromCoordinates({
  rho,
  phi,
  theta,
}: SphereCoordinates): THREE.Vector3Like {
  if (![rho, phi, theta].every(Number.isFinite)) {
    // ? Number.isFinite checks for the type + NaN at the same time
    throw new TypeError("rho, phi and theta must be numbers and finite ones");
  }

  if (phi < 0 || phi > 180) {
    throw new RangeError("Phi angle must be between 0° and 180°");
  }

  //? (( θ % 360) + 360) % 360
  const normalizedTheta: number = THREE.MathUtils.euclideanModulo(theta, 360);

  const phiRad: number = THREE.MathUtils.degToRad(phi);
  const thetaRad: number = THREE.MathUtils.degToRad(normalizedTheta);

  /*
   * 2D polar coords: x = r·cos(θ), y = r·sin(θ)
   * In 3D, first project onto the xy-plane: that circle's radius shrinks to
   * rho·sin(phi) as phi sweeps away from the z axis. Apply the 2D formula on
   * that circle, then rho·cos(phi) gives the height along z.
   */
  const xyRadius: number = rho * Math.sin(phiRad);
  const x: number = xyRadius * Math.cos(thetaRad);
  const y: number = xyRadius * Math.sin(thetaRad);
  const z: number = rho * Math.cos(phiRad);

  return {
    x,
    y,
    z,
  };
}

/**
 * Random point in a spherical shell, evenly spread over the sphere's surface.
 * Picking phi uniformly would crowd points at the poles, so its cosine is picked instead.
 *
 */
export function getRandomUniformSpherePlacement(
  minRadius: number,
  maxRadius: number,
): THREE.Vector3Like {
  const rho: number = randomInRange(minRadius, maxRadius);
  const cosPhi: number = randomInRange(-1, 1, "both");
  // * cos²φ + sin²φ = 1² ⇔ sin(phi) = ±√(1 - cos²φ). Positive root: phi ∈ [0, π], where sin ≥ 0
  const sinPhi: number = Math.sqrt(1 - cosPhi ** 2);
  const theta: number = randomInRange(0, 2 * Math.PI); // ? radians directly, no degree round trip needed here

  const xyRadius: number = rho * sinPhi;
  const x: number = xyRadius * Math.cos(theta);
  const y: number = xyRadius * Math.sin(theta);
  const z: number = rho * cosPhi;

  return { x, y, z };
}
