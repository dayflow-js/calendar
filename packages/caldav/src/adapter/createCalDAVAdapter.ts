import { parseICalendar } from '@caldav/ics/parse';
import {
  generateUid,
  getCalDAVMeta,
  mapDayFlowEventToCalDAV,
} from '@caldav/mapper';
import type { CalDAVAdapter } from '@caldav/types/adapter';
import type { CalDAVCalendar } from '@caldav/types/calendar';
import type {
  CalDAVEventData,
  CalDAVRemoteRef,
  CalDAVSyncResult,
  CalDAVWriteResult,
} from '@caldav/types/event';
import type { Event } from '@dayflow/core';

import { CalDAVError } from './errors';
import {
  getCalendarColor,
  getCalendarData,
  getFirstText,
  getPrivileges,
  getResponseBlocks,
  isCalendarCollection,
  normalizeXml,
} from './xml';

// ─── Request bodies ───────────────────────────────────────────────────────────

const PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:"
            xmlns:C="urn:ietf:params:xml:ns:caldav"
            xmlns:CS="http://calendarserver.org/ns/"
            xmlns:IC="http://apple.com/ns/ical/">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
    <D:current-user-privilege-set/>
    <IC:calendar-color/>
    <CS:calendar-color/>
  </D:prop>
</D:propfind>`;

const p = (n: number, w = 2) => String(n).padStart(w, '0');

function formatUtcTimestamp(date: Date): string {
  return (
    p(date.getUTCFullYear(), 4) +
    p(date.getUTCMonth() + 1) +
    p(date.getUTCDate()) +
    'T' +
    p(date.getUTCHours()) +
    p(date.getUTCMinutes()) +
    p(date.getUTCSeconds()) +
    'Z'
  );
}

function buildReportBody(range?: { start: Date; end: Date }): string {
  const timeRange = range
    ? `<C:time-range start="${formatUtcTimestamp(range.start)}" end="${formatUtcTimestamp(range.end)}"/>`
    : '';
  return `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">${timeRange}</C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;
}

