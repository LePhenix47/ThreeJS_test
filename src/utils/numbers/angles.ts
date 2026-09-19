import * as THREE from "three";

/** Sine of an angle given in degrees. */
export function sinDegrees(angle: number): number {
  return Math.sin(THREE.MathUtils.degToRad(angle));
}

/** Cosine of an angle given in degrees. */
export function cosDegrees(angle: number): number {
  return Math.cos(THREE.MathUtils.degToRad(angle));
}
