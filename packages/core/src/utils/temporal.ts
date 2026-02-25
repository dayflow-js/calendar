/**
 * Temporal API utility functions
 * Provides date-time processing, conversion, and compatibility support
 */

import { Temporal } from 'temporal-polyfill';
// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is Temporal.PlainDate
 * Uses multiple methods to check, handling polyfill and serialization issues
 */
export function isPlainDate(date: unknown): date is Temporal.PlainDate {
  if (!date || typeof date !== 'object') return false;
  if (date instanceof Date) return false;

  // Method 1: instanceof check
  if (date instanceof Temporal.PlainDate) {
    return true;
  }

  const d = date as Record<string, unknown>;

  // Method 2: check constructor.name
  if (d.constructor?.name === 'PlainDate') {
    return true;
  }

  // Method 3: check if no time properties (PlainDate characteristic)
  // PlainDate has no hour/minute properties, but ZonedDateTime does
  return (
    !('hour' in d) &&
    !('timeZone' in d) &&
    'year' in d &&
    'month' in d &&
    'day' in d
  );
}

/**
 * Check if value is Temporal.ZonedDateTime
 */
export function isZonedDateTime(date: unknown): date is Temporal.ZonedDateTime {
  if (!date || typeof date !== 'object') return false;
  if (date instanceof Date) return false;
  const d = date as Record<string, unknown>;
  return (
    date instanceof Temporal.ZonedDateTime || ('timeZone' in d && 'year' in d)
  );
}

/**
 * Check if value is Date object
 */
export function isDate(value: unknown): value is Date {
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
  if (typeof zdt.epochMilliseconds === 'number') {
    return new Date(zdt.epochMilliseconds);
  }
  // Fallback for plain objects
  const d = zdt as unknown as Record<string, number>;
  return new Date(d.year, d.month - 1, d.day, d.hour, d.minute);
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
  if (typeof plainDate.toZonedDateTime === 'function') {
    try {
      const zdt = plainDate.toZonedDateTime({
        timeZone,
        plainTime: Temporal.PlainTime.from({ hour: 0, minute: 0 }),
      });
      return zonedDateTimeToDate(zdt);
    } catch {
      // Fallback
    }
  }
  // Fallback for plain objects (JSON) or error
  return new Date(plainDate.year, plainDate.month - 1, plainDate.day);
}

/**
 * Convert Temporal (PlainDate | PlainDateTime | ZonedDateTime) or Date to Date
 * @param temporal Temporal date-time object or native Date
 * @param timeZone Timezone (optional, only used for PlainDate)
 * @returns Date object
 */
export function temporalToDate(
  temporal:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
    | Date,
  timeZone?: string
): Date {
  if (temporal instanceof Date) {
    return temporal;
  }

  if (isPlainDate(temporal)) {
    return plainDateToDate(temporal as Temporal.PlainDate, timeZone);
  }

  // Check if PlainDateTime
  if (
    temporal &&
    typeof temporal === 'object' &&
    'hour' in temporal &&
    !('timeZone' in temporal)
  ) {
    // PlainDateTime: convert to Date in local time
    const pdt = temporal as Temporal.PlainDateTime;
    return new Date(
      pdt.year,
      pdt.month - 1,
      pdt.day,
      pdt.hour,
      pdt.minute,
      pdt.second || 0,
      pdt.millisecond || 0
    );
  }

  // At this point, temporal must be ZonedDateTime or looks like it
  if (temporal && typeof temporal === 'object' && 'year' in temporal) {
    return zonedDateTimeToDate(temporal as Temporal.ZonedDateTime);
  }

  // Last resort
  return new Date(temporal as string | number);
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
  temporal:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
    | Date
): number {
  if (temporal instanceof Date) {
    return temporal.getHours() + temporal.getMinutes() / 60;
  }

  if (isPlainDate(temporal)) {
    return 0; // PlainDate has no time information
  }

  // Additional safety check: if no hour property, return 0
  if (
    temporal === null ||
    typeof temporal !== 'object' ||
    !('hour' in temporal) ||
    (temporal as unknown as Record<string, unknown>).hour === undefined
  ) {
    return 0;
  }

  const t = temporal as unknown as Record<string, number>;
  const hours = t.hour;
  const minutes = t.minute ?? 0;
  return hours + minutes / 60;
}

