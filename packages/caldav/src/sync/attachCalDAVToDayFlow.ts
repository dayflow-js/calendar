import { getCalDAVMeta } from '@caldav/mapper/meta';
import { mapCalDAVEventToDayFlow } from '@caldav/mapper/toEvent';
import type { CalDAVCalendar } from '@caldav/types/calendar';
import type { CalDAVRemoteRef } from '@caldav/types/event';
import type { EventChange, ICalendarApp } from '@dayflow/core';

import { mapCalDAVCalendarToDayFlow } from './mapCalendar';
import type {
  CalDAVDayFlowController,
  CalDAVDayFlowOptions,
  CalDAVErrorContext,
  CalDAVSync,
  CalDAVSyncStatus,
} from './types';

/**
 * Attach a CalDAV sync engine to a DayFlow CalendarApp.
 *
 * The binding:
 * - Discovers remote calendars and registers them in DayFlow
 * - Syncs events on startup and on each visible-range change
 * - Observes local DayFlow event mutations and writes eligible ones back to CalDAV
 * - Applies remote changes with `source: 'remote'` to prevent write-back loops
 *
 * Accepted by `ICalendarApp`, so it works with any DayFlow framework adapter.
 */
function resolveEvent(change: EventChange) {
  return change.type === 'update' ? change.after : change.event; // create or delete
}

