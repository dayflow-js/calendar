/**
 * Date and Time Conversion Utilities
 *
 * This module provides utilities for converting between Date and Temporal API objects,
 * extracting time components, and performing date comparisons.
 *
 * All functions support both legacy Date objects and modern Temporal API types
 * for backward compatibility and future-proofing.
 */

import { Temporal } from 'temporal-polyfill';

import {
  extractHourFromTemporal,
  createTemporalWithHour,
  getStartOfTemporal,
  getEndOfTemporal,
  isPlainDate,
  isSamePlainDate,
} from './temporal';

// ============================================================================
// Date/Time Conversion Tools (Event-specific - Temporal Compatible)
// ============================================================================

/**
 * Extract hour number from Date or Temporal object (with decimal for minutes, e.g., 14.5 = 14:30)
 * @param dateTime Date or Temporal object
 * @returns Hour number (0-24, supports decimals)
 */
export const extractHourFromDate = (
  dateTime:
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
): number => {
  if (dateTime instanceof Date) {
    const hours = dateTime.getHours();
    const minutes = dateTime.getMinutes();
    return hours + minutes / 60;
  }
  return extractHourFromTemporal(dateTime);
};

/**
 * Create a new date-time object based on given date but set to specified hour
 * @param baseDateTime Base date-time
 * @param hour Hour number (supports decimals, e.g., 14.5 = 14:30)
 * @returns Date or Temporal (PlainDateTime or ZonedDateTime)
 */
export const createDateWithHour = (
  baseDateTime:
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime,
  hour: number
): Date | Temporal.PlainDateTime | Temporal.ZonedDateTime => {
  if (baseDateTime instanceof Date) {
    const newDate = new Date(baseDateTime);
    const hours = Math.floor(hour);
    const minutes = Math.round((hour - hours) * 60);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  }
  return createTemporalWithHour(baseDateTime, hour);
};

/**
 * Get start of day (00:00:00.000)
 * @param dateTime Date-time
 * @returns Start of day
 */
export const getStartOfDay = (
  dateTime:
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
): Date | Temporal.ZonedDateTime => {
  if (dateTime instanceof Date) {
    const newDate = new Date(dateTime);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }
  return getStartOfTemporal(dateTime);
};

/**
 * Get end of day (23:59:59.999)
 * @param dateTime Date-time
 * @returns End of day
 */
export const getEndOfDay = (
  dateTime:
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
): Date | Temporal.ZonedDateTime => {
  if (dateTime instanceof Date) {
    const newDate = new Date(dateTime);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }
  return getEndOfTemporal(dateTime);
};

/**
 * Get the ISO week number for a given date
 * @param date Date object
 * @returns Week number (1-53)
 */
export const getWeekNumber = (date: Date): number => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

/**
 * Check if two dates are on the same day
 * @param date1 Date 1
 * @param date2 Date 2
 * @returns Whether they are the same day
 */
export const isSameDay = (
  date1:
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime,
  date2:
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
): boolean => {
  if (date1 instanceof Date && date2 instanceof Date) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  const temporal1 =
    date1 instanceof Date
      ? Temporal.PlainDate.from({
          year: date1.getFullYear(),
          month: date1.getMonth() + 1,
          day: date1.getDate(),
        })
      : isPlainDate(date1)
        ? date1
        : date1.toPlainDate();

  const temporal2 =
    date2 instanceof Date
      ? Temporal.PlainDate.from({
          year: date2.getFullYear(),
          month: date2.getMonth() + 1,
          day: date2.getDate(),
        })
      : isPlainDate(date2)
        ? date2
        : date2.toPlainDate();

  return isSamePlainDate(temporal1, temporal2);
};

/**
 * Check if event spans multiple days
 * @param start Start time
 * @param end End time
 * @returns Whether it's a multi-day event
 */
export const isMultiDayEvent = (
  start:
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime,
  end:
    | Date
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime
): boolean => !isSameDay(start, end);
