/**
 * ICS Parser
 *
 * Parses iCalendar (.ics) format into DayFlow Event objects.
 * Supports standard RFC 5545 VEVENT components.
 */

import { Temporal } from 'temporal-polyfill';
import { generateUniKey } from '../utilityFunctions';
import { Event } from '../../types/event';
import {
  ICSVEvent,
  ICSImportOptions,
  ICSImportResult,
} from './types';
import { parseICSDate } from './icsDateUtils';
import { isPlainDate } from '../temporalTypeGuards';

/**
 * Main function to parse ICS content string
 *
 * @param icsContent - Raw string content of the .ics file
 * @param options - Import options
 * @returns Result object containing success flag, events, and errors
 */
export function parseICS(
  icsContent: string,
  options: ICSImportOptions = {}
): ICSImportResult {
  const result: ICSImportResult = {
    success: false,
    events: [],
    errors: [],
    totalParsed: 0,
    totalImported: 0,
  };

  try {
    // 1. Unfold lines (handle split lines starting with space/tab)
    // RFC 5545 3.1: Content lines are delimited by CRLF.
    // Lines longer than 75 characters SHOULD be folded.
    const unfoldedContent = icsContent.replace(/\r\n[ \t]/g, '');

    // 2. Split into lines and normalize line endings
    const lines = unfoldedContent.split(/\r\n|\n|\r/);

    // 3. Extract VEVENT blocks
    const vevents = extractVEvents(lines);
    result.totalParsed = vevents.length;

    // 4. Parse each VEVENT
    vevents.forEach((veventLines, index) => {
      try {
        const icsEvent = parseVEventLines(veventLines);
        const dayflowEvent = convertToDayFlowEvent(icsEvent, options);
        result.events.push(dayflowEvent);
      } catch (e: any) {
        result.errors.push({
          line: 0, // Difficult to track exact line number after extraction
          message: e.message || 'Unknown parsing error',
          eventUid: `index-${index}`,
        });
      }
    });

    result.success = result.errors.length === 0;
    result.totalImported = result.events.length;
  } catch (e: any) {
    result.errors.push({
      message: `Fatal parsing error: ${e.message}`,
    });
  }

  return result;
}

/**
 * Extract VEVENT blocks from lines
 */
function extractVEvents(lines: string[]): string[][] {
  const vevents: string[][] = [];
  let currentEventLines: string[] | null = null;
  let inVEvent = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inVEvent = true;
      currentEventLines = [];
      continue;
    }

    if (trimmed === 'END:VEVENT') {
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

/**
 * Parse lines of a single VEVENT into intermediate ICSVEvent structure
 */
function parseVEventLines(lines: string[]): ICSVEvent {
  const event: Partial<ICSVEvent> = {};

  for (const line of lines) {
    // Parse Property Name, Parameters, and Value
    // Format: NAME;PARAM1=VALUE1:VALUE
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const propertyPart = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    const [name, ...params] = propertyPart.split(';');

    // Parse parameters
    const paramObj: Record<string, string> = {};
    params.forEach((p) => {
      const [key, val] = p.split('=');
      if (key && val) {
        paramObj[key.toUpperCase()] = val;
      }
    });

    switch (name.toUpperCase()) {
      case 'UID':
        event.uid = value;
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
        event.dtstart = value;
        event.dtstartParams = {
          value: paramObj['VALUE'] as any,
          tzid: paramObj['TZID'],
        };
        break;
      case 'DTEND':
        event.dtend = value;
        event.dtendParams = {
          value: paramObj['VALUE'] as any,
          tzid: paramObj['TZID'],
        };
        break;
      case 'CATEGORIES':
        event.categories = value.split(',').map((c) => unescapeICSValue(c));
        break;
    }
  }

  if (!event.dtstart) {
    throw new Error('Missing DTSTART in VEVENT');
  }

  // Generate a UID if missing (though required by spec)
  if (!event.uid) {
    event.uid = generateUniKey();
  }

  return event as ICSVEvent;
}

/**
 * Convert ICSVEvent to DayFlow Event
 */
function convertToDayFlowEvent(
  icsEvent: ICSVEvent,
  options: ICSImportOptions
): Event {
  const {
    calendarId = 'default',
    generateNewIds = true,
    idPrefix = 'ics-',
    defaultTimeZone,
  } = options;

  // Generate or preserve ID
  const id = generateNewIds ? `${idPrefix}${generateUniKey()}` : icsEvent.uid;

  // Parse dates
  const startTemporal = parseICSDate(
    icsEvent.dtstart,
    icsEvent.dtstartParams,
    defaultTimeZone
  );

  let endTemporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;

  if (icsEvent.dtend) {
    endTemporal = parseICSDate(
      icsEvent.dtend,
      icsEvent.dtendParams,
      defaultTimeZone
    );
  } else {
    // If no DTEND, assume 1 hour duration or 1 day for all-day
    // Note: RFC 5545 says if DTEND is missing, use DURATION. If neither, assume 0 duration?
    // For simplicity, we add 1 hour/day as a default fallback.
    if (isPlainDate(startTemporal)) {
      endTemporal = startTemporal.add({ days: 1 });
    } else {
      endTemporal = (startTemporal as any).add({ hours: 1 });
    }
  }

  // Handle all-day logic
  // If DTSTART VALUE=DATE, it's all-day.
  const allDay =
    icsEvent.dtstartParams?.value === 'DATE' || isPlainDate(startTemporal);

  // Normalize to ZonedDateTime as DayFlow expects
  const tz = defaultTimeZone || Temporal.Now.timeZoneId();

  let finalStart = startTemporal;
  let finalEnd = endTemporal;

  if (isPlainDate(startTemporal)) {
    finalStart = startTemporal.toZonedDateTime({
      timeZone: tz,
      plainTime: '00:00:00',
    });
  }

  if (isPlainDate(endTemporal)) {
    // ICS end date for all-day is exclusive (next day).
    finalEnd = endTemporal.toZonedDateTime({
      timeZone: tz,
      plainTime: '00:00:00',
    });
  }

  return {
    id,
    calendarId,
    title: icsEvent.summary || '(No Title)',
    description: icsEvent.description,
    start: finalStart as Temporal.ZonedDateTime, // Force cast for now, assuming conversion
    end: finalEnd as Temporal.ZonedDateTime,
    allDay,
    // Add extra properties to meta
    meta: {
      location: icsEvent.location,
      originalUid: icsEvent.uid,
      categories: icsEvent.categories,
    },
  };
}

/**
 * Unescape ICS text values
 * RFC 5545: \\, \;, \n, \N
 */
function unescapeICSValue(value: string): string {
  return value
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\[nN]/g, '\n')
    .replace(/\\\\/g, '\\');
}