/** RFC 6578 sync-collection REPORT — returns only changes since the given sync token. */
function buildSyncCollectionBody(syncToken: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<D:sync-collection xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:sync-token>${syncToken}</D:sync-token>
  <D:sync-level>1</D:sync-level>
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
</D:sync-collection>`;
}

function parseCalendars(xml: string): CalDAVCalendar[] {
  const calendars: CalDAVCalendar[] = [];

  for (const block of getResponseBlocks(xml)) {
    if (!isCalendarCollection(block)) continue;

    const id = getFirstText(block, 'href');
    const name = getFirstText(block, 'displayname');
    if (!id || !name) continue;

    const color = getCalendarColor(block);
    const perms = getPrivileges(block);
    const hasAnyWrite =
      perms.canCreate === true ||
      perms.canUpdate === true ||
      perms.canDelete === true;
    const hasNoPrivSet =
      !perms.canCreate && !perms.canUpdate && !perms.canDelete;

    calendars.push({
      id,
      name,
      color,
      // Conservative default: read-only if no write privileges detected.
      // Radicale may omit current-user-privilege-set → treat as read-only.
      readOnly: hasNoPrivSet ? true : !hasAnyWrite,
      permissions: hasNoPrivSet ? undefined : perms,
    });
  }

  return calendars;
}

function parseEvents(xml: string, calendarId: string): CalDAVSyncResult {
  const events: CalDAVEventData[] = [];

  for (const block of getResponseBlocks(xml)) {
    const href = getFirstText(block, 'href');
    const etag = getFirstText(block, 'getetag') ?? undefined;
    const icalData = getCalendarData(block);

    if (!href || !icalData) continue;

    let uid: string | undefined;
    try {
      uid = parseICalendar(icalData)[0]?.uid;
    } catch {
      continue;
    }
    if (!uid) continue;

    events.push({ calendarId, uid, href, etag, icalData });
  }

  return { events, deleted: [] };
}

/**
 * Parse a sync-collection REPORT response (RFC 6578).
 * Returns changed events, deleted hrefs, and the new sync token.
 */
function parseSyncCollection(
  xml: string,
  calendarId: string
): CalDAVSyncResult {
  const normalized = normalizeXml(xml);

  // Extract the new sync token from the multistatus root (outside response blocks)
  const tokenMatch = normalized.match(
    /<sync-token[^>]*>([^<]+)<\/sync-token>/i
  );
  const syncToken = tokenMatch?.[1]?.trim() || undefined;

  const events: CalDAVEventData[] = [];
  const deleted: import('@caldav/types/event').CalDAVDeletedEvent[] = [];

  for (const block of getResponseBlocks(xml)) {
    const href = getFirstText(block, 'href');
    if (!href) continue;

    // 404 status at the response level = deleted resource
    const isDeleted = /HTTP\/1\.[01]\s+404/i.test(block);
    if (isDeleted) {
      deleted.push({ calendarId, href });
      continue;
    }

    const etag = getFirstText(block, 'getetag') ?? undefined;
    const icalData = getCalendarData(block);
    if (!icalData) continue;

    let uid: string | undefined;
    try {
      uid = parseICalendar(icalData)[0]?.uid;
    } catch {
      continue;
    }
    if (!uid) continue;

    events.push({ calendarId, uid, href, etag, icalData });
  }

  return { events, deleted, syncToken };
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function buildEventHref(calendarId: string, uid: string): string {
  const base = calendarId.endsWith('/') ? calendarId : `${calendarId}/`;
  return `${base}${uid}.ics`;
}

function assertSuccess(
  response: Response,
  allowedStatuses: number[],
  href: string
): void {
  if (response.status === 412) {
    throw new CalDAVError('etag-conflict', 'ETag conflict', 412, href);
  }
  if (response.status === 403) {
    throw new CalDAVError('forbidden', 'Forbidden', 403, href);
  }
  if (response.status === 404) {
    throw new CalDAVError('not-found', 'Not found', 404, href);
  }
  if (!allowedStatuses.includes(response.status)) {
    throw new CalDAVError(
      'server-error',
      `Unexpected status ${response.status}`,
      response.status,
      href
    );
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export type CalDAVAdapterOptions = {
  /**
   * URL of the authenticated user's CalDAV calendar home collection.
   * Typically discovered once and stored; e.g. `/dav/user/calendars/`.
   *
   * Nextcloud: `/remote.php/dav/calendars/<username>/`
   * Radicale:  `/<username>/`
   * iCloud:    discovered via PROPFIND on `https://caldav.icloud.com/`
   */
  calendarHomeUrl: string;

  /**
   * User-controlled fetch function.
   * The application injects auth headers (tokens, cookies) before forwarding
   * requests to the CalDAV server, typically via a backend proxy.
   * DayFlow never sees credentials.
   */
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
};

/**
 * Create a CalDAV adapter that implements the CalDAVAdapter interface.
 *
 * The adapter handles CalDAV protocol details (PROPFIND, REPORT, PUT, DELETE)
 * while delegating authentication and transport to the application.
 */
