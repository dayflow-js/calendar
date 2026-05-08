import type { GoogleSyncAdapter } from '@google-sync/types/adapter';
import type {
  GoogleCalendarEvent,
  GoogleCalendarList,
  GoogleEventInput,
  GoogleEventList,
  GoogleListEventsOptions,
} from '@google-sync/types/api';

export type GoogleSyncAdapterOptions = {
  /**
   * Base URL for the Google Calendar API.
   * Defaults to 'https://www.googleapis.com/calendar/v3'.
   * Override to point at a backend proxy.
   */
  baseUrl?: string;

  /**
   * Fetch implementation. Must inject Authorization header.
   * In browser apps, route through a backend proxy so credentials stay server-side.
   */
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
};

const DEFAULT_BASE = 'https://www.googleapis.com/calendar/v3';

export class GoogleSyncError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, body: string) {
    super(`Google Calendar API error ${statusCode}: ${body.slice(0, 200)}`);
    this.name = 'GoogleSyncError';
    this.statusCode = statusCode;
  }
}

/**
 * Default HTTP adapter for the Google Calendar REST API v3.
 *
 * Authentication is fully external — supply an authenticated `fetch` function:
 *
 * ```ts
 * const adapter = createGoogleSyncAdapter({
 *   fetch: (url, init) =>
 *     fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } }),
 * });
 * ```
 *
 * For browser apps, use a backend proxy to keep tokens off the client:
 *
 * ```ts
 * const adapter = createGoogleSyncAdapter({
 *   baseUrl: '/api/google-calendar',
 *   fetch: globalThis.fetch,
 * });
 * ```
 */
export function createGoogleSyncAdapter(
  options: GoogleSyncAdapterOptions = {}
): GoogleSyncAdapter {
  const base = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
  const fetcher: (url: string, init?: RequestInit) => Promise<Response> =
    options.fetch ?? ((url, init) => globalThis.fetch(url, init));

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (response.status === 204 || response.status === 304) {
      return undefined as unknown as T;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new GoogleSyncError(response.status, body);
    }

    return response.json() as Promise<T>;
  }

  async function listAllPages<
    T extends {
      items: unknown[];
      nextPageToken?: string;
      nextSyncToken?: string;
    },
  >(buildUrl: (pageToken?: string) => string, init?: RequestInit): Promise<T> {
    let result: T | undefined;
    let pageToken: string | undefined;

    do {
      const page = await request<T>(buildUrl(pageToken), init);
      if (result) {
        result = {
          ...page,
          items: [...result.items, ...page.items],
          nextSyncToken: page.nextSyncToken,
        } as T;
      } else {
        result = page;
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    return result!;
  }

  return {
    listCalendars(): Promise<GoogleCalendarList> {
      return listAllPages<GoogleCalendarList>(
        pt =>
          `${base}/users/me/calendarList${pt ? `?pageToken=${encodeURIComponent(pt)}` : ''}`
      );
    },

    listEvents(
      calendarId: string,
      opts: GoogleListEventsOptions
    ): Promise<GoogleEventList> {
      const params = new URLSearchParams();
      if (opts.timeMin) params.set('timeMin', opts.timeMin);
      if (opts.timeMax) params.set('timeMax', opts.timeMax);
      if (opts.syncToken) params.set('syncToken', opts.syncToken);
      if (opts.singleEvents !== undefined)
        params.set('singleEvents', String(opts.singleEvents));
      if (opts.showDeleted !== undefined)
        params.set('showDeleted', String(opts.showDeleted));

      return listAllPages<GoogleEventList>(pt => {
        const p = new URLSearchParams(params);
        if (pt) p.set('pageToken', pt);
        return `${base}/calendars/${encodeURIComponent(calendarId)}/events?${p}`;
      });
    },

    getEvent(
      calendarId: string,
      eventId: string
    ): Promise<GoogleCalendarEvent> {
      return request<GoogleCalendarEvent>(
        `${base}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
      );
    },

    createEvent(
      calendarId: string,
      event: GoogleEventInput
    ): Promise<GoogleCalendarEvent> {
      return request<GoogleCalendarEvent>(
        `${base}/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: 'POST', body: JSON.stringify(event) }
      );
    },

    updateEvent(
      calendarId: string,
      eventId: string,
      event: GoogleEventInput,
      etag: string
    ): Promise<GoogleCalendarEvent> {
      return request<GoogleCalendarEvent>(
        `${base}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'PUT',
          headers: { 'If-Match': etag },
          body: JSON.stringify(event),
        }
      );
    },

    async deleteEvent(
      calendarId: string,
      eventId: string,
      etag?: string
    ): Promise<void> {
      try {
        await request<unknown>(
          `${base}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          {
            method: 'DELETE',
            headers: etag ? { 'If-Match': etag } : {},
          }
        );
      } catch (err) {
        // 404 = already deleted — treat as success
        if (err instanceof GoogleSyncError && err.statusCode === 404) return;
        throw err;
      }
    },
  };
}
