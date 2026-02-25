import { Temporal } from 'temporal-polyfill';

import { Event } from '@/types/event';
import {
  isPlainDate,
  isPlainDateTime,
  isZonedDateTime,
} from '@/utils/temporalTypeGuards';
import { generateUniKey } from '@/utils/utilityFunctions';

import { ICSVEvent, ICSDateParams, ICSImportOptions } from './types';

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Pad number to 2 digits
 */
export function pad2(num: number | string): string {
  return String(num).padStart(2, '0');
}

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
  const ICS_DATE_REGEX = /^(\d{4})(\d{2})(\d{2})$/;
  const ICS_DATETIME_REGEX = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/;
  const ICS_DATETIME_UTC_REGEX =
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

  // All-day event (DATE format)
  if (params?.value === 'DATE' || ICS_DATE_REGEX.test(cleanStr)) {
    const match = cleanStr.match(ICS_DATE_REGEX);
    if (match) {
      return Temporal.PlainDate.from({
        year: Number.parseInt(match[1], 10),
        month: Number.parseInt(match[2], 10),
        day: Number.parseInt(match[3], 10),
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
      year: Number.parseInt(match[1], 10),
      month: Number.parseInt(match[2], 10),
      day: Number.parseInt(match[3], 10),
      hour: Number.parseInt(match[4], 10),
      minute: Number.parseInt(match[5], 10),
      second: Number.parseInt(match[6], 10),
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
  temporal:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime,
  allDay: boolean = false
): { value: string; params?: Record<string, string> } {
  // All-day event
  if (allDay || isPlainDate(temporal)) {
    const pd = isPlainDate(temporal) ? temporal : temporal.toPlainDate();
    return {
      value: `${pd.year}${pad2(pd.month)}${pad2(pd.day)}`,
      params: { VALUE: 'DATE' },
    };
  }

  // ZonedDateTime - convert to UTC
  if (isZonedDateTime(temporal)) {
    const instant = temporal.toInstant();
    const utc = instant.toZonedDateTimeISO('UTC');
    return {
      value: `${utc.year}${pad2(utc.month)}${pad2(utc.day)}T${pad2(utc.hour)}${pad2(utc.minute)}${pad2(utc.second)}Z`,
    };
  }

  // PlainDateTime - local time (no timezone marker)
  if (isPlainDateTime(temporal)) {
    return {
      value: `${temporal.year}${pad2(temporal.month)}${pad2(temporal.day)}T${pad2(temporal.hour)}${pad2(temporal.minute)}${pad2(temporal.second)}`,
    };
  }

  throw new Error('Unsupported Temporal type');
}

/**
 * Format a Date to ICS timestamp (UTC format for DTSTAMP)
 */
export function formatDateToICSTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hour = pad2(date.getUTCHours());
  const minute = pad2(date.getUTCMinutes());
  const second = pad2(date.getUTCSeconds());
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

// ============================================================================
// String Utilities
// ============================================================================

export function escapeICSValue(value: string): string {
  if (!value) return '';
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n');
}

export function unescapeICSValue(value: string): string {
  if (!value) return '';
  return value
    .replaceAll('\\,', ',')
    .replaceAll('\\;', ';')
    .replaceAll(/\\[nN]/g, '\n')
    .replaceAll('\\\\', '\\');
}

export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return chunks.join('\r\n');
}

export function formatProperty(
  name: string,
  value: string,
  params?: Record<string, string>
): string {
  let line = name;
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      line += `;${key}=${val}`;
    });
  }
  line += `:${value}`;
  return foldLine(line);
}

// ============================================================================
// Internal Logic
// ============================================================================

export function generateVEvent(event: Event): string[] {
  const lines: string[] = ['BEGIN:VEVENT'];
  const uid = event.meta?.originalUid || `${event.id}@dayflow`;
  lines.push(`UID:${uid}`);
  lines.push(`DTSTAMP:${formatDateToICSTimestamp(new Date())}`);
  const startICS = formatICSDate(event.start, event.allDay);
  const endICS = formatICSDate(event.end, event.allDay);
  lines.push(formatProperty('DTSTART', startICS.value, startICS.params));
  lines.push(formatProperty('DTEND', endICS.value, endICS.params));
  lines.push(formatProperty('SUMMARY', escapeICSValue(event.title)));
  if (event.description) {
    lines.push(
      formatProperty('DESCRIPTION', escapeICSValue(event.description))
    );
  }
  if (event.meta?.location) {
    lines.push(
      formatProperty('LOCATION', escapeICSValue(event.meta.location as string))
    );
  }
  if (event.meta?.categories && Array.isArray(event.meta.categories)) {
    const cats = event.meta.categories.map(escapeICSValue).join(',');
    lines.push(formatProperty('CATEGORIES', cats));
  }
  lines.push('END:VEVENT');
  return lines;
}