export function createCalDAVAdapter(
  options: CalDAVAdapterOptions
): CalDAVAdapter {
  const { calendarHomeUrl, fetch: userFetch } = options;

  function request(url: string, init: RequestInit): Promise<Response> {
    return userFetch(url, init);
  }

  return {
    // ── Calendar discovery ────────────────────────────────────────────────────

    async listCalendars(): Promise<CalDAVCalendar[]> {
      const response = await request(calendarHomeUrl, {
        method: 'PROPFIND',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          Depth: '1',
        },
        body: PROPFIND_BODY,
      });

      // 207 Multi-Status is the expected success code for PROPFIND
      assertSuccess(response, [207], calendarHomeUrl);
      return parseCalendars(await response.text());
    },

    // ── Event sync ────────────────────────────────────────────────────────────

    async syncEvents({
      calendarId,
      range,
      syncToken,
    }: {
      calendarId: string;
      range?: { start: Date; end: Date };
      syncToken?: string;
    }): Promise<CalDAVSyncResult> {
      if (syncToken) {
        // Incremental sync via RFC 6578 sync-collection REPORT
        const response = await request(calendarId, {
          method: 'REPORT',
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            Depth: '1',
          },
          body: buildSyncCollectionBody(syncToken),
        });

        // 403/409 with DAV:valid-sync-token error = stale token → full sync fallback
        if (response.status === 403 || response.status === 409) {
          const fallback = await request(calendarId, {
            method: 'REPORT',
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              Depth: '1',
            },
            body: buildReportBody(range),
          });
          assertSuccess(fallback, [207], calendarId);
          return parseEvents(await fallback.text(), calendarId);
        }

        assertSuccess(response, [207], calendarId);
        return parseSyncCollection(await response.text(), calendarId);
      }

      // Full calendar-query REPORT (initial sync or range-scoped sync)
      const response = await request(calendarId, {
        method: 'REPORT',
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          Depth: '1',
        },
        body: buildReportBody(range),
      });

      assertSuccess(response, [207], calendarId);
      return parseEvents(await response.text(), calendarId);
    },

    // ── Writes ────────────────────────────────────────────────────────────────

    async createEvent({
      calendarId,
      event,
    }: {
      calendarId: string;
      event: Event;
    }): Promise<CalDAVWriteResult> {
      // Reuse existing UID (e.g. from a previously fetched remote event) or generate new.
      const existingUid = getCalDAVMeta(event)?.uid;
      const uid = existingUid ?? event.id ?? generateUid();
      const href = buildEventHref(calendarId, uid);

      // If event has no CalDAV meta, inject a temporary UID so the serializer uses it.
      const eventToSerialize = existingUid
        ? event
        : {
            ...event,
            meta: {
              ...event.meta,
              caldav: { uid, href, calendarId, isRecurring: false },
            },
          };

      const icalData = mapDayFlowEventToCalDAV(eventToSerialize);

      const response = await request(href, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          // If-None-Match: * prevents accidentally overwriting an existing resource
          'If-None-Match': '*',
        },
        body: icalData,
      });

      // 201 Created or 204 No Content are both valid PUT success responses
      assertSuccess(response, [200, 201, 204], href);

      const etag = response.headers.get('ETag') ?? undefined;
      const location = response.headers.get('Location') ?? href;
      return { href: location, etag };
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
      const meta = getCalDAVMeta(event);
      const eventToSerialize =
        meta?.uid === remote.uid
          ? event
          : {
              ...event,
              meta: {
                ...event.meta,
                caldav: {
                  uid: remote.uid,
                  href: remote.href,
                  etag: remote.etag,
                  calendarId: remote.calendarId ?? calendarId,
                  isRecurring: meta?.isRecurring ?? false,
                },
              },
            };
      const icalData = mapDayFlowEventToCalDAV(eventToSerialize);

      const headers: Record<string, string> = {
        'Content-Type': 'text/calendar; charset=utf-8',
      };
      // Conditional PUT: only update if remote etag still matches (no concurrent edit)
      if (remote.etag) {
        headers['If-Match'] = remote.etag;
      }

      const response = await request(remote.href, {
        method: 'PUT',
        headers,
        body: icalData,
      });

      assertSuccess(response, [200, 201, 204], remote.href);

      // Return updated etag from response, falling back to the old one if server
      // doesn't echo it (some servers only send ETag on 201, not 204)
      const etag = response.headers.get('ETag') ?? remote.etag;
      return { href: remote.href, etag };
    },

    async deleteEvent({
      remote,
    }: {
      calendarId: string;
      remote: CalDAVRemoteRef;
    }): Promise<void> {
      const headers: Record<string, string> = {};
      if (remote.etag) {
        headers['If-Match'] = remote.etag;
      }

      const response = await request(remote.href, {
        method: 'DELETE',
        headers,
      });

      // 404 is treated as success — event is already gone
      if (response.status === 404) return;
      assertSuccess(response, [200, 204], remote.href);
    },
  };
}
