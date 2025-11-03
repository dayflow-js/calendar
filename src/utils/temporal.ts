/**
 * Temporal API utility functions
 * Provides date-time processing, conversion, and compatibility support
 */

import { Temporal } from 'temporal-polyfill';
import { Event } from '@/types/event';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is Temporal.PlainDate
 * Uses multiple methods to check, handling polyfill and serialization issues
 */
export function isPlainDate(
  date: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): date is Temporal.PlainDate {
  // Method 1: instanceof check
  if (date instanceof Temporal.PlainDate) {
    return true;
  }

  // Method 2: check constructor.name
  if (date?.constructor?.name === 'PlainDate') {
    return true;
  }

  // Method 3: check if no time properties (PlainDate characteristic)
  // PlainDate has no hour/minute properties, but ZonedDateTime does
  return !('hour' in date) && !('timeZone' in date);
}

/**
 * Check if value is Temporal.ZonedDateTime
 */
export function isZonedDateTime(
  date: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): date is Temporal.ZonedDateTime {
  return date instanceof Temporal.ZonedDateTime || 'timeZone' in date;
}

/**
 * Check if value is Date object
 */
export function isDate(value: any): value is Date {
  return value instanceof Date;
}

// ============================================================================
// Date ↔ Temporal Conversion
// ============================================================================

/**
 * Convert Date to Temporal.ZonedDateTime
 * @param date Date object
 * @param timeZone Timezone (defaults to system timezone)
 * @returns Temporal.ZonedDateTime
 */
export function dateToZonedDateTime(
  date: Date,
  timeZone: string = Temporal.Now.timeZoneId()
): Temporal.ZonedDateTime {
  return Temporal.Instant.fromEpochMilliseconds(
    date.getTime()
  ).toZonedDateTimeISO(timeZone);
}

/**
 * Convert Date to Temporal.PlainDate
 * @param date Date object
 * @returns Temporal.PlainDate
 */
