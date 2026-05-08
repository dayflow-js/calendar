import { getCalDAVMeta } from '@caldav/mapper';
import type { CalDAVAdapter } from '@caldav/types/adapter';
import type { CalDAVRemoteRef, CalDAVWriteResult } from '@caldav/types/event';
import type { CalDAVStorage } from '@caldav/types/storage';
import type { Event } from '@dayflow/core';

import type { CalDAVSync } from './types';

/**
 * Create a headless CalDAV sync engine.
 *
 * This layer wraps the protocol adapter and handles etag/sync-token storage
 * so callers never have to manage those details. It has no dependency on DayFlow.
 */
export function createCalDAVSync({
  adapter,
  storage,
}: {
  adapter: CalDAVAdapter;
  storage: CalDAVStorage;
}): CalDAVSync {
  return {
    listCalendars: () => adapter.listCalendars(),

    async syncEvents({ calendarId, range }) {
      // Use stored sync tokens only for collection-wide sync. Visible-range
      // loading still needs a range REPORT so unchanged events in a newly
      // visible range are not skipped.
      const storedToken = range ? null : await storage.getSyncToken(calendarId);
      const result = await adapter.syncEvents({
        calendarId,
        range,
        syncToken: storedToken ?? undefined,
      });

      // Persist new sync token for the next incremental call
      if (result.syncToken) {
        await storage.setSyncToken(calendarId, result.syncToken);
      }

      await Promise.all([
        ...result.events.map(async event => {
          if (event.etag) {
            await storage.setEtag(event.href, event.etag);
          }
          await storage.setEventState(event.uid, {
            calendarId: event.calendarId,
            uid: event.uid,
            href: event.href,
            etag: event.etag,
            lastSyncedAt: new Date().toISOString(),
          });
        }),
        ...result.deleted.map(async event => {
          await storage.deleteEtag(event.href);
          if (event.uid) {
            await storage.deleteEventState(event.uid);
          }
        }),
      ]);

      return result;
    },

    async createEvent({
      calendarId,
      event,
    }: {
      calendarId: string;
      event: Event;
    }): Promise<CalDAVWriteResult> {
      const result = await adapter.createEvent({ calendarId, event });
      // Persist the server-assigned etag for use in future conditional requests
      if (result.etag) {
        await storage.setEtag(result.href, result.etag);
      }
      const meta = getCalDAVMeta(event);
      const uid = meta?.uid ?? event.id;
      await storage.setEventState(event.id, {
        calendarId,
        uid,
        href: result.href,
        etag: result.etag,
        lastSyncedAt: new Date().toISOString(),
      });
      return result;
    },

    async updateEvent({
      calendarId,
      event,
      remote,
    }: {
      calendarId: string;
      event: Event;
      remote: CalDAVRemoteRef;
    }): Promise<CalDAVWriteResult> {
      const result = await adapter.updateEvent({ calendarId, event, remote });
      if (result.etag) {
        await storage.setEtag(result.href, result.etag);
      }
      await storage.setEventState(event.id, {
        calendarId,
        uid: remote.uid,
        href: result.href,
        etag: result.etag,
        lastSyncedAt: new Date().toISOString(),
      });
      return result;
    },

    async deleteEvent({
      calendarId,
      remote,
    }: {
      calendarId: string;
      remote: CalDAVRemoteRef;
    }): Promise<void> {
      await adapter.deleteEvent({ calendarId, remote });
      await storage.deleteEtag(remote.href);
      await storage.deleteEventState(remote.uid);
    },
  };
}