export function attachCalDAVToDayFlow(
  app: ICalendarApp,
  sync: CalDAVSync,
  options: CalDAVDayFlowOptions = {}
): CalDAVDayFlowController {
  const {
    writable = true,
    refreshOnVisibleRangeChange = true,
    eventMode = { recurring: 'read-only' },
    onError,
  } = options;

  let status: CalDAVSyncStatus = { state: 'idle' };
  const unsubscribers: Array<() => void> = [];
  const knownCalendarIds = new Set<string>();
  const remoteCalendars = new Map<string, CalDAVCalendar>();
  let currentRange: { start: Date; end: Date } | undefined;
  let started = false;

  // ─── Status helpers ─────────────────────────────────────────────────────────

  function setSyncing(): void {
    status = { ...status, state: 'syncing' };
  }

  function setIdle(): void {
    status = { state: 'idle', lastSyncedAt: new Date() };
  }

  function setError(error: unknown, context: CalDAVErrorContext): void {
    status = { ...status, state: 'error', error };
    onError?.(error, context);
  }

  // ─── Calendar registration ───────────────────────────────────────────────────

  async function loadCalendars(): Promise<void> {
    const remote = await sync.listCalendars();
    const existingIds = new Set(app.getCalendars().map(c => c.id));
    const nextCalendarIds = new Set<string>();
    const nextCalendars = new Map<string, CalDAVCalendar>();

    for (const cal of remote) {
      const dayflowCal = mapCalDAVCalendarToDayFlow(cal);
      if (existingIds.has(cal.id)) {
        app.updateCalendar(cal.id, dayflowCal);
      } else {
        await app.createCalendar(dayflowCal);
      }
      nextCalendarIds.add(cal.id);
      nextCalendars.set(cal.id, cal);
    }

    knownCalendarIds.clear();
    nextCalendarIds.forEach(id => knownCalendarIds.add(id));
    remoteCalendars.clear();
    nextCalendars.forEach((cal, id) => remoteCalendars.set(id, cal));
  }

  // ─── Event sync ──────────────────────────────────────────────────────────────

  async function syncRange(
    range: { start: Date; end: Date } | undefined,
    _context: Pick<CalDAVErrorContext, 'operation'>
  ): Promise<void> {
    const existingById = new Map(app.getAllEvents().map(e => [e.id, e]));

    for (const calendarId of knownCalendarIds) {
      const result = await sync.syncEvents({ calendarId, range });

      const adds = [];
      const updates = [];

      for (const data of result.events) {
        const event = mapCalDAVEventToDayFlow(data);
        if (!event) continue;

        if (existingById.has(event.id)) {
          updates.push({ id: event.id, updates: event });
        } else {
          adds.push(event);
        }
      }

      // Apply with source='remote' so the event-change listener skips write-back
      if (adds.length > 0 || updates.length > 0) {
        app.applyEventsChanges({ add: adds, update: updates }, false, 'remote');
      }

      // Handle server-reported deletions (populated by sync-collection REPORT in Phase 8)
      for (const del of result.deleted) {
        const existing = app.getAllEvents().find(e => {
          const meta = getCalDAVMeta(e);
          return meta?.href === del.href;
        });
        if (existing) {
          app.applyEventsChanges({ delete: [existing.id] }, false, 'remote');
        }
      }
    }
  }

  // ─── Write-back eligibility ──────────────────────────────────────────────────

  function isCalendarWritable(
    calendarId: string | undefined,
    operation: EventChange['type']
  ): boolean {
    if (!writable || !calendarId) return false;
    if (!knownCalendarIds.has(calendarId)) return false;
    const dayflowCalendar = app.getCalendars().find(c => c.id === calendarId);
    if (!dayflowCalendar || dayflowCalendar.readOnly) return false;

    const remoteCalendar = remoteCalendars.get(calendarId);
    if (remoteCalendar?.readOnly) return false;

    const permissions = remoteCalendar?.permissions;
    if (!permissions) {
      return remoteCalendar?.readOnly === false;
    }

    if (operation === 'create') return permissions.canCreate === true;
    if (operation === 'update') return permissions.canUpdate === true;
    return permissions.canDelete === true;
  }

  function shouldWriteBack(change: EventChange): boolean {
    if (change.source === 'remote') return false;

    const event = resolveEvent(change);

    if (!isCalendarWritable(event.calendarId, change.type)) return false;

    const meta = getCalDAVMeta(event);
    const recurringMode = eventMode.recurring ?? 'read-only';

    // Block recurring events in MVP
    if (meta?.isRecurring && recurringMode === 'read-only') return false;

    // update/delete require an existing remote ref
    if ((change.type === 'update' || change.type === 'delete') && !meta?.href) {
      return false;
    }

    return true;
  }

  // ─── Listeners ───────────────────────────────────────────────────────────────

  function setupEventChangeListener(): void {
    const unsub = app.subscribeEventChanges(async (changes: EventChange[]) => {
      for (const change of changes) {
        if (!shouldWriteBack(change)) continue;

        const event = resolveEvent(change);
        const calendarId = event.calendarId!;
        const meta = getCalDAVMeta(event);

        try {
          if (change.type === 'create') {
            const uid = meta?.uid ?? event.id;
            const eventToCreate = meta
              ? event
              : {
                  ...event,
                  meta: {
                    ...event.meta,
                    caldav: {
                      uid,
                      href: '',
                      calendarId,
                      isRecurring: false,
                    },
                  },
                };
            const result = await sync.createEvent({
              calendarId,
              event: eventToCreate,
            });
            app.applyEventsChanges(
              {
                update: [
                  {
                    id: event.id,
                    updates: {
                      meta: {
                        ...event.meta,
                        caldav: {
                          uid,
                          href: result.href,
                          etag: result.etag,
                          calendarId,
                          isRecurring: false,
                        },
                      },
                    },
                  },
                ],
              },
              false,
              'remote'
            );
          } else if (change.type === 'update') {
            const remote: CalDAVRemoteRef = {
              calendarId: meta!.calendarId,
              uid: meta!.uid,
              href: meta!.href,
              etag: meta!.etag,
            };
            const result = await sync.updateEvent({
              calendarId,
              event,
              remote,
            });
            app.applyEventsChanges(
              {
                update: [
                  {
                    id: event.id,
                    updates: {
                      meta: {
                        ...event.meta,
                        caldav: {
                          ...meta!,
                          href: result.href,
                          etag: result.etag,
                        },
                      },
                    },
                  },
                ],
              },
              false,
              'remote'
            );
          } else if (change.type === 'delete') {
            const remote: CalDAVRemoteRef = {
              calendarId: meta!.calendarId,
              uid: meta!.uid,
              href: meta!.href,
              etag: meta!.etag,
            };
            await sync.deleteEvent({ calendarId, remote });
          }
        } catch (err) {
          setError(err, {
            operation: change.type,
            calendarId,
            eventId: event.id,
          });
        }
      }
    });
    unsubscribers.push(unsub);
  }

  function setupRangeChangeListener(): void {
    if (!refreshOnVisibleRangeChange) return;

    const unsub = app.subscribeVisibleRangeChange(async payload => {
      currentRange = { start: payload.start, end: payload.end };
      setSyncing();
      try {
        await syncRange(currentRange, { operation: 'range-sync' });
        setIdle();
      } catch (err) {
        setError(err, { operation: 'range-sync' });
      }
    });
    unsubscribers.push(unsub);
  }

  // ─── Controller ──────────────────────────────────────────────────────────────

  return {
    async start(): Promise<void> {
      if (started) return;
      setSyncing();
      try {
        await loadCalendars();
        await syncRange(currentRange, { operation: 'initial-sync' });
        setIdle();
        setupRangeChangeListener();
        setupEventChangeListener();
        started = true;
      } catch (err) {
        setError(err, { operation: 'initial-sync' });
      }
    },

    stop(): void {
      unsubscribers.forEach(fn => fn());
      unsubscribers.length = 0;
      started = false;
    },

    async refresh({
      calendarId,
      range,
    }: {
      calendarId?: string;
      range?: { start: Date; end: Date };
    } = {}): Promise<void> {
      setSyncing();
      const effectiveRange = range ?? currentRange;
      try {
        if (calendarId) {
          // Targeted refresh: one calendar only
          const existingById = new Map(app.getAllEvents().map(e => [e.id, e]));
          const result = await sync.syncEvents({
            calendarId,
            range: effectiveRange,
          });
          const adds = [];
          const updates = [];
          for (const data of result.events) {
            const event = mapCalDAVEventToDayFlow(data);
            if (!event) continue;
            if (existingById.has(event.id)) {
              updates.push({ id: event.id, updates: event });
            } else {
              adds.push(event);
            }
          }
          if (adds.length > 0 || updates.length > 0) {
            app.applyEventsChanges(
              { add: adds, update: updates },
              false,
              'remote'
            );
          }
          for (const del of result.deleted) {
            const existing = app.getAllEvents().find(e => {
              const meta = getCalDAVMeta(e);
              return meta?.href === del.href;
            });
            if (existing) {
              app.applyEventsChanges(
                { delete: [existing.id] },
                false,
                'remote'
              );
            }
          }
        } else {
          await loadCalendars();
          await syncRange(effectiveRange, { operation: 'range-sync' });
        }
        setIdle();
      } catch (err) {
        setError(err, { operation: 'range-sync', calendarId });
      }
    },

    getStatus(): CalDAVSyncStatus {
      return { ...status };
    },
  };
}