export function dateToPlainDate(date: Date): Temporal.PlainDate {
  return Temporal.PlainDate.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

/**
 * Convert Temporal.ZonedDateTime to Date
 * @param zdt Temporal.ZonedDateTime
 * @returns Date object
 */
export function zonedDateTimeToDate(zdt: Temporal.ZonedDateTime): Date {
  return new Date(zdt.epochMilliseconds);
}

/**
 * Convert Temporal.PlainDate to Date
 * @param plainDate Temporal.PlainDate
 * @param timeZone Timezone (optional)
 * @returns Date object (time set to 00:00:00)
 */
export function plainDateToDate(
  plainDate: Temporal.PlainDate,
  timeZone: string = Temporal.Now.timeZoneId()
): Date {
  const zdt = plainDate.toZonedDateTime({
    timeZone,
    plainTime: Temporal.PlainTime.from({ hour: 0, minute: 0 }),
  });
  return zonedDateTimeToDate(zdt);
}

/**
 * Convert Temporal (PlainDate | ZonedDateTime) to Date
 * @param temporal Temporal date-time object
 * @param timeZone Timezone (optional, only used for PlainDate)
 * @returns Date object
 */
export function temporalToDate(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  timeZone?: string
): Date {
  if (isPlainDate(temporal)) {
    return plainDateToDate(temporal, timeZone);
  }
  // Check if PlainDateTime
  if ('hour' in temporal && !('timeZone' in temporal)) {
    // PlainDateTime: convert to Date in local time
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
  // At this point, temporal must be ZonedDateTime
  return zonedDateTimeToDate(temporal as Temporal.ZonedDateTime);
}

// ============================================================================
// Date-time Extraction and Calculation
// ============================================================================

/**
 * Extract hour number (with decimals) from Temporal object
 * @param temporal Temporal time object
 * @returns Hour number (0-24, supports decimals), returns 0 if PlainDate
 */
export function extractHourFromTemporal(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): number {
  if (isPlainDate(temporal)) {
    return 0; // PlainDate has no time information
  }

  // Additional safety check: if no hour property, return 0
  if (!('hour' in temporal) || temporal.hour === undefined) {
    console.warn('Warning: No hour property found in temporal object, returning 0');
    return 0;
  }

  const hours = temporal.hour;
  const minutes = temporal.minute ?? 0;
  return hours + minutes / 60;
}

/**
 * Create new Temporal object with specified hour
 * @param temporal Base Temporal object
 * @param hour Hour number (supports decimals)
 * @returns New Temporal (PlainDateTime or ZonedDateTime)
 */
export function createTemporalWithHour(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  hour: number
): Temporal.PlainDateTime | Temporal.ZonedDateTime {
  const hours = Math.floor(hour);
  const minutes = Math.round((hour - hours) * 60);

  if (isPlainDate(temporal)) {
    // Convert PlainDate to PlainDateTime
    return Temporal.PlainDateTime.from({
      year: temporal.year,
      month: temporal.month,
      day: temporal.day,
      hour: hours,
      minute: minutes,
    });
  }

  // Check if PlainDateTime
  if ('hour' in temporal && !('timeZone' in temporal)) {
    // PlainDateTime
    return temporal.with({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0,
    });
  }

  // ZonedDateTime
  return temporal.with({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  });
}

/**
 * Check if two Temporal dates are on the same day
 */
export function isSamePlainDate(
  date1: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  date2: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): boolean {
  const plain1 = isPlainDate(date1) ? date1 : date1.toPlainDate();
  const plain2 = isPlainDate(date2) ? date2 : date2.toPlainDate();
  return Temporal.PlainDate.compare(plain1, plain2) === 0;
}

/**
 * Check if event spans multiple days
 */
export function isMultiDayTemporalEvent(
  start: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  end: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): boolean {
  return !isSamePlainDate(start, end);
}

/**
 * Get start time of Temporal date (00:00:00)
 */
export function getStartOfTemporal(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  timeZone: string = Temporal.Now.timeZoneId()
): Temporal.ZonedDateTime {
  const plainDate = isPlainDate(temporal) ? temporal : temporal.toPlainDate();
  return plainDate.toZonedDateTime({
    timeZone,
    plainTime: Temporal.PlainTime.from({ hour: 0, minute: 0 }),
  });
}

/**
 * Get end time of Temporal date (23:59:59.999)
 */
export function getEndOfTemporal(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  timeZone: string = Temporal.Now.timeZoneId()
): Temporal.ZonedDateTime {
  const plainDate = isPlainDate(temporal) ? temporal : temporal.toPlainDate();
  return plainDate.toZonedDateTime({
    timeZone,
    plainTime: Temporal.PlainTime.from({
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    }),
  });
}

/**
 * Calculate days difference between two Temporal dates
 */
export function daysBetween(
  start: Temporal.PlainDate | Temporal.ZonedDateTime,
  end: Temporal.PlainDate | Temporal.ZonedDateTime
): number {
  const plainStart = isPlainDate(start) ? start : start.toPlainDate();
  const plainEnd = isPlainDate(end) ? end : end.toPlainDate();
  return plainStart.until(plainEnd).days;
}

/**
 * Calculate days difference between two Date objects (ignoring time component)
 */
export function daysDifference(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(
    date1.getFullYear(),
    date1.getMonth(),
    date1.getDate()
  );
  const secondDate = new Date(
    date2.getFullYear(),
    date2.getMonth(),
    date2.getDate()
  );
  return Math.round((secondDate.getTime() - firstDate.getTime()) / oneDay);
}

/**
 * Add specified days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get current time (Temporal.ZonedDateTime)
 */
export function now(
  timeZone: string = Temporal.Now.timeZoneId()
): Temporal.ZonedDateTime {
  return Temporal.Now.zonedDateTimeISO(timeZone);
}

/**
 * Get today's date (Temporal.PlainDate)
 */
export function today(
  timeZone: string = Temporal.Now.timeZoneId()
): Temporal.PlainDate {
  return Temporal.Now.plainDateISO(timeZone);
}
