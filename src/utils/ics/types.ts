/**
 * ICS (iCalendar) Types
 *
 * Type definitions for ICS file import/export functionality.
 * Based on RFC 5545 iCalendar specification.
 */

import { Event } from '../../types/event';

/**
 * ICS VEVENT raw data structure (intermediate format after parsing)
 */
export interface ICSVEvent {
  /** Unique identifier */
  uid: string;
  /** Event summary/title */
  summary: string;
  /** Event description */
  description?: string;
  /** Start date/time in ICS format */
  dtstart: string;
  /** End date/time in ICS format */
  dtend: string;
  /** DTSTART parameters */
  dtstartParams?: ICSDateParams;
  /** DTEND parameters */
  dtendParams?: ICSDateParams;
  /** Event location */
  location?: string;
  /** Event categories */
  categories?: string[];
}

/**
 * ICS date/time parameters
 */
export interface ICSDateParams {
  /** Value type: DATE for all-day, DATE-TIME for timed events */
  value?: 'DATE' | 'DATE-TIME';
  /** Timezone identifier (e.g., "America/New_York") */
  tzid?: string;
}

/**
 * ICS import options
 */
export interface ICSImportOptions {
  /** Default calendar ID for imported events */
  calendarId?: string;
  /** Generate new IDs for imported events (default: true) */
  generateNewIds?: boolean;
  /** ID prefix for generated IDs (default: "ics-") */
  idPrefix?: string;
  /** Default timezone when ICS has no timezone info */
  defaultTimeZone?: string;
}

/**
 * ICS export options
 */
export interface ICSExportOptions {
  /** Calendar name in exported file */
  calendarName?: string;
  /** Product identifier */
  productId?: string;
  /** Include timezone information */
  includeTimezone?: boolean;
  /** Export filename (without extension) */
  filename?: string;
}

/**
 * ICS import result
 */
export interface ICSImportResult {
  /** Whether import completed without errors */
  success: boolean;
  /** Successfully imported events */
  events: Event[];
  /** Parse errors encountered */
  errors: ICSParseError[];
  /** Total VEVENTs found in file */
  totalParsed: number;
  /** Successfully imported event count */
  totalImported: number;
}

/**
 * ICS parse error
 */
export interface ICSParseError {
  /** Line number where error occurred */
  line?: number;
  /** Error message */
  message: string;
  /** UID of the event that failed (if available) */
  eventUid?: string;
}
