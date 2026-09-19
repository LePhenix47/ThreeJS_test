import * as THREE from "three";

type SphereCoordinates = {
  rho: number;
  phi: number;
  theta: number;
};

type SphereCoordsOptions = {
  options?: {};
};

export function getSphereFromCoordinates({
  rho,
  phi,
  theta,
  options = {},
}: SphereCoordinates & SphereCoordsOptions): THREE.Vector3Like {
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

  const xyPlane: number = rho * Math.sin(phiRad);
  const x: number = xyPlane * Math.cos(thetaRad);
  const y: number = xyPlane * Math.sin(thetaRad);
  const z: number = rho * Math.cos(phiRad);

  return {
    x,
    y,
    z,
  };
}
