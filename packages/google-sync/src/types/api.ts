// Minimal Google Calendar REST API v3 types needed for DayFlow sync.

export type GoogleDateTime = {
  dateTime?: string; // RFC 3339, e.g. "2025-01-01T10:00:00-05:00"
  date?: string; // YYYY-MM-DD for all-day events
  timeZone?: string; // IANA timezone, e.g. "America/New_York"
};

export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleDateTime;
  end: GoogleDateTime;
  etag: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  recurrence?: string[];
  recurringEventId?: string;
  created?: string;
  updated?: string;
  colorId?: string;
};

export type GoogleEventInput = {
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleDateTime;
  end: GoogleDateTime;
};

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
};

export type GoogleCalendarList = {
  items: GoogleCalendarListEntry[];
  nextSyncToken?: string;
  nextPageToken?: string;
};

export type GoogleEventList = {
  items: GoogleCalendarEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
};

export type GoogleListEventsOptions = {
  timeMin?: string; // RFC 3339
  timeMax?: string; // RFC 3339
  syncToken?: string;
  pageToken?: string;
  singleEvents?: boolean;
  showDeleted?: boolean;
};
