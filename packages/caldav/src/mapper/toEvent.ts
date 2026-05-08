import { parseICalDate, parseICalendar } from '@caldav/ics/parse';
import type { CalDAVEventData } from '@caldav/types/event';
import type { Event } from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';

import type { CalDAVEventMeta } from './meta';

// ─── Temporal type guard (local copy — avoids importing @dayflow/core internals) ──

function isPlainDate(
  dt: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): dt is Temporal.PlainDate {
  return !('hour' in dt);
}

function addICalDuration(
  start: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  duration: string
): Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime {
  const parsedDuration = Temporal.Duration.from(duration);
  return start.add(parsedDuration);
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

/**
 * Convert a CalDAV event payload to a DayFlow Event.
 *
 * Remote identity (uid, href, etag, calendarId) is preserved in `event.meta.caldav`.
 * Sync-only state (sequence, lastSyncedAt) lives in CalDAVStorage, not here.
 *
 * Returns null if the iCal data cannot be parsed or is missing required fields.
 */
export function mapCalDAVEventToDayFlow(data: CalDAVEventData): Event | null {
  let vevents;
  try {
    vevents = parseICalendar(data.icalData);
  } catch {
    return null;
  }

  if (vevents.length === 0) return null;
  const vevent = vevents[0];

  if (!vevent.uid || !vevent.dtstart) return null;

  let start:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime;
  let end: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;

  try {
    start = parseICalDate(vevent.dtstart);
  } catch {
    return null;
  }

  if (vevent.dtend) {
    try {
      end = parseICalDate(vevent.dtend);
    } catch {
      end = start;
    }
  } else if (vevent.duration) {
    try {
      end = addICalDuration(start, vevent.duration);
    } catch {
      end = start;
    }
  } else {
    end = start;
  }

  // iCal DTEND for DATE events is exclusive; DayFlow uses inclusive end.
  // e.g. iCal Jan 1–Jan 2 (exclusive) → DayFlow Jan 1–Jan 1 (inclusive)
  if (isPlainDate(start) && isPlainDate(end)) {
    const endPd = end as Temporal.PlainDate;
    const startPd = start as Temporal.PlainDate;
    const comparison = Temporal.PlainDate.compare(endPd, startPd);
    if (comparison > 0) {
      end = endPd.subtract({ days: 1 });
    }
  }

  const isRecurring = vevent.rrule !== undefined;

  const caldavMeta: CalDAVEventMeta = {
    uid: vevent.uid,
    href: data.href,
    etag: data.etag,
    calendarId: data.calendarId,
    isRecurring,
  };

  const eventMeta: Record<string, unknown> = { caldav: caldavMeta };
  if (vevent.location) {
    eventMeta.location = vevent.location;
  }

  const event: Event = {
    id: vevent.uid,
    title: vevent.summary ?? '(No Title)',
    start,
    end,
    calendarId: data.calendarId,
    meta: eventMeta,
  };

  if (vevent.description) {
    event.description = vevent.description;
  }

  return event;
}
