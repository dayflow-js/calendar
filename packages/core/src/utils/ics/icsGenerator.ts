/**
 * ICS Generator
 *
 * Generates iCalendar (.ics) files from DayFlow Event objects.
 * Supports standard RFC 5545 components.
 */

import { Event } from '../../types/event';
import { ICSExportOptions } from './types';
import { formatICSDate, formatDateToICSTimestamp } from './icsDateUtils';

/**
 * Generate ICS content string from events
 *
 * @param events - List of DayFlow events to export
 * @param options - Export options
 * @returns ICS file content string
 */
export function generateICS(
  events: Event[],
  options: ICSExportOptions = {}
): string {
  const {
    calendarName = 'DayFlow Calendar',
    productId = '-//DayFlow//DayFlow Calendar//EN',
    includeTimezone = true, // We mainly output UTC or local time, full VTIMEZONE definition is complex
  } = options;

  const lines: string[] = [];

  // 1. VCALENDAR Header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(`PRODID:${productId}`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeICSValue(calendarName)}`);

  // Note: We skip complex VTIMEZONE definitions for now and rely on
  // UTC (Z) or standard TZIDs that most clients accept.

  // 2. VEVENTs
  events.forEach(event => {
    lines.push(...generateVEvent(event));
  });

  // 3. Footer
  lines.push('END:VCALENDAR');

  // Join with CRLF (RFC 5545 standard)
  return lines.join('\r\n');
}

/**
 * Trigger download of ICS file (Browser only)
 *
 * @param events - Events to export
 * @param options - Export options
 */
export function downloadICS(
  events: Event[],
  options: ICSExportOptions = {}
): void {
  const content = generateICS(events, options);
  const filename = `${options.filename || 'calendar'}.ics`;

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate lines for a single VEVENT
 */
function generateVEvent(event: Event): string[] {
  const lines: string[] = [];
  lines.push('BEGIN:VEVENT');

  // UID: Use original if imported, or generate from ID
  const originalUid = event.meta?.originalUid;
  const uid = originalUid || `${event.id}@dayflow`;
  lines.push(`UID:${uid}`);

  // DTSTAMP (Current time)
  lines.push(`DTSTAMP:${formatDateToICSTimestamp(new Date())}`);

  // DTSTART & DTEND
  const startICS = formatICSDate(event.start, event.allDay);
  const endICS = formatICSDate(event.end, event.allDay);

  lines.push(formatProperty('DTSTART', startICS.value, startICS.params));
  lines.push(formatProperty('DTEND', endICS.value, endICS.params));

  // SUMMARY & DESCRIPTION
  lines.push(formatProperty('SUMMARY', escapeICSValue(event.title)));

  if (event.description) {
    lines.push(
      formatProperty('DESCRIPTION', escapeICSValue(event.description))
    );
  }

  // LOCATION
  const location = event.meta?.location;
  if (location) {
    lines.push(formatProperty('LOCATION', escapeICSValue(location)));
  }

  // CATEGORIES
  const categories = event.meta?.categories;
  if (categories && Array.isArray(categories)) {
    const cats = categories.map(escapeICSValue).join(',');
    lines.push(formatProperty('CATEGORIES', cats));
  }

  lines.push('END:VEVENT');
  return lines;
}

/**
 * Format a property line with parameters
 */
function formatProperty(
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

  // Fold line if longer than 75 chars (RFC 5545)
  return foldLine(line);
}

/**
 * Fold lines longer than 75 octets
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;

  // Simple folding: split at 75 chars

  const chunks = [];
  let remaining = line;

  // First chunk 75 chars
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);

  // Subsequent chunks 74 chars (prefixed with space)
  while (remaining.length > 0) {
    chunks.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }

  return chunks.join('\r\n');
}

/**
 * Escape ICS text values
 * \\, \;, \n
 */
function escapeICSValue(value: string): string {
  if (!value) return '';
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
