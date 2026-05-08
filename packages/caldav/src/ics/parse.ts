import { Temporal } from 'temporal-polyfill';

import type { ICalProperty, ICalPropertyParams, ParsedVEvent } from './types';

// ─── Line handling ────────────────────────────────────────────────────────────

/** Normalize CRLF/CR line endings and unfold continuation lines. */
function unfoldLines(text: string): string[] {
  return text
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\n ', '')
    .replaceAll('\n\t', '')
    .split('\n')
    .filter(l => l.length > 0);
}

// ─── Property parsing ────────────────────────────────────────────────────────

function parseProperty(
  line: string
): { name: string; params: ICalPropertyParams; value: string } | null {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;

  const namePart = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);

  const segments = namePart.split(';');
  const name = segments[0].toUpperCase();
  const params: ICalPropertyParams = {};

  for (let i = 1; i < segments.length; i++) {
    const eqIdx = segments[i].indexOf('=');
    if (eqIdx !== -1) {
      const k = segments[i].slice(0, eqIdx).toUpperCase();
      // Strip surrounding quotes from quoted-string values
      const v = segments[i].slice(eqIdx + 1).replace(/^"(.*)"$/, '$1');
      params[k] = v;
    }
  }

  return { name, params, value };
}

function unescapeText(value: string): string {
  return value
    .replaceAll('\\N', '\n')
    .replaceAll('\\n', '\n')
    .replaceAll('\\;', ';')
    .replaceAll('\\,', ',')
    .replaceAll('\\\\', '\\');
}

// ─── VEVENT block parsing ────────────────────────────────────────────────────

function parseVEventBlock(lines: string[]): ParsedVEvent {
  const vevent: ParsedVEvent = {};

  for (const line of lines) {
    const prop = parseProperty(line);
    if (!prop) continue;

    const { name, params, value } = prop;

    switch (name) {
      case 'UID':
        vevent.uid = value.trim();
        break;
      case 'SUMMARY':
        vevent.summary = unescapeText(value);
        break;
      case 'DESCRIPTION':
        vevent.description = unescapeText(value);
        break;
      case 'LOCATION':
        vevent.location = unescapeText(value);
        break;
      case 'DTSTART':
        vevent.dtstart = { value: value.trim(), params };
        break;
      case 'DTEND':
        vevent.dtend = { value: value.trim(), params };
        break;
      case 'DURATION':
        vevent.duration = value.trim();
        break;
      case 'RRULE':
        vevent.rrule = value.trim();
        break;
      default:
        break;
    }
  }

  return vevent;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a VCALENDAR text and return all VEVENT blocks found within it.
 * Invalid or unparseable VEVENT blocks are silently skipped.
 */
export function parseICalendar(text: string): ParsedVEvent[] {
  const lines = unfoldLines(text);
  const vevents: ParsedVEvent[] = [];
  let insideVEvent = false;
  let blockLines: string[] = [];

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      insideVEvent = true;
      blockLines = [];
    } else if (line === 'END:VEVENT') {
      if (insideVEvent) {
        vevents.push(parseVEventBlock(blockLines));
      }
      insideVEvent = false;
      blockLines = [];
    } else if (insideVEvent) {
      blockLines.push(line);
    }
  }

  return vevents;
}

// ─── Date/time parsing ───────────────────────────────────────────────────────

/**
 * Convert an iCalendar DTSTART/DTEND property to a Temporal type.
 *
 * Handles:
 *  - DATE          → PlainDate
 *  - DATE-TIME (Z) → ZonedDateTime in UTC
 *  - DATE-TIME + TZID → ZonedDateTime in named zone
 *  - DATE-TIME (floating) → PlainDateTime
 */
export function parseICalDate(
  prop: ICalProperty
): Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime {
  const { value, params } = prop;

  // All-day: VALUE=DATE or bare 8-digit string
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    const year = Number.parseInt(value.slice(0, 4), 10);
    const month = Number.parseInt(value.slice(4, 6), 10);
    const day = Number.parseInt(value.slice(6, 8), 10);
    return Temporal.PlainDate.from({ year, month, day });
  }

  // DATE-TIME: YYYYMMDDTHHMMSS[Z]
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(4, 6), 10);
  const day = Number.parseInt(value.slice(6, 8), 10);
  const hour = Number.parseInt(value.slice(9, 11), 10);
  const minute = Number.parseInt(value.slice(11, 13), 10);
  const second = Number.parseInt(value.slice(13, 15), 10);

  if (value.endsWith('Z')) {
    return Temporal.ZonedDateTime.from({
      year,
      month,
      day,
      hour,
      minute,
      second,
      timeZone: 'UTC',
    });
  }

  const tzid = params.TZID;
  if (tzid) {
    return Temporal.ZonedDateTime.from({
      year,
      month,
      day,
      hour,
      minute,
      second,
      timeZone: tzid,
    });
  }

  // Floating time — no timezone information
  return Temporal.PlainDateTime.from({
    year,
    month,
    day,
    hour,
    minute,
    second,
  });
}
