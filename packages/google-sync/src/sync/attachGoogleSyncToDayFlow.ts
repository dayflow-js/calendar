import type { Event, EventChange, ICalendarApp } from '@dayflow/core';
import type {
  GoogleDayFlowOptions,
  GoogleSyncStatus,
} from '@google-sync/types/adapter';
import { getGoogleMeta } from '@google-sync/types/meta';

import type { GoogleSync } from './createGoogleSync';

export type GoogleDayFlowController = {
  /** Load calendars, sync initial events, and start listening for changes. */
  start(): Promise<void>;
  /** Unsubscribe all listeners. */
  stop(): void;
  /** Re-sync a specific calendar or all calendars, optionally for a range. */
  refresh(options?: {
    calendarId?: string;
    range?: { start: Date; end: Date };
  }): Promise<void>;
  /** Current sync status. */
  getStatus(): GoogleSyncStatus;
};

/**
 * Attach a Google Calendar sync engine to a DayFlow CalendarApp.
 *
 * The binding:
 * - Discovers remote calendars and registers them in DayFlow
 * - Syncs events on startup and on each visible-range change
 * - Observes local event mutations and writes eligible ones back to Google Calendar
 * - Applies remote changes with `source: 'remote'` to prevent write-back loops
 */
const toTimeString = (d: Date) => d.toISOString();

