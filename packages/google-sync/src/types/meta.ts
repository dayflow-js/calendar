import type { Event } from '@dayflow/core';

export type GoogleEventMeta = {
  eventId: string;
  calendarId: string;
  etag: string;
  isRecurring: boolean;
};

export function getGoogleMeta(event: Event): GoogleEventMeta | null {
  const meta = event.meta?.google as GoogleEventMeta | undefined;
  if (!meta?.eventId || !meta?.calendarId || !meta?.etag) return null;
  return meta;
}
