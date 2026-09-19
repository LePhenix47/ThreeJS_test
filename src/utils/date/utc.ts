import { TimeUnit } from "@/utils/enums/time";

/** Day of the year (UTC), where January 1st is day 1. */
export function getUtcDayOfYear(date: Date): number {
  // ? Day 0 of a month is the last day of the previous one, so this is December 31st of the previous year
  const startOfYearMs: number = Date.UTC(date.getUTCFullYear(), 0, 0);
  const elapsedMs: number = date.getTime() - startOfYearMs;

  return Math.floor(elapsedMs / TimeUnit.MillisecondsPerDay);
}

/** Hours elapsed since 00:00 UTC of the given date, as a fraction (e.g. 13:30 → 13.5). */
export function getUtcHoursIntoDay(date: Date): number {
  const startOfDayMs: number = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const elapsedMs: number = date.getTime() - startOfDayMs;

  return elapsedMs / TimeUnit.MillisecondsPerHour;
}