export function attachGoogleSyncToDayFlow(
  app: ICalendarApp,
  sync: GoogleSync,
  options: GoogleDayFlowOptions = {}
): GoogleDayFlowController {
  const { writable = true, onWriteError, onStatusChange } = options;

  let status: GoogleSyncStatus = { state: 'idle' };
  const unsubscribers: Array<() => void> = [];
  const knownCalendarIds = new Set<string>();
  const syncTokens = new Map<string, string>(); // calendarId → syncToken
  let currentRange: { start: Date; end: Date } | undefined;
  let started = false;

  // ─── Status helpers ──────────────────────────────────────────────────────────

  function setStatus(next: GoogleSyncStatus): void {
    status = next;
    onStatusChange?.(next);
  }

  function setSyncing(): void {
    setStatus({ ...status, state: 'syncing' });
  }

  function setIdle(): void {
    setStatus({ state: 'idle', lastSyncedAt: new Date().toISOString() });
  }

  function setError(message: string, calendarId?: string): void {
    setStatus({ ...status, state: 'error', error: { message, calendarId } });
  }

  // ─── Calendar registration ───────────────────────────────────────────────────

  async function loadCalendars(): Promise<void> {
    const calendars = await sync.listCalendars();
    const existingIds = new Set(app.getCalendars().map(c => c.id));
    const nextIds = new Set<string>();

    for (const cal of calendars) {
      if (existingIds.has(cal.id)) {
        app.updateCalendar(cal.id, cal);
      } else {
        await app.createCalendar(cal);
      }
      nextIds.add(cal.id);
    }

    knownCalendarIds.clear();
    nextIds.forEach(id => knownCalendarIds.add(id));
  }

  function buildGoogleEventIndex(): Map<string, Event> {
    const index = new Map<string, Event>();
    for (const event of app.getAllEvents()) {
      const meta = getGoogleMeta(event);
      if (meta) index.set(meta.eventId, event);
    }
    return index;
  }

  // ─── Event sync ──────────────────────────────────────────────────────────────

  async function syncRange(range?: { start: Date; end: Date }): Promise<void> {
    const existingById = new Map(app.getAllEvents().map(e => [e.id, e]));
    const existingByGoogleId = buildGoogleEventIndex();

    for (const calendarId of knownCalendarIds) {
      const result = await sync.syncEvents(
        calendarId,
        range
          ? { start: toTimeString(range.start), end: toTimeString(range.end) }
          : undefined
      );

      const adds = [];
      const updates = [];

      for (const event of result.events) {
        const googleEventId = getGoogleMeta(event)?.eventId;
        const existing =
          existingById.get(event.id) ??
          (googleEventId ? existingByGoogleId.get(googleEventId) : undefined);

        if (existing) {
          updates.push({ id: existing.id, updates: event });
        } else {
          adds.push(event);
        }
      }

      if (adds.length > 0 || updates.length > 0) {
        app.applyEventsChanges({ add: adds, update: updates }, false, 'remote');
      }

      for (const deletedId of result.deleted) {
        const existing =
          existingById.get(deletedId) ?? existingByGoogleId.get(deletedId);
        if (existing) {
          app.applyEventsChanges({ delete: [existing.id] }, false, 'remote');
        }
      }

      if (result.syncToken) {
        syncTokens.set(calendarId, result.syncToken);
      }
    }
  }

  async function incrementalSync(): Promise<void> {
    const existingById = new Map(app.getAllEvents().map(e => [e.id, e]));
    const existingByGoogleId = buildGoogleEventIndex();

    for (const calendarId of knownCalendarIds) {
      const token = syncTokens.get(calendarId);
      if (!token) continue;

      const result = await sync.syncEvents(calendarId, undefined, token);

      const adds = [];
      const updates = [];

      for (const event of result.events) {
        const googleEventId = getGoogleMeta(event)?.eventId;
        const existing =
          existingById.get(event.id) ??
          (googleEventId ? existingByGoogleId.get(googleEventId) : undefined);

        if (existing) {
          updates.push({ id: existing.id, updates: event });
        } else {
          adds.push(event);
        }
      }

      if (adds.length > 0 || updates.length > 0) {
        app.applyEventsChanges({ add: adds, update: updates }, false, 'remote');
      }

      for (const deletedId of result.deleted) {
        const existing =
          existingById.get(deletedId) ?? existingByGoogleId.get(deletedId);
        if (existing) {
          app.applyEventsChanges({ delete: [existing.id] }, false, 'remote');
        }
      }

      if (result.syncToken) {
        syncTokens.set(calendarId, result.syncToken);
      }
    }
  }

  // ─── Write-back eligibility ──────────────────────────────────────────────────

  function shouldWriteBack(change: EventChange): boolean {
    if (!writable) return false;
    if (change.source === 'remote') return false;

    const event = change.type === 'update' ? change.after : change.event;
    const calendarId = event.calendarId;
    if (!calendarId || !knownCalendarIds.has(calendarId)) return false;

    const calendar = app.getCalendars().find(c => c.id === calendarId);
    if (calendar?.readOnly) return false;

    const meta = getGoogleMeta(event);

    // Recurring events: read-only in MVP
    if (meta?.isRecurring) return false;

    // delete requires an existing google meta ref (nothing to delete on Google's side)
    if (change.type === 'delete' && !meta) return false;

    // update without meta = event was just assigned to this Google calendar → treat as create
    // (handled in the listener below)

    return true;
  }

  // ─── Listeners ───────────────────────────────────────────────────────────────

  function setupEventChangeListener(): void {
    const unsub = app.subscribeEventChanges(async (changes: EventChange[]) => {
      for (const change of changes) {
        if (!shouldWriteBack(change)) continue;

        const event = change.type === 'update' ? change.after : change.event;
        const calendarId = event.calendarId!;
        const meta = getGoogleMeta(event);

        try {
          if (change.type === 'create' || (change.type === 'update' && !meta)) {
            // create: new local event assigned to a Google calendar
            // update without meta: locally-created event whose calendarId was changed to Google
            const created = await sync.createEvent(calendarId, event);
            app.applyEventsChanges(
              { update: [{ id: event.id, updates: { meta: created.meta } }] },
              false,
              'remote'
            );
          } else if (change.type === 'update') {
            const updated = await sync.updateEvent(event);
            app.applyEventsChanges(
              { update: [{ id: event.id, updates: { meta: updated.meta } }] },
              false,
              'remote'
            );
          } else if (change.type === 'delete') {
            await sync.deleteEvent(event);
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const action = change.type as 'create' | 'update' | 'delete';
          if (onWriteError) {
            onWriteError(error, { action, eventId: meta?.eventId });
          } else {
            console.error(`[google-sync] ${action} failed:`, error.message);
          }
        }
      }
    });
    unsubscribers.push(unsub);
  }

  function setupRangeChangeListener(): void {
    const unsub = app.subscribeVisibleRangeChange(async payload => {
      currentRange = { start: payload.start, end: payload.end };
      setSyncing();
      try {
        await syncRange(currentRange);
        setIdle();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
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
        await syncRange(currentRange);
        setIdle();
        setupRangeChangeListener();
        setupEventChangeListener();
        started = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    },

    stop(): void {
      unsubscribers.forEach(fn => fn());
      unsubscribers.length = 0;
      started = false;
    },

    async refresh({ calendarId, range } = {}): Promise<void> {
      setSyncing();
      const effectiveRange = range ?? currentRange;
      try {
        if (calendarId) {
          const existingById = new Map(app.getAllEvents().map(e => [e.id, e]));
          const existingByGoogleId = buildGoogleEventIndex();
          const result = await sync.syncEvents(
            calendarId,
            effectiveRange
              ? {
                  start: toTimeString(effectiveRange.start),
                  end: toTimeString(effectiveRange.end),
                }
              : undefined
          );

          const adds = [];
          const updates = [];
          for (const event of result.events) {
            const googleEventId = getGoogleMeta(event)?.eventId;
            const existing =
              existingById.get(event.id) ??
              (googleEventId
                ? existingByGoogleId.get(googleEventId)
                : undefined);
            if (existing) {
              updates.push({ id: existing.id, updates: event });
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
          for (const deletedId of result.deleted) {
            const existing =
              existingById.get(deletedId) ?? existingByGoogleId.get(deletedId);
            if (existing) {
              app.applyEventsChanges(
                { delete: [existing.id] },
                false,
                'remote'
              );
            }
          }
          if (result.syncToken) syncTokens.set(calendarId, result.syncToken);
        } else {
          await loadCalendars();
          await syncRange(effectiveRange);
        }
        setIdle();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg, calendarId);
      }
    },

    getStatus(): GoogleSyncStatus {
      return { ...status };
    },

    // Exposed for testing — not part of public interface
    _incrementalSync: incrementalSync,
  } as GoogleDayFlowController & { _incrementalSync: () => Promise<void> };
}
