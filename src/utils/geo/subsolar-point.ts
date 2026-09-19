import { Angle } from "@/utils/enums/angles";
import {
  EarthOrbit,
  EarthRotation,
  EquationOfTime,
} from "@/utils/enums/astronomy";
import { TimeUnit } from "@/utils/enums/time";
import { getUtcDayOfYear, getUtcHoursIntoDay } from "@/utils/date/utc";
import { cosDegrees, sinDegrees } from "@/utils/numbers/angles";
import { wrapToRange } from "@/utils/numbers/range";

export type SubsolarPoint = {
  /** Degrees, -90 (south) to 90 (north). */
  latitude: number;
  /** Degrees, -180 (west) to 180 (east). */
  longitude: number;
};

/** Angle (degrees) the Earth has travelled around its orbit, `offsetDays` after the given day of the year. */
function getOrbitAngle(dayOfYear: number, offsetDays: number): number {
  const degreesPerDay: number = Angle.FullTurn / TimeUnit.DaysPerYear;

  return degreesPerDay * (dayOfYear + offsetDays);
}

/** Latitude (degrees) where the sun is overhead on the given day, swinging ±axial tilt over the year. */
export function getSolarDeclination(dayOfYear: number): number {
  const angle: number = getOrbitAngle(dayOfYear, EarthOrbit.SolsticeOffsetDays);

  return -EarthOrbit.AxialTiltDegrees * cosDegrees(angle);
}

/** Minutes the sun runs ahead of (+) or behind (-) a perfect 24h clock on the given day. */
export function getEquationOfTime(dayOfYear: number): number {
  const angle: number = getOrbitAngle(dayOfYear, -EquationOfTime.ReferenceDay);

  return (
    EquationOfTime.SecondHarmonicAmplitude *
      sinDegrees(EquationOfTime.SecondHarmonic * angle) -
    EquationOfTime.CosineAmplitude * cosDegrees(angle) -
    EquationOfTime.SineAmplitude * sinDegrees(angle)
  );
}

/** Returns the point on Earth where the sun is directly overhead at the given instant. */
export function getSubsolarPoint(date: Date): SubsolarPoint {
  const dayOfYear: number = getUtcDayOfYear(date);
  const utcHours: number = getUtcHoursIntoDay(date);

  const latitude: number = getSolarDeclination(dayOfYear);

  const equationOfTimeDegrees: number =
    getEquationOfTime(dayOfYear) / EarthRotation.MinutesPerDegree;

  // ? The sun is over longitude 0 at solar noon, then moves west by EarthRotation.DegreesPerHour
  const rawLongitude: number =
    EarthRotation.DegreesPerHour * (EarthRotation.SolarNoonHour - utcHours) -
    equationOfTimeDegrees;
  const longitude: number = wrapToRange(
    rawLongitude,
    -Angle.HalfTurn,
    Angle.HalfTurn,
  );

  return { latitude, longitude };
}
