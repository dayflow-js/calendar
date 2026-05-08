import type { CalDAVCalendar } from '@caldav/types/calendar';
import type {
  CalDAVRemoteRef,
  CalDAVSyncResult,
  CalDAVWriteResult,
} from '@caldav/types/event';
import type { Event } from '@dayflow/core';

// ─── Headless sync engine ────────────────────────────────────────────────────

/**
 * Headless CalDAV sync engine — no DayFlow dependency.
 *
 * Wraps the protocol adapter and manages etag/sync-token storage so callers
 * never have to handle those details directly.
 */
export interface CalDAVSync {
  listCalendars(): Promise<CalDAVCalendar[]>;
  syncEvents(input: {
    calendarId: string;
    range?: { start: Date; end: Date };
  }): Promise<CalDAVSyncResult>;
  createEvent(input: {
    calendarId: string;
    event: Event;
  }): Promise<CalDAVWriteResult>;
  updateEvent(input: {
    calendarId: string;
    event: Event;
    remote: CalDAVRemoteRef;
  }): Promise<CalDAVWriteResult>;
  deleteEvent(input: {
    calendarId: string;
    remote: CalDAVRemoteRef;
  }): Promise<void>;
}

// ─── DayFlow binding ─────────────────────────────────────────────────────────

export type CalDAVSyncStatus = {
  state: 'idle' | 'syncing' | 'error';
  lastSyncedAt?: Date;
  error?: unknown;
};

export interface CalDAVDayFlowController {
  /** Discover remote calendars, load initial events, and subscribe to changes. */
  start(): Promise<void>;
  /** Unsubscribe all listeners. Does not clear DayFlow state. */
  stop(): void;
  /**
   * Re-sync a specific calendar or all calendars.
   * If `range` is omitted, uses the last known visible range.
   */
  refresh(input?: {
    calendarId?: string;
    range?: { start: Date; end: Date };
  }): Promise<void>;
  getStatus(): CalDAVSyncStatus;
}

export type CalDAVDayFlowOptions = {
  /**
   * Allow local DayFlow event mutations to be written back to the CalDAV server.
   * Default: true. Set to false for a read-only integration.
   */
  writable?: boolean;

  /**
   * Automatically re-sync events when the user navigates to a new date range.
   * Default: true.
   */
  refreshOnVisibleRangeChange?: boolean;

  eventMode?: {
    /**
     * How recurring events are treated. Only 'read-only' is supported in MVP.
     * Default: 'read-only'.
     */
    recurring?: 'read-only';
  };

  /** Called when any sync or write operation fails. */
  onError?: (error: unknown, context: CalDAVErrorContext) => void;
};

export type CalDAVErrorContext = {
  operation:
    | 'list-calendars'
    | 'initial-sync'
    | 'range-sync'
    | 'create'
    | 'update'
    | 'delete';
  calendarId?: string;
  eventId?: string;
};
