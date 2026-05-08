/**
 * Frontend CalDAV integration example using @dayflow/caldav.
 *
 * This file shows how to connect the DayFlow calendar to a CalDAV backend
 * through the proxy server defined in proxy.mjs.
 *
 * The proxy is the only place where credentials exist.
 * DayFlow CalDAV in the browser only sends CalDAV requests as JSON
 * to /api/caldav — it never sees usernames, passwords, or tokens.
 */

import {
  attachCalDAVToDayFlow,
  createCalDAVAdapter,
  createCalDAVSync,
} from '@dayflow/caldav';
import type { CalDAVDayFlowController } from '@dayflow/caldav';
import type { ICalendarApp } from '@dayflow/core';

import { createLocalStorage } from './storage';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * The CalDAV calendar home URL for the authenticated user.
 *
 * Nextcloud: /calendars/<username>/
 * Radicale:  /<username>/
 *
 * This path is forwarded by the proxy to:
 *   CALDAV_BASE_URL + calendarHomeUrl
 *
 * If CALDAV_BASE_URL is https://nextcloud.example.com/remote.php/dav,
 * this value should be /calendars/alice/ rather than
 * /remote.php/dav/calendars/alice/.
 */
const CALENDAR_HOME_URL = '/calendars/alice/';

// ─── Proxy fetch ─────────────────────────────────────────────────────────────

/**
 * Send CalDAV requests through the backend proxy.
 *
 * The proxy handles:
 * - Adding Authorization header
 * - Forwarding to the actual CalDAV server
 * - CORS headers for the browser
 *
 * The browser never sees credentials.
 */
function proxiedFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch('/api/caldav', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, init }),
  });
}

// ─── Sync setup ───────────────────────────────────────────────────────────────

/**
 * Start CalDAV sync and attach it to a DayFlow CalendarApp.
 *
 * Returns a controller to manage the sync lifecycle (stop/refresh/status).
 *
 * Usage in React:
 *
 *   const { app } = useCalendarApp(...);
 *   const controllerRef = useRef<CalDAVDayFlowController | null>(null);
 *
 *   useEffect(() => {
 *     const controller = startCalDAVSync(app);
 *     controller.start();
 *     controllerRef.current = controller;
 *     return () => controller.stop();
 *   }, [app]);
 */
export function startCalDAVSync(app: ICalendarApp): CalDAVDayFlowController {
  const adapter = createCalDAVAdapter({
    calendarHomeUrl: CALENDAR_HOME_URL,
    fetch: proxiedFetch,
  });

  const sync = createCalDAVSync({
    adapter,
    // localStorage persists sync state across page reloads.
    // Replace with createMemoryStorage() for development/testing.
    storage: createLocalStorage(),
  });

  const controller = attachCalDAVToDayFlow(app, sync, {
    writable: true,
    refreshOnVisibleRangeChange: true,
    eventMode: {
      // Recurring events are read-only in this release.
      // Editing a recurring event on the server requires RRULE manipulation
      // which @dayflow/caldav does not yet support.
      recurring: 'read-only',
    },
    onError(error, context) {
      console.error(`[caldav] ${context.operation} failed`, {
        calendarId: context.calendarId,
        eventId: context.eventId,
        error,
      });

      // Optionally notify the user via your app's toast/notification system:
      // notify.error(`Calendar sync failed: ${context.operation}`);
    },
  });

  return controller;
}

// ─── React hook (optional convenience wrapper) ────────────────────────────────

/**
 * React hook that starts CalDAV sync for the lifetime of the component.
 *
 * import { useEffect, useRef } from 'react';
 * import { useCalendarApp } from '@dayflow/react';
 * import { useCalDAVSync } from './client';
 *
 * function Calendar() {
 *   const { app, ...rest } = useCalendarApp({ views, plugins });
 *   useCalDAVSync(app);
 *   return <DayFlowCalendar {...rest} />;
 * }
 */
export function useCalDAVSync(_app: ICalendarApp): void {
  // This is a plain function body — copy it into a useEffect in your React component:
  //
  //   useEffect(() => {
  //     const controller = startCalDAVSync(app);
  //     controller.start();
  //     return () => controller.stop();
  //   }, [app]);
  //
  // The separate export exists so this file compiles without React as a dependency.
  return undefined;
}
