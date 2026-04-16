import { ComponentChildren } from 'preact';
import { Temporal } from 'temporal-polyfill';

/**
 * Calendar event interface (using Temporal API)
 * Unified event data structure supporting single-day, cross-day, and all-day events
 */
export interface Event {
  id: string;
  title: string;
  description?: string;

  // Using Temporal API to represent time
  // - Temporal.PlainDate: All-day events (date only)
  // - Temporal.PlainDateTime: Local events with time (date + time, no timezone) ✨ Recommended default
  // - Temporal.ZonedDateTime: Cross-timezone events (date + time + timezone)
  start: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
  end: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
  // Pending: make allDay to internal derived field, because we can infer allDay from start/end types(PlainDate)
  allDay?: boolean;

  // all day icon
  icon?: boolean | ComponentChildren;

  // Calendar type reference
  calendarId?: string;
  /** Multi-calendar support: list of calendar IDs this event belongs to.
   *  When present, takes precedence over calendarId for visibility and color rendering.
   *  The event is visible as long as at least one listed calendar is visible. */
  calendarIds?: string[];

  meta?: Record<string, unknown>;

  // Internal use fields (for rendering and layout calculation)
  day?: number;
}
