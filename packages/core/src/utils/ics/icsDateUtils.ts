/**
 * ICS Date Utilities
 *
 * Convert between ICS date formats (RFC 5545) and Temporal API types.
 *
 * ICS Date Formats:
 * 1. DATE (all-day): YYYYMMDD (e.g., 20250115)
 * 2. DATE-TIME (local): YYYYMMDDTHHMMSS (e.g., 20250115T143000)
 * 3. DATE-TIME (UTC): YYYYMMDDTHHMMSSZ (e.g., 20250115T143000Z)
 * 4. DATE-TIME (with TZID): DTSTART;TZID=America/New_York:20250115T143000
 */

import { Temporal } from 'temporal-polyfill';
import { ICSDateParams } from './types';
import {
  isPlainDate,
  isPlainDateTime,
  isZonedDateTime,
} from '../temporalTypeGuards';

// ICS date format patterns
const ICS_DATE_REGEX = /^(\d{4})(\d{2})(\d{2})$/;
const ICS_DATETIME_REGEX = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/;
const ICS_DATETIME_UTC_REGEX = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

/**
 * Parse ICS date string to Temporal type
 *
 * @param dateStr - ICS date string
 * @param params - Date parameters (VALUE, TZID)
 * @param defaultTimeZone - Default timezone when none specified
 * @returns Temporal.PlainDate, PlainDateTime, or ZonedDateTime
 */
export function parseICSDate(
  dateStr: string,
  params?: ICSDateParams,
  defaultTimeZone?: string
): Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime {
  const cleanStr = dateStr.trim();

  // All-day event (DATE format)
  if (params?.value === 'DATE' || ICS_DATE_REGEX.test(cleanStr)) {
    const match = cleanStr.match(ICS_DATE_REGEX);
    if (match) {
      return Temporal.PlainDate.from({
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
      });
    }
  }

  // UTC time (ends with Z)
  if (ICS_DATETIME_UTC_REGEX.test(cleanStr)) {
    const match = cleanStr.match(ICS_DATETIME_UTC_REGEX);
    if (match) {
      const instant = Temporal.Instant.from(
        `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
      );
      // Convert to local timezone or specified default
      const tz = defaultTimeZone || Temporal.Now.timeZoneId();
      return instant.toZonedDateTimeISO(tz);
    }
  }

  // Local time (with or without timezone)
  const match = cleanStr.match(ICS_DATETIME_REGEX);
  if (match) {
    const dateTime = {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
      day: parseInt(match[3], 10),
      hour: parseInt(match[4], 10),
      minute: parseInt(match[5], 10),
      second: parseInt(match[6], 10),
    };

    // If timezone specified, return ZonedDateTime
    if (params?.tzid) {
      return Temporal.ZonedDateTime.from({
        ...dateTime,
        timeZone: params.tzid,
      });
    }

    // Otherwise return PlainDateTime
    return Temporal.PlainDateTime.from(dateTime);
  }

  throw new Error(`Invalid ICS date format: ${dateStr}`);
}

/**
 * Format Temporal type to ICS date string
 *
 * @param temporal - Temporal date/time object
 * @param allDay - Force all-day format
 * @returns Object with value and optional params
 */
export function formatICSDate(
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  allDay: boolean = false
): { value: string; params?: Record<string, string> } {
  // All-day event
  if (allDay || isPlainDate(temporal)) {
    const pd = isPlainDate(temporal) ? temporal : temporal.toPlainDate();
    return {
      value: `${pd.year}${pad(pd.month)}${pad(pd.day)}`,
      params: { VALUE: 'DATE' },
    };
  }

  // ZonedDateTime - convert to UTC
  if (isZonedDateTime(temporal)) {
    const instant = temporal.toInstant();
    const utc = instant.toZonedDateTimeISO('UTC');
    return {
      value: `${utc.year}${pad(utc.month)}${pad(utc.day)}T${pad(utc.hour)}${pad(utc.minute)}${pad(utc.second)}Z`,
    };
  }

  // PlainDateTime - local time (no timezone marker)
  if (isPlainDateTime(temporal)) {
    return {
      value: `${temporal.year}${pad(temporal.month)}${pad(temporal.day)}T${pad(temporal.hour)}${pad(temporal.minute)}${pad(temporal.second)}`,
    };
  }

  throw new Error('Unsupported Temporal type');
}

/**
 * Format a Date to ICS timestamp (UTC format for DTSTAMP)
 */
export function formatDateToICSTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const second = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/**
 * Pad number to 2 digits
 */
function pad(num: number): string {
  return String(num).padStart(2, '0');
}
