import { toICalendar } from '@caldav/ics/serialize';
import type { Event } from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';

import { getCalDAVMeta } from './meta';

// ─── UID generation ──────────────────────────────────────────────────────────

export function generateUid(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function'
  ) {
    return `${(crypto as { randomUUID: () => string }).randomUUID()}@dayflow`;
  }
  const rand = Math.random().toString(36).slice(2, 11);
  return `${Date.now()}-${rand}@dayflow`;
}

// ─── Temporal type guard ──────────────────────────────────────────────────────

function isPlainDate(
  dt: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): dt is Temporal.PlainDate {
  return !('hour' in dt);
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

/**
 * Convert a DayFlow Event to a VCALENDAR string for PUT to a CalDAV server.
 *
 * If the event has `meta.caldav.uid`, that UID is reused (for updates).
 * Otherwise a new UID is generated (for creates).
 *
 * All-day events (PlainDate) have their end date incremented by 1 day to
 * produce iCal's exclusive DTEND convention.
 */
export function mapDayFlowEventToCalDAV(event: Event): string {
  const meta = getCalDAVMeta(event);
  if (meta?.isRecurring) {
    throw new Error(
      '@dayflow/caldav does not support writing recurring events in the MVP. Treat recurring CalDAV events as read-only.'
    );
  }

  const uid = meta?.uid ?? generateUid();

  // iCal DTEND for DATE events is exclusive; DayFlow uses inclusive end.
  // e.g. DayFlow Jan 1–Jan 1 (inclusive) → iCal Jan 1–Jan 2 (exclusive)
  const dtend = isPlainDate(event.end)
    ? (event.end as Temporal.PlainDate).add({ days: 1 })
    : event.end;

  const location =
    typeof event.meta?.location === 'string' ? event.meta.location : undefined;

  return toICalendar({
    uid,
    summary: event.title,
    description: event.description,
    location,
    dtstart: event.start,
    dtend,
  });
}
