import { Angle } from "./angles";
import { TimeUnit } from "./time";

/** How the Earth's rotation maps onto the clock. */
export enum EarthRotation {
  /** The hour of the day (UTC) when the sun is over longitude 0. */
  SolarNoonHour = TimeUnit.HoursPerDay / 2,
  DegreesPerHour = Angle.FullTurn / TimeUnit.HoursPerDay,
  /** Minutes of solar time per degree of longitude. */
  MinutesPerDegree = TimeUnit.MinutesPerHour / DegreesPerHour,
}

/** Constants for where the sun sits north/south of the equator over the year. */
export enum EarthOrbit {
  AxialTiltDegrees = 23.44,
  /** Days between the December solstice and January 1st. */
  SolsticeOffsetDays = 10,
}

/** Empirical coefficients for the equation of time (minutes), in terms of the orbit angle B. */
export enum EquationOfTime {
  /** Day of the year B is measured from. */
  ReferenceDay = 81,
  /** The sin term runs at twice B's frequency. */
  SecondHarmonic = 2,
  SecondHarmonicAmplitude = 9.87,
  CosineAmplitude = 7.53,
  SineAmplitude = 1.5,
}
