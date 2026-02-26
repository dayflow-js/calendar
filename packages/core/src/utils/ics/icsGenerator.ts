/**
 * ICS Generator
 *
 * Generates iCalendar (.ics) files from DayFlow Event objects.
 * Supports standard RFC 5545 components.
 */

import { Event } from '@/types/event';

import { ICSExportOptions } from './types';
import { generateVEvent, escapeICSValue } from './utils';

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
  } = options;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${productId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSValue(calendarName)}`,
  ];

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
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
