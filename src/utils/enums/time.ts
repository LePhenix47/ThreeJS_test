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
  SecondsPerHour = SecondsPerMinute * MinutesPerHour,
  SecondsPerDay = SecondsPerHour * HoursPerDay,
  MillisecondsPerMinute = MillisecondsPerSecond * SecondsPerMinute,
  MillisecondsPerHour = MillisecondsPerMinute * MinutesPerHour,
  MillisecondsPerDay = MillisecondsPerHour * HoursPerDay,
}

/** Simulated seconds that pass per real second. */
export enum PlaybackSpeed {
  RealTime = 1, // 1x
  MinutePerSecond = TimeUnit.SecondsPerMinute, // 60x
  TenMinutesPerSecond = 10 * TimeUnit.SecondsPerMinute, // 600x
  HourPerSecond = TimeUnit.SecondsPerHour, // 3600x
  DayPerSecond = TimeUnit.SecondsPerDay, // 86400x
}
