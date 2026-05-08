import type { Event } from '@dayflow/core';

/**
 * Remote identity stored in DayFlow `event.meta.caldav`.
 *
 * Only the minimum fields needed to write back to CalDAV are stored here.
 * Do NOT add syncToken, ctag, sequence, or lastSyncedAt — those belong in CalDAVStorage.
 */
export type CalDAVEventMeta = {
  uid: string;
  href: string;
  etag?: string;
  calendarId: string;
  /** True when the source VEVENT contains an RRULE. Recurring events are read-only in MVP. */
  isRecurring: boolean;
};

/** Extract the CalDAV meta from a DayFlow event, or return null if absent. */
export function getCalDAVMeta(event: Event): CalDAVEventMeta | null {
  const caldav = event.meta?.caldav;
  if (
    caldav &&
    typeof caldav === 'object' &&
    'uid' in caldav &&
    'href' in caldav &&
    'calendarId' in caldav
  ) {
    return caldav as CalDAVEventMeta;
  }
  return null;
}
