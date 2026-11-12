import type { OutlookSyncAdapter } from '@outlook-sync/types/adapter';
import type {
  OutlookCalendarList,
  OutlookEvent,
  OutlookEventInput,
  OutlookEventList,
  OutlookListEventsOptions,
} from '@outlook-sync/types/api';

/** Pause execution for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Parse a `Retry-After` header value (either seconds or HTTP date)
 * and return the number of milliseconds to wait.
 */
function parseRetryAfterMs(header: string): number {
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = new Date(header);
  const remaining = date.getTime() - Date.now();
  return Math.max(remaining, 0);
}

export type OutlookSyncAdapterOptions = {
  /**
   * Base URL for the Microsoft Graph API.
   * Defaults to 'https://graph.microsoft.com/v1.0'.
   * Override to point at a backend proxy.
   */
  baseUrl?: string;

  /**
   * Custom fetch implementation.
   * When `getToken` is also provided, `getToken` takes priority for Authorization.
   */
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;

  /**
   * Return the current OAuth access token. Called before every request, so
   * token refreshes are transparent — the adapter never needs to be recreated
   * when the token changes.
   *
   * ```ts
   * const adapter = createOutlookSyncAdapter({
   *   getToken: () => msalInstance.acquireTokenSilent(request).then(r => r.accessToken),
   * });
   * ```
   *
   * When set, the adapter injects `Authorization: Bearer <token>` automatically.
   * Provide either `getToken` or a pre-authenticated `fetch`, not both.
   */
  getToken?: () => string | Promise<string>;
};

const DEFAULT_BASE = 'https://graph.microsoft.com/v1.0';

export class OutlookSyncError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, body: string) {
    super(`Microsoft Graph API error ${statusCode}: ${body.slice(0, 200)}`);
    this.name = 'OutlookSyncError';
    this.statusCode = statusCode;
  }
}

/**
 * Default HTTP adapter for the Microsoft Graph Calendar API.
 *
 * Authentication is fully external. Supply either:
 * - `getToken`: called per-request, enables transparent token refresh
 * - `fetch`: pre-authenticated fetch function (e.g. from a backend proxy)
 *
 * For browser apps, route through a backend proxy so tokens stay server-side:
 * ```ts
 * const adapter = createOutlookSyncAdapter({
 *   baseUrl: '/api/outlook-calendar',
 * });
 * ```
 */
export function createOutlookSyncAdapter(
  options: OutlookSyncAdapterOptions = {}
): OutlookSyncAdapter {
  const base = (options.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
  const fetcher: (url: string, init?: RequestInit) => Promise<Response> =
    options.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const { getToken } = options;

  async function request<T>(
    url: string,
    init?: RequestInit,
    retries = 1
  ): Promise<T> {
    const authHeaders: Record<string, string> = {};
    if (getToken) {
      authHeaders['Authorization'] = `Bearer ${await getToken()}`;
    }

    const response = await fetcher(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...init?.headers,
      },
    });

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    // 429 Too Many Requests — honour Retry-After and retry once
    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get('Retry-After') ?? '10';
      await sleep(parseRetryAfterMs(retryAfter));
      return request<T>(url, init, retries - 1);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new OutlookSyncError(response.status, body);
    }

    return response.json() as Promise<T>;
  }

  /** Follow @odata.nextLink pagination and accumulate all pages. */
  async function listAllPages<
    T extends {
      value: unknown[];
      '@odata.nextLink'?: string;
      '@odata.deltaLink'?: string;
    },
  >(url: string, init?: RequestInit): Promise<T> {
    let result: T | undefined;
    let nextUrl: string | undefined = url;

    while (nextUrl) {
      const page: T = await request<T>(nextUrl, init);
      if (result) {
        result = {
          ...page,
          value: [...result.value, ...page.value],
          '@odata.deltaLink':
            page['@odata.deltaLink'] ?? result['@odata.deltaLink'],
        } as T;
      } else {
        result = page;
      }
      nextUrl = page['@odata.nextLink'];
    }

    return result!;
  }

  return {
    listCalendars(): Promise<OutlookCalendarList> {
      return listAllPages<OutlookCalendarList>(`${base}/me/calendars`);
    },

    listEvents(
      calendarId: string,
      opts: OutlookListEventsOptions
    ): Promise<OutlookEventList> {
      if (opts.deltaLink) {
        // Incremental sync: follow the stored delta link directly
        return listAllPages<OutlookEventList>(opts.deltaLink);
      }

      // Range query via calendarView (expands recurring events)
      const params = new URLSearchParams();
      if (opts.startDateTime) params.set('startDateTime', opts.startDateTime);
      if (opts.endDateTime) params.set('endDateTime', opts.endDateTime);
      // Request only the fields we use to minimize response size
      params.set(
        '$select',
        'id,subject,body,start,end,isAllDay,isCancelled,isOrganizer,type,seriesMasterId,changeKey,location,recurrence,isOnlineMeeting,onlineMeetingProvider,onlineMeeting,onlineMeetingUrl'
      );

      return listAllPages<OutlookEventList>(
        `${base}/me/calendars/${encodeURIComponent(calendarId)}/calendarView/delta?${params}`
      );
    },

    getEvent(calendarId: string, eventId: string): Promise<OutlookEvent> {
      return request<OutlookEvent>(
        `${base}/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
      );
    },

    createEvent(
      calendarId: string,
      event: OutlookEventInput
    ): Promise<OutlookEvent> {
      return request<OutlookEvent>(
        `${base}/me/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: 'POST', body: JSON.stringify(event) }
      );
    },

    updateEvent(
      calendarId: string,
      eventId: string,
      event: Partial<OutlookEventInput>,
      etag: string
    ): Promise<OutlookEvent> {
      return request<OutlookEvent>(
        `${base}/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'PATCH',
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
          `${base}/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          {
            method: 'DELETE',
            headers: etag ? { 'If-Match': etag } : {},
          }
        );
      } catch (err) {
        // 404 = already deleted — treat as success
        if (err instanceof OutlookSyncError && err.statusCode === 404) return;
        throw err;
      }
    },
  };
}
