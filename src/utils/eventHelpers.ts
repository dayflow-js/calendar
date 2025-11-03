/**
 * Event Helper Functions
 *
 * This module provides simplified APIs for creating events.
 * Provides multiple layers of abstraction:
 * - Simple API: createSimpleEvent() - for local events without timezone complexity
 * - Advanced API: createEventWithTimeZone() - for timezone-aware events
 * - Direct API: Users can still use Temporal API directly for full control
 */

import { Temporal } from 'temporal-polyfill';
import { Event } from '@/types';
import {
  dateToPlainDate,
  dateToPlainDateTime,
  dateToZonedDateTime,
} from './temporalTypeGuards';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Event creation parameters - supports both Date and Temporal types
 * For local events (no timezone)
 */
export interface CreateEventParams {
  id: string;
  title: string;
  description?: string;

  // Flexible time input - accepts Date or Temporal types
  // - Date: Will be converted to PlainDateTime (for timed events) or PlainDate (for allDay events)
  // - Temporal.PlainDate: All-day events (date only)
  // - Temporal.PlainDateTime: Local events with time (date+time, no timezone) ✨ Recommended default
  start: Date | Temporal.PlainDate | Temporal.PlainDateTime;
  end: Date | Temporal.PlainDate | Temporal.PlainDateTime;

  // Event properties
  allDay?: boolean;
  calendarId?: string;
  meta?: Record<string, any>;
}

/**
 * Timezone event creation parameters
 * For events that need explicit timezone handling
 */
export interface CreateTimezoneEventParams {
  id: string;
  title: string;
  description?: string;

  // Flexible time input - accepts Date or ZonedDateTime
  // - Date: Will be converted to ZonedDateTime using the specified timezone
  // - Temporal.ZonedDateTime: Timezone-aware events (date+time+timezone)
  start: Date | Temporal.ZonedDateTime;
  end: Date | Temporal.ZonedDateTime;

  // Required timezone for Date conversion
  // Only used when start/end are Date objects
  timeZone: string; // e.g., 'America/New_York', 'Asia/Shanghai'

  // Event properties
  calendarId?: string;
  meta?: Record<string, any>;
}


// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert input to Temporal type for local events
 */
function normalizeLocalTime(
  time: Date | Temporal.PlainDate | Temporal.PlainDateTime,
  allDay: boolean = false
): Temporal.PlainDate | Temporal.PlainDateTime {
  // Already Temporal type - return as is
  if (time instanceof Temporal.PlainDate || time instanceof Temporal.PlainDateTime) {
    return time;
  }

  // Date object - convert based on allDay flag
  if (time instanceof Date) {
    return allDay ? dateToPlainDate(time) : dateToPlainDateTime(time);
  }

  throw new Error(`Invalid time type: ${typeof time}`);
}

/**
 * Convert input to ZonedDateTime
 */
function normalizeZonedTime(
  time: Date | Temporal.ZonedDateTime,
  timeZone: string
): Temporal.ZonedDateTime {
  // Already ZonedDateTime - return as is
  if (time instanceof Temporal.ZonedDateTime) {
    return time;
  }

  // Date object - convert to ZonedDateTime
  if (time instanceof Date) {
    return dateToZonedDateTime(time, timeZone);
  }

  throw new Error(`Invalid time type: ${typeof time}`);
}

// ============================================================================
// Event Creation Functions
// ============================================================================

/**
 * Create local event (recommended for most use cases)
 *
 * Supports flexible input types:
 * - Date objects (automatically converted)
 * - Temporal.PlainDate (for all-day events)
 * - Temporal.PlainDateTime (for timed events)
 *
 * @example
 * // Using Date objects
 * createEvent({
 *   id: '1',
 *   title: 'Team Meeting',
 *   start: new Date(2025, 0, 15, 14, 30),
 *   end: new Date(2025, 0, 15, 16, 0),
 * });
 *
 * @example
 * // Using Temporal.PlainDateTime
 * createEvent({
 *   id: '2',
 *   title: 'Workshop',
 *   start: Temporal.PlainDateTime.from('2025-01-15T09:00'),
 *   end: Temporal.PlainDateTime.from('2025-01-15T17:00'),
 * });
 *
 * @example
 * // All-day event
 * createEvent({
 *   id: '3',
 *   title: 'Birthday',
 *   start: new Date(2025, 0, 15),
 *   end: new Date(2025, 0, 15),
 *   allDay: true,
 * });
 */
