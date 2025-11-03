/**
 * Temporal Type Guards and Conversion Utilities
 *
 * This module provides type guards for distinguishing between different Temporal types
 * and unified conversion functions for internal processing.
 */

import { Temporal } from 'temporal-polyfill';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if temporal is PlainDate (date only, no time)
 */
export function isPlainDate(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): temporal is Temporal.PlainDate {
  return !('hour' in temporal);
}

/**
 * Check if temporal is PlainDateTime (date + time, no timezone)
 */
export function isPlainDateTime(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): temporal is Temporal.PlainDateTime {
  return 'hour' in temporal && !('timeZone' in temporal);
}

/**
 * Check if temporal is ZonedDateTime (date + time + timezone)
 */
export function isZonedDateTime(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): temporal is Temporal.ZonedDateTime {
  return 'timeZone' in temporal;
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert any Temporal type to Date (for internal processing)
 * Handles all three Temporal types uniformly
 */
export function temporalToDate(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): Date {
  if (isPlainDate(temporal)) {
    // PlainDate: create Date at midnight local time
    return new Date(temporal.year, temporal.month - 1, temporal.day);
  }

  if (isPlainDateTime(temporal)) {
    // PlainDateTime: create Date with specified time in local timezone
    return new Date(
      temporal.year,
      temporal.month - 1,
      temporal.day,
      temporal.hour,
      temporal.minute,
      temporal.second,
      temporal.millisecond
    );
  }

  // ZonedDateTime: convert via Instant to preserve timezone information
  const instant = temporal.toInstant();
  return new Date(instant.epochMilliseconds);
}

/**
 * Convert Date to PlainDate (for all-day events)
 */
export function dateToPlainDate(date: Date): Temporal.PlainDate {
  return Temporal.PlainDate.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

/**
 * Convert Date to PlainDateTime (for local events without timezone)
 */
export function dateToPlainDateTime(date: Date): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds(),
  });
}

/**
 * Convert Date to ZonedDateTime (for timezone-aware events)
 */
export function dateToZonedDateTime(
  date: Date,
  timeZone: string
): Temporal.ZonedDateTime {
  return Temporal.ZonedDateTime.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds(),
    timeZone: timeZone,
  });
}

/**
 * Convert PlainDateTime to Date
 */
export function plainDateTimeToDate(pdt: Temporal.PlainDateTime): Date {
  return new Date(
    pdt.year,
    pdt.month - 1,
    pdt.day,
    pdt.hour,
    pdt.minute,
    pdt.second,
    pdt.millisecond
  );
}

/**
 * Convert PlainDate to Date (at midnight)
 */
export function plainDateToDate(pd: Temporal.PlainDate): Date {
  return new Date(pd.year, pd.month - 1, pd.day);
}

// ============================================================================
// Hour Extraction (supports all types)
// ============================================================================

/**
 * Extract hour from any Temporal type (with decimal for minutes)
 * @returns Hour number (0-24, with decimals, e.g., 14.5 = 14:30)
 */
export function extractHourFromTemporal(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): number {
  if (isPlainDate(temporal)) {
    return 0; // PlainDate has no time component
  }

  // Both PlainDateTime and ZonedDateTime have hour/minute
  const hour = temporal.hour;
  const minute = temporal.minute;
  return hour + minute / 60;
}

/**
 * Create a new Temporal with specified hour (supports PlainDateTime and ZonedDateTime)
 * @param temporal Base temporal object
 * @param hour Hour with decimals (e.g., 14.5 = 14:30)
 */
export function setHourInTemporal(
  temporal: Temporal.PlainDateTime | Temporal.ZonedDateTime,
  hour: number
): Temporal.PlainDateTime | Temporal.ZonedDateTime {
  const hours = Math.floor(hour);
  const minutes = Math.round((hour - hours) * 60);

  if (isZonedDateTime(temporal)) {
    return temporal.with({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  }

  // PlainDateTime
  return temporal.with({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
}

// ============================================================================
// Comparison Functions (supports all types)
// ============================================================================

/**
 * Check if two Temporal objects represent the same day
 */
export function isSameTemporal(
  t1: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  t2: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): boolean {
  // Convert to PlainDate for comparison
  const date1 = isPlainDate(t1)
    ? t1
    : isPlainDateTime(t1)
      ? t1.toPlainDate()
      : t1.toPlainDate();

  const date2 = isPlainDate(t2)
    ? t2
    : isPlainDateTime(t2)
      ? t2.toPlainDate()
      : t2.toPlainDate();

  return date1.equals(date2);
}

/**
 * Get PlainDate from any Temporal type
 */
export function getPlainDate(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): Temporal.PlainDate {
  if (isPlainDate(temporal)) {
    return temporal;
  }
  if (isPlainDateTime(temporal)) {
    return temporal.toPlainDate();
  }
  return temporal.toPlainDate();
}
