// ─── Microsoft Graph Calendar API types ──────────────────────────────────────
// https://learn.microsoft.com/en-us/graph/api/resources/calendar

export type OutlookCalendarColor =
  | 'auto'
  | 'lightBlue'
  | 'lightGreen'
  | 'lightOrange'
  | 'lightGray'
  | 'lightYellow'
  | 'lightTeal'
  | 'lightPink'
  | 'lightBrown'
  | 'lightRed'
  | 'maxColor'
  | 'darkBlue'
  | 'darkGreen'
  | 'darkOrange'
  | 'darkGray'
  | 'darkYellow'
  | 'darkTeal'
  | 'darkPink'
  | 'darkBrown'
  | 'darkRed';

export type OutlookCalendar = {
  id: string;
  name: string;
  color: OutlookCalendarColor;
  isDefaultCalendar: boolean;
  /** True if the signed-in user can write to the calendar. */
  canEdit: boolean;
  canShare: boolean;
  canViewPrivateItems: boolean;
  owner?: {
    name: string;
    address: string;
  };
  changeKey?: string;
};

export type OutlookCalendarList = {
  value: OutlookCalendar[];
  '@odata.nextLink'?: string;
};

// ─── Events ──────────────────────────────────────────────────────────────────

export type OutlookDateTimeValue = {
  /** ISO 8601 datetime string (without offset). */
  dateTime: string;
  /** IANA timezone name, e.g. "America/New_York". */
  timeZone: string;
};

export type OutlookEventType =
  | 'singleInstance'
  | 'occurrence'
  | 'exception'
  | 'seriesMaster';

export type OutlookEvent = {
  id: string;
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: OutlookDateTimeValue;
  end: OutlookDateTimeValue;
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  type: OutlookEventType;
  seriesMasterId?: string;
  /** Identifies the version for optimistic concurrency control. */
  changeKey: string;
  /** OData ETag for conditional requests (`If-Match` header). */
  '@odata.etag': string;
  location?: {
    displayName: string;
  };
  recurrence?: unknown;
  organizer?: {
    emailAddress: { name: string; address: string };
  };
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?:
    | 'unknown'
    | 'teamsForBusiness'
    | 'skypeForBusiness'
    | 'skypeForConsumer';
  onlineMeeting?: {
    conferenceId?: string;
    joinUrl?: string;
  };
  /** Legacy fallback; prefer onlineMeeting.joinUrl. */
  onlineMeetingUrl?: string;
};

/**
 * Represents an event that was deleted or moved outside the calendarView window
 * in a delta response. Only `id` and `@removed` are guaranteed to be present.
 */
export type OutlookDeletedItem = {
  id: string;
  '@removed': { reason: 'deleted' | 'changed' };
};

export type OutlookEventListItem = OutlookEvent | OutlookDeletedItem;

export type OutlookEventList = {
  value: OutlookEventListItem[];
  '@odata.nextLink'?: string;
  /** Present on the last page of a delta response. Persist for next sync. */
  '@odata.deltaLink'?: string;
};

export type OutlookEventInput = {
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: OutlookDateTimeValue;
  end: OutlookDateTimeValue;
  isAllDay?: boolean;
  location?: {
    displayName: string;
  };
};

export type OutlookListEventsOptions = {
  /** ISO 8601 start of the time window (required for calendarView). */
  startDateTime?: string;
  /** ISO 8601 end of the time window (required for calendarView). */
  endDateTime?: string;
  /**
   * If provided, performs an incremental delta sync from this token.
   * Omit startDateTime/endDateTime when using a deltaLink.
   */
  deltaLink?: string;
};
