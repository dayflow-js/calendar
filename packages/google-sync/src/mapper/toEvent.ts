import type { Event } from '@dayflow/core';
import type { GoogleCalendarEvent } from '@google-sync/types/api';
import { Temporal } from 'temporal-polyfill';

function isPlainDate(
  dt: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): boolean {
  return (
    dt instanceof Temporal.PlainDate ||
    (!('hour' in dt) && !('timeZoneId' in dt))
  );
}

/**
 * Convert RFC 3339 datetime to Temporal-parseable string.
 * If timeZone is provided as IANA name, annotate the offset string.
 */
function toTemporalString(rfc3339: string, timeZone?: string): string {
  if (timeZone) {
    // e.g. "2025-01-01T10:00:00-05:00" + "America/New_York" → "2025-01-01T10:00:00-05:00[America/New_York]"
    return `${rfc3339}[${timeZone}]`;
  }
  // No IANA name available — parse as ZonedDateTime using offset as-is
  // Temporal requires a timezone identifier, so convert UTC offset to a named zone
  const utcMatch = /([+-]\d{2}:\d{2})$/.exec(rfc3339);
  if (utcMatch) {
    return `${rfc3339}[${utcMatch[1]}]`;
  }
  // "Z" suffix — UTC
  return rfc3339.replace('Z', '+00:00[UTC]');
}

function parseGoogleDateTime(dt: {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}):
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime
  | null {
  if (dt.date) {
    try {
      return Temporal.PlainDate.from(dt.date);
    } catch {
      return null;
    }
  }

  if (dt.dateTime) {
    try {
      // RFC 3339 string — always has timezone offset
      const zdt = Temporal.ZonedDateTime.from(
        dt.dateTime.includes('[')
          ? dt.dateTime
          : toTemporalString(dt.dateTime, dt.timeZone)
      );
      return zdt;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Map a Google Calendar Event to a DayFlow Event.
 */
export function mapGoogleEventToDayFlow(
  googleEvent: GoogleCalendarEvent,
  calendarId: string
): Event | null {
  if (googleEvent.status === 'cancelled') return null;

  const start = parseGoogleDateTime(googleEvent.start);
  const end = parseGoogleDateTime(googleEvent.end);
  if (!start || !end) return null;

  // All-day events: Google DTEND is exclusive — subtract 1 day for DayFlow inclusive end
  const adjustedEnd =
    isPlainDate(start) && isPlainDate(end)
      ? (end as Temporal.PlainDate).subtract({ days: 1 })
      : end;

  const event: Event = {
    id: googleEvent.id,
    title: googleEvent.summary ?? '',
    start,
    end: adjustedEnd,
    allDay: isPlainDate(start),
    calendarId,
    meta: {
      google: {
        eventId: googleEvent.id,
        calendarId,
        etag: googleEvent.etag,
        isRecurring: !!(
          googleEvent.recurrence?.length || googleEvent.recurringEventId
        ),
      },
    },
  };

  if (googleEvent.description) event.description = googleEvent.description;
  if (googleEvent.location) {
    event.meta = {
      ...event.meta,
      location: googleEvent.location,
    };
  }

  return event;
}
