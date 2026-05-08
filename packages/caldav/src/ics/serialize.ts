import { Temporal } from 'temporal-polyfill';

import type { ICalPropertyParams } from './types';

// ─── Text escaping ───────────────────────────────────────────────────────────

function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}

// ─── Line folding (RFC 5545 §3.1) ───────────────────────────────────────────

/** Fold a single property line at 75 octets (ASCII approximation). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    chunks.push(line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join('\r\n ');
}

// ─── Property formatting ─────────────────────────────────────────────────────

function prop(
  name: string,
  value: string,
  params: ICalPropertyParams = {}
): string {
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(';');
  const namePart = paramStr ? `${name};${paramStr}` : name;
  return foldLine(`${namePart}:${value}`);
}

function nowUtcStamp(): string {
  const d = new Date();
  return [
    String(d.getUTCFullYear()).padStart(4, '0'),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
    'T',
    String(d.getUTCHours()).padStart(2, '0'),
    String(d.getUTCMinutes()).padStart(2, '0'),
    String(d.getUTCSeconds()).padStart(2, '0'),
    'Z',
  ].join('');
}

// ─── Temporal → iCal date string ─────────────────────────────────────────────

/** Temporal type guards (local to serializer to avoid @dayflow/core dependency). */
function isPlainDate(
  dt: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): dt is Temporal.PlainDate {
  return !('hour' in dt);
}

function isZonedDateTime(
  dt: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): dt is Temporal.ZonedDateTime {
  return 'timeZoneId' in dt || ('offset' in dt && 'hour' in dt);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}${pad(month)}${pad(day)}`;
}

function formatTimeStr(hour: number, minute: number, second: number): string {
  return `T${pad(hour)}${pad(minute)}${pad(second)}`;
}

/**
 * Convert a Temporal date/time value to an iCal property name+value+params tuple.
 *
 * All-day (PlainDate)       → VALUE=DATE:YYYYMMDD
 * Floating (PlainDateTime)  → YYYYMMDDTHHMMSS
 * UTC (ZonedDateTime/UTC)   → YYYYMMDDTHHMMSSZ
 * Zoned (ZonedDateTime)     → TZID=...:YYYYMMDDTHHMMSS
 */
export function formatICalDate(
  dt: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): { value: string; params: ICalPropertyParams } {
  if (isPlainDate(dt)) {
    const value = formatDateStr(dt.year, dt.month, dt.day);
    return { value, params: { VALUE: 'DATE' } };
  }

  if (isZonedDateTime(dt)) {
    const zdt = dt as Temporal.ZonedDateTime;
    const dateStr = formatDateStr(zdt.year, zdt.month, zdt.day);
    const timeStr = formatTimeStr(zdt.hour, zdt.minute, zdt.second);
    if (zdt.timeZoneId === 'UTC') {
      return { value: `${dateStr}${timeStr}Z`, params: {} };
    }
    return { value: `${dateStr}${timeStr}`, params: { TZID: zdt.timeZoneId } };
  }

  // PlainDateTime (floating)
  const pdt = dt as Temporal.PlainDateTime;
  const dateStr = formatDateStr(pdt.year, pdt.month, pdt.day);
  const timeStr = formatTimeStr(pdt.hour, pdt.minute, pdt.second);
  return { value: `${dateStr}${timeStr}`, params: {} };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type VEventFields = {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
  dtend: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
};

/**
 * Serialize a VEVENT to a complete VCALENDAR string (CRLF line endings).
 * The output is suitable for PUT to a CalDAV server.
 */
export function toICalendar(fields: VEventFields): string {
  const start = formatICalDate(fields.dtstart);
  const end = formatICalDate(fields.dtend);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    prop('VERSION', '2.0'),
    prop('PRODID', '-//DayFlow//CalDAV//EN'),
    'BEGIN:VEVENT',
    prop('UID', fields.uid),
    prop('DTSTAMP', nowUtcStamp()),
    prop('SUMMARY', escapeText(fields.summary)),
    prop('DTSTART', start.value, start.params),
    prop('DTEND', end.value, end.params),
  ];

  if (fields.description) {
    lines.push(prop('DESCRIPTION', escapeText(fields.description)));
  }
  if (fields.location) {
    lines.push(prop('LOCATION', escapeText(fields.location)));
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}
