/**
 * Minimum remote identity needed to write back to a CalDAV server.
 *
 * Do NOT store sync-only fields (syncToken, ctag, sequence, lastSyncedAt)
 * here — those belong in CalDAVStorage.
 */
export type CalDAVRemoteRef = {
  calendarId: string;
  uid: string;
  href: string;
  etag?: string;
};

/**
 * Raw VEVENT data returned by the CalDAV adapter before mapping to DayFlow events.
 */
export type CalDAVEventData = {
  calendarId: string;
  uid: string;
  href: string;
  etag?: string;
  /** Raw iCalendar VEVENT string for mapping in Phase 3. */
  icalData: string;
};

export type CalDAVDeletedEvent = {
  calendarId: string;
  uid?: string;
  href: string;
  etag?: string;
};

/**
 * Result returned by CalDAVAdapter.syncEvents.
 *
 * `syncToken` is the server's new opaque sync token after a sync-collection REPORT.
 * Store it via CalDAVStorage.setSyncToken — pass it on the next call to enable
 * incremental sync (only changed/deleted resources, not a full re-fetch).
 */
export type CalDAVSyncResult = {
  events: CalDAVEventData[];
  deleted: CalDAVDeletedEvent[];
  /**
   * New sync token from server. Present when the adapter used sync-collection REPORT.
   * Pass to the next syncEvents call to request only changes since this token.
   */
  syncToken?: string;
};

/**
 * Result returned by CalDAVAdapter.createEvent and CalDAVAdapter.updateEvent.
 */
export type CalDAVWriteResult = {
  href: string;
  /** Updated ETag after a successful write — use for future conditional requests. */
  etag?: string;
};
