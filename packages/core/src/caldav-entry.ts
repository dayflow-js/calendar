/**
 * Slim entry point for @dayflow/caldav tests.
 * Exports only the non-UI parts of core, avoiding JSX/renderer imports.
 */
export { CalendarApp } from './core/CalendarApp';
export { getCalendarColorsForHex } from './core/calendarRegistry';
export type { CalendarType, CalendarColors } from './types/calendarTypes';
export type {
  EventChange,
  EventMutationSource,
  ICalendarApp,
  RangeChangeReason,
  VisibleRangePayload,
} from './types/core';
export type { Event } from './types/event';