export function createEvent(params: CreateEventParams): Event {
  const start = normalizeLocalTime(params.start, params.allDay);
  const end = normalizeLocalTime(params.end, params.allDay);

  return {
    id: params.id,
    title: params.title,
    description: params.description,
    start,
    end,
    allDay: params.allDay ?? false,
    calendarId: params.calendarId,
    meta: params.meta,
  };
}

// ============================================================================
// Timezone Event Creation
// ============================================================================

/**
 * Create timezone-aware event
 *
 * Use this when you need explicit timezone control, such as:
 * - International meetings across timezones
 * - Flight schedules
 * - Events that need to show in different timezones
 *
 * Supports flexible input types:
 * - Date objects (converted using specified timezone)
 * - Temporal.ZonedDateTime (used directly)
 *
 * @example
 * // Using Date objects
 * createTimezoneEvent({
 *   id: '1',
 *   title: 'International Conference',
 *   start: new Date(2025, 0, 15, 14, 0),
 *   end: new Date(2025, 0, 15, 16, 0),
 *   timeZone: 'America/New_York'
 * });
 *
 * @example
 * // Using ZonedDateTime
 * createTimezoneEvent({
 *   id: '2',
 *   title: 'Asia-US Sync',
 *   start: Temporal.ZonedDateTime.from('2025-01-15T09:00[Asia/Shanghai]'),
 *   end: Temporal.ZonedDateTime.from('2025-01-15T10:00[Asia/Shanghai]'),
 *   timeZone: 'Asia/Shanghai', // Only used if start/end are Date objects
 * });
 */
export function createTimezoneEvent(params: CreateTimezoneEventParams): Event {
  const start = normalizeZonedTime(params.start, params.timeZone);
  const end = normalizeZonedTime(params.end, params.timeZone);

  return {
    id: params.id,
    title: params.title,
    description: params.description,
    start,
    end,
    allDay: false, // Timezone events are always timed events
    calendarId: params.calendarId,
    meta: params.meta,
  };
}

// ============================================================================
// Batch Creation Helpers
// ============================================================================

/**
 * Create multiple local events at once
 */
export function createEvents(paramsArray: CreateEventParams[]): Event[] {
  return paramsArray.map(params => createEvent(params));
}

/**
 * Create multiple timezone-aware events at once
 */
export function createTimezoneEvents(
  paramsArray: CreateTimezoneEventParams[]
): Event[] {
  return paramsArray.map(params => createTimezoneEvent(params));
}

// ============================================================================
// Quick Creation Shortcuts
// ============================================================================

/**
 * Quick create all-day event
 */
export function createAllDayEvent(
  id: string,
  title: string,
  date: Date,
  options?: Omit<CreateEventParams, 'id' | 'title' | 'start' | 'end' | 'allDay'>
): Event {
  return createEvent({
    id,
    title,
    start: date,
    end: date,
    allDay: true,
    ...options,
  });
}

/**
 * Quick create timed event
 */
export function createTimedEvent(
  id: string,
  title: string,
  start: Date,
  end: Date,
  options?: Omit<CreateEventParams, 'id' | 'title' | 'start' | 'end'>
): Event {
  return createEvent({
    id,
    title,
    start,
    end,
    ...options,
  });
}

// ============================================================================
// Conversion Helpers (for backward compatibility)
// ============================================================================

/**
 * Convert legacy Date-based event to Temporal-based event
 * @deprecated Use createEvent() directly with Date objects instead
 */
export function convertDateEvent(
  id: string,
  title: string,
  startDate: Date,
  endDate: Date,
  allDay: boolean = false,
  options?: {
    description?: string;
    calendarId?: string;
    meta?: Record<string, any>;
  }
): Event {
  return createEvent({
    id,
    title,
    start: startDate,
    end: endDate,
    allDay,
    ...options,
  });
}

/**
 * Convert legacy Date-based event to timezone-aware event
 * @deprecated Use createTimezoneEvent() directly with Date objects instead
 */
export function convertDateEventWithTimeZone(
  id: string,
  title: string,
  startDate: Date,
  endDate: Date,
  timeZone: string,
  options?: {
    description?: string;
    calendarId?: string;
    meta?: Record<string, any>;
  }
): Event {
  return createTimezoneEvent({
    id,
    title,
    start: startDate,
    end: endDate,
    timeZone,
    ...options,
  });
}