/**
 * Create new Temporal object with specified hour
 * @param temporal Base Temporal object
 * @param hour Hour number (supports decimals)
 * @returns New Temporal (PlainDateTime or ZonedDateTime)
 */
export function createTemporalWithHour(
  temporal:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime,
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

  // Real Temporal instance check
  if (typeof (temporal as { with?: unknown }).with === 'function') {
    return (temporal as Temporal.PlainDateTime).with({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0,
    });
  }

  // Fallback for plain objects
  const t = temporal as unknown as Record<string, number>;
  return Temporal.PlainDateTime.from({
    year: t.year,
    month: t.month,
    day: t.day,
    hour: hours,
    minute: minutes,
  });
}

/**
 * Check if two Temporal dates are on the same day
 */
export function isSamePlainDate(
  date1:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
    | Date,
  date2:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
    | Date
): boolean {
  if (date1 instanceof Date && date2 instanceof Date) {
    return date1.toDateString() === date2.toDateString();
  }

  const getPD = (d: unknown) => {
    if (d instanceof Date) return dateToPlainDate(d);
    if (isPlainDate(d)) return d;
    if (typeof (d as { toPlainDate?: unknown }).toPlainDate === 'function')
      return (d as Temporal.PlainDateTime).toPlainDate();
    // Fallback for plain objects
    const t = d as Record<string, number>;
    return Temporal.PlainDate.from({
      year: t.year,
      month: t.month,
      day: t.day,
    });
  };

  const plain1 = getPD(date1);
  const plain2 = getPD(date2);
  return Temporal.PlainDate.compare(plain1, plain2) === 0;
}

/**
 * Check if event spans multiple days
 */
export function isMultiDayTemporalEvent(
  start:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
    | Date,
  end:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
    | Date
): boolean {
  return !isSamePlainDate(start, end);
}

/**
 * Get start time of Temporal date (00:00:00)
 */
export function getStartOfTemporal(
  temporal:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime,
  timeZone: string = Temporal.Now.timeZoneId()
): Temporal.ZonedDateTime {
  if (
    typeof (temporal as { toZonedDateTime?: unknown }).toZonedDateTime ===
    'function'
  ) {
    const plainDate = isPlainDate(temporal)
      ? temporal
      : (temporal as Temporal.PlainDateTime).toPlainDate();
    return plainDate.toZonedDateTime({
      timeZone,
      plainTime: Temporal.PlainTime.from({ hour: 0, minute: 0 }),
    });
  }
  // Fallback
  const t = temporal as unknown as Record<string, number>;
  const pd = isPlainDate(temporal)
    ? temporal
    : Temporal.PlainDate.from({
        year: t.year,
        month: t.month,
        day: t.day,
      });
  return pd.toZonedDateTime({
    timeZone,
    plainTime: Temporal.PlainTime.from({ hour: 0, minute: 0 }),
  });
}

/**
 * Get end time of Temporal date (23:59:59.999)
 */
export function getEndOfTemporal(
  temporal:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime,
  timeZone: string = Temporal.Now.timeZoneId()
): Temporal.ZonedDateTime {
  if (
    typeof (temporal as { toZonedDateTime?: unknown }).toZonedDateTime ===
    'function'
  ) {
    const plainDate = isPlainDate(temporal)
      ? temporal
      : (temporal as Temporal.PlainDateTime).toPlainDate();
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
  // Fallback
  const t = temporal as unknown as Record<string, number>;
  const pd = isPlainDate(temporal)
    ? temporal
    : Temporal.PlainDate.from({
        year: t.year,
        month: t.month,
        day: t.day,
      });
  return pd.toZonedDateTime({
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
  const getPD = (d: unknown) => {
    if (isPlainDate(d)) return d;
    if (typeof (d as { toPlainDate?: unknown }).toPlainDate === 'function')
      return (d as Temporal.PlainDateTime).toPlainDate();
    const t = d as Record<string, number>;
    return Temporal.PlainDate.from({
      year: t.year,
      month: t.month,
      day: t.day,
    });
  };
  const plainStart = getPD(start);
  const plainEnd = getPD(end);
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
