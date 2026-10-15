import { ComponentChildren } from 'preact';
import { Temporal } from 'temporal-polyfill';

export type KnownMeetingProviderId =
  | 'google-meet'
  | 'zoom'
  | 'microsoft-teams'
  | 'webex'
  | 'whereby'
  | 'jitsi';

/** Join information for a video conference attached to an event. */
export interface EventConference {
  /** Provider ID. Known providers are detected from joinUrl automatically. */
  provider?: KnownMeetingProviderId | 'custom';
  /** URL attendees use to join the conference. */
  joinUrl: string;
  meetingId?: string;
  hostUrl?: string;
  password?: string;
  meta?: Record<string, unknown>;
}

/** Whether a calendar item is a regular event or a task. */
export type EventKind = 'event' | 'task';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high';

/** Task-only state. Ignored unless `kind` is `'task'`. */
export interface EventTask {
  completed?: boolean;
  /** When the task was marked complete. Cleared when it is reopened. */
  completedAt?: Temporal.ZonedDateTime;
  priority?: TaskPriority;
}

/**
 * Calendar event interface (using Temporal API)
 * Unified event data structure supporting single-day, cross-day, and all-day events
 */
export interface Event {
  id: string;
  title: string;
  description?: string;

  /**
   * Item kind, `'event'` when omitted.
   * A task is due at `start` and keeps `end` equal to `start`; an all-day task has no due time.
   */
  kind?: EventKind;
  /** Task state, used when `kind` is `'task'`. */
  task?: EventTask;

  /** Optional video-conference details for the event. */
  conference?: EventConference;

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
  /** Original start hour (used for stable cross-day layout) */
  _originalStartHour?: number;
  /** Original end hour (used for stable cross-day layout) */
  _originalEndHour?: number;
  /** Recurrence master ID for a generated render-only occurrence. */
  _recurrenceMasterId?: string;
  /** Stable occurrence key for generated recurrence instances. */
  _recurrenceKey?: string;
}
