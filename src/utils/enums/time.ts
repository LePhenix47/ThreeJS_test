/**
 * Calendar and clock unit sizes. Derived units build on the base ones so they can't drift apart.
 *
 * @example
 * const daysElapsed = elapsedMs / TimeUnit.MillisecondsPerDay;
 */
export enum TimeUnit {
  MillisecondsPerSecond = 1_000,
  SecondsPerMinute = 60,
  MinutesPerHour = 60,
  HoursPerDay = 24,
  DaysPerYear = 365,
  MillisecondsPerMinute = MillisecondsPerSecond * SecondsPerMinute,
  MillisecondsPerHour = MillisecondsPerMinute * MinutesPerHour,
  MillisecondsPerDay = MillisecondsPerHour * HoursPerDay,
}
