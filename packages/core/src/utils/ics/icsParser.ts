/**
 * ICS Parser
 *
 * Parses iCalendar (.ics) format into DayFlow Event objects.
 * Supports standard RFC 5545 VEVENT components.
 */

import { ICSImportOptions, ICSImportResult } from './types';
import {
  parseVEventLines,
  convertToDayFlowEvent,
  extractVEvents,
} from './utils';

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
    const unfoldedContent = icsContent.replaceAll(/(\r\n|\n|\r)[ \t]/g, '');

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
      } catch (e: unknown) {
        result.errors.push({
          line: 0,
          message: e instanceof Error ? e.message : 'Unknown parsing error',
          eventUid: `index-${index}`,
        });
      }
    });

    result.success = result.errors.length === 0;
    result.totalImported = result.events.length;
  } catch (e: unknown) {
    result.errors.push({
      message: `Fatal parsing error: ${e instanceof Error ? e.message : 'Unknown error'}`,
    });
  }

  return result;
}
