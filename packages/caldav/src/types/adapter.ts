import type { Event } from '@dayflow/core';

import type { CalDAVCalendar } from './calendar';
import type {
  CalDAVRemoteRef,
  CalDAVSyncResult,
  CalDAVWriteResult,
} from './event';

/**
 * The CalDAV adapter interface.
 *
 * Sync tokens, ctags, etags, and retry state are internal adapter/storage concerns.
 * They must not be stored in DayFlow event metadata.
 *
 * Authentication and transport are fully controlled by the application — the adapter
 * receives a user-injected fetch function and never asks for credentials directly.
 */
export interface CalDAVAdapter {
  /**
   * Discover all calendars accessible to the authenticated principal.
   */
  listCalendars(): Promise<CalDAVCalendar[]>;

  /**
   * Load events for a calendar.
   *
   * - Without `syncToken`: performs a calendar-query REPORT, optionally filtered to `range`.
   *   Returns all events in scope; `deleted` is empty (deletions detected by diffing).
   *
   * - With `syncToken`: performs a sync-collection REPORT (RFC 6578).
   *   Returns only changed/added events and deleted resources since the token.
   *   `result.syncToken` carries the new token for the next incremental call.
   *   `range` is ignored when `syncToken` is provided.
   */
  syncEvents(input: {
    calendarId: string;
    range?: {
      start: Date;
      end: Date;
    };
    /** Opaque sync token from a previous syncEvents result. Enables incremental sync. */
    syncToken?: string;
  }): Promise<CalDAVSyncResult>;

  /**
   * Create a new event on the CalDAV server.
   * The adapter converts the DayFlow Event to VEVENT format internally.
   */
  createEvent(input: {
    calendarId: string;
    event: Event;
  }): Promise<CalDAVWriteResult>;

  /**
   * Update an existing event on the CalDAV server.
   * `remote` carries the href and etag required for a conditional PUT request.
   */
  updateEvent(input: {
    calendarId: string;
    event: Event;
    remote: CalDAVRemoteRef;
  }): Promise<CalDAVWriteResult>;

  /**
   * Delete an event from the CalDAV server.
   */
  deleteEvent(input: {
    calendarId: string;
    remote: CalDAVRemoteRef;
  }): Promise<void>;
}
