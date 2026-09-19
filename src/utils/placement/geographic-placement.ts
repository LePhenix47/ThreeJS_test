import * as THREE from "three";
import { Angle } from "@/utils/enums/angles";
import { cosDegrees, sinDegrees } from "@/utils/numbers/angles";

type GeographicCoordinates = {
  /** Degrees, -90 (south) to 90 (north). */
  latitude: number;
  /** Degrees, positive east of the prime meridian. */
  longitude: number;
  radius: number;
};

export function getSphereFromGeographicCoordinates({
  latitude,
  longitude,
  radius,
}: GeographicCoordinates): THREE.Vector3Like {
  if (![latitude, longitude, radius].every(Number.isFinite)) {
    throw new TypeError(
      "latitude, longitude and radius must be numbers and finite ones",
    );
  }

  if (Math.abs(latitude) > Angle.RightAngle) {
    throw new RangeError("Latitude must be between -90° and 90°");
  }

  const cosLatitude: number = cosDegrees(latitude);

  // ? Matches THREE.SphereGeometry's UV layout: +Y is north, longitude 0 sits on +X and east runs toward -Z
  const x: number = radius * cosLatitude * cosDegrees(longitude);
  const y: number = radius * sinDegrees(latitude);
  const z: number = -radius * cosLatitude * sinDegrees(longitude);

  return {
    x,
    y,
    z,
  };
}