export function extractVEvents(lines: string[]): string[][] {
  const vevents: string[][] = [];
  let currentEventLines: string[] | null = null;
  let inVEvent = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const upperLine = trimmed.toUpperCase();
    if (upperLine.startsWith('BEGIN:VEVENT')) {
      inVEvent = true;
      currentEventLines = [];
      continue;
    }
    if (upperLine.startsWith('END:VEVENT')) {
      if (inVEvent && currentEventLines) {
        vevents.push(currentEventLines);
      }
      inVEvent = false;
      currentEventLines = null;
      continue;
    }
    if (inVEvent && currentEventLines) {
      currentEventLines.push(line);
    }
  }
  return vevents;
}

export function parseVEventLines(lines: string[]): ICSVEvent {
  const event: Partial<ICSVEvent> = {};
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const propertyPart = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1);
    const [rawName, ...params] = propertyPart.split(';');
    const name = rawName.trim().toUpperCase();
    const paramObj: Record<string, string> = {};
    params.forEach(p => {
      const [key, val] = p.split('=');
      if (key && val) {
        paramObj[key.trim().toUpperCase()] = val.trim();
      }
    });
    switch (name) {
      case 'UID':
        event.uid = value.trim();
        break;
      case 'SUMMARY':
        event.summary = unescapeICSValue(value);
        break;
      case 'DESCRIPTION':
        event.description = unescapeICSValue(value);
        break;
      case 'LOCATION':
        event.location = unescapeICSValue(value);
        break;
      case 'DTSTART':
        event.dtstart = value.trim();
        event.dtstartParams = {
          value: paramObj['VALUE'] as 'DATE' | 'DATE-TIME',
          tzid: paramObj['TZID'],
        };
        break;
      case 'DTEND':
        event.dtend = value.trim();
        event.dtendParams = {
          value: paramObj['VALUE'] as 'DATE' | 'DATE-TIME',
          tzid: paramObj['TZID'],
        };
        break;
      case 'CATEGORIES':
        event.categories = value
          .split(',')
          .map(c => unescapeICSValue(c.trim()));
        break;
      default:
        break;
    }
  }
  if (!event.dtstart) throw new Error('Missing DTSTART in VEVENT');
  if (!event.uid) event.uid = generateUniKey();
  return event as ICSVEvent;
}

export function convertToDayFlowEvent(
  icsEvent: ICSVEvent,
  options: ICSImportOptions
): Event {
  const {
    calendarId = 'default',
    generateNewIds = true,
    idPrefix = 'ics-',
    defaultTimeZone,
  } = options;
  const id = generateNewIds ? `${idPrefix}${generateUniKey()}` : icsEvent.uid;
  const startTemporal = parseICSDate(
    icsEvent.dtstart,
    icsEvent.dtstartParams,
    defaultTimeZone
  );
  let endTemporal:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime;
  if (icsEvent.dtend) {
    endTemporal = parseICSDate(
      icsEvent.dtend,
      icsEvent.dtendParams,
      defaultTimeZone
    );
  } else if (isPlainDate(startTemporal)) {
    endTemporal = startTemporal.add({ days: 1 });
  } else {
    endTemporal = (startTemporal as Temporal.PlainDateTime).add({ hours: 1 });
  }
  const allDay =
    icsEvent.dtstartParams?.value === 'DATE' || isPlainDate(startTemporal);
  const tz = defaultTimeZone || Temporal.Now.timeZoneId();
  let finalStart: Temporal.ZonedDateTime;
  let finalEnd: Temporal.ZonedDateTime;
  if (isPlainDate(startTemporal)) {
    finalStart = startTemporal.toZonedDateTime({
      timeZone: tz,
      plainTime: '00:00:00',
    });
  } else if (isPlainDateTime(startTemporal)) {
    try {
      finalStart = (startTemporal as Temporal.PlainDateTime).toZonedDateTime(
        tz
      );
    } catch {
      finalStart = Temporal.ZonedDateTime.from({
        ...startTemporal,
        timeZone: tz,
      });
    }
  } else {
    finalStart = startTemporal;
  }
  if (isPlainDate(endTemporal)) {
    finalEnd = endTemporal.toZonedDateTime({
      timeZone: tz,
      plainTime: '00:00:00',
    });
  } else if (isPlainDateTime(endTemporal)) {
    try {
      finalEnd = (endTemporal as Temporal.PlainDateTime).toZonedDateTime(tz);
    } catch {
      finalEnd = Temporal.ZonedDateTime.from({ ...endTemporal, timeZone: tz });
    }
  } else {
    finalEnd = endTemporal as Temporal.ZonedDateTime;
  }
  return {
    id,
    calendarId,
    title: icsEvent.summary || '(No Title)',
    description: icsEvent.description,
    start: finalStart,
    end: finalEnd,
    allDay,
    meta: {
      location: icsEvent.location,
      originalUid: icsEvent.uid,
      categories: icsEvent.categories,
    },
  };
}
