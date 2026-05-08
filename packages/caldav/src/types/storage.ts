/**
 * CalDAV sync state storage interface.
 *
 * Sync metadata (tokens, ctags, etags) must live here rather than in DayFlow
 * event metadata. This keeps the DayFlow Event model clean and allows the
 * sync engine to evolve its internal bookkeeping independently.
 *
 * Applications are responsible for providing a concrete implementation
 * (e.g. localStorage, IndexedDB, server-side session).
 */
export type CalDAVEventSyncState = {
  calendarId: string;
  uid: string;
  href: string;
  etag?: string;
  sequence?: number;
  lastSyncedAt?: string;
};

export interface CalDAVStorage {
  /** Get the last known sync token for a calendar (for REPORT sync-collection). */
  getSyncToken(calendarId: string): Promise<string | null>;
  setSyncToken(calendarId: string, token: string): Promise<void>;

  /** Get the last known ctag for a calendar (fallback when sync tokens are unavailable). */
  getCtag(calendarId: string): Promise<string | null>;
  setCtag(calendarId: string, ctag: string): Promise<void>;

  /** Get the last known ETag for a specific event resource. */
  getEtag(href: string): Promise<string | null>;
  setEtag(href: string, etag: string): Promise<void>;
  deleteEtag(href: string): Promise<void>;

  /** Get sync metadata for a DayFlow event ID. */
  getEventState(eventId: string): Promise<CalDAVEventSyncState | null>;
  setEventState(eventId: string, state: CalDAVEventSyncState): Promise<void>;
  deleteEventState(eventId: string): Promise<void>;

  /** Remove all sync state for a calendar (e.g. on full re-sync or calendar deletion). */
  clearCalendar(calendarId: string): Promise<void>;
}
