import type {
  CalendarType,
  Event,
  EventChange,
  ICalendarApp,
  VisibleRangePayload,
} from '@dayflow/core';
import { attachGoogleSyncToDayFlow } from '@google-sync/sync/attachGoogleSyncToDayFlow';
import type { GoogleSync } from '@google-sync/sync/createGoogleSync';
import { Temporal } from 'temporal-polyfill';

// ─── Minimal mock ICalendarApp ────────────────────────────────────────────────

function makeMockApp(overrides: Partial<ICalendarApp> = {}): ICalendarApp {
  const events: Event[] = [];
  const calendars: CalendarType[] = [];
  const rangeListeners: Array<(p: VisibleRangePayload) => void> = [];
  const changeListeners: Array<(c: EventChange[]) => void> = [];

  return {
    getCalendars: jest.fn(() => [...calendars]),
    createCalendar: jest.fn((cal: CalendarType) => {
      calendars.push(cal);
      return Promise.resolve();
    }),
    updateCalendar: jest.fn(),
    getAllEvents: jest.fn(() => [...events]),
    applyEventsChanges: jest.fn(
      (batch: {
        add?: Event[];
        update?: Array<{ id: string; updates: Partial<Event> }>;
        delete?: string[];
      }) => {
        if (batch.add) events.push(...batch.add);
        if (batch.update) {
          for (const { id, updates } of batch.update) {
            const idx = events.findIndex(e => e.id === id);
            if (idx !== -1) {
              events[idx] = { ...events[idx], ...updates };
            }
          }
        }
        if (batch.delete) {
          for (const id of batch.delete) {
            const idx = events.findIndex(e => e.id === id);
            if (idx !== -1) events.splice(idx, 1);
          }
        }
      }
    ),
    subscribeVisibleRangeChange: jest.fn(
      (fn: (p: VisibleRangePayload) => void) => {
        rangeListeners.push(fn);
        return () => {
          const i = rangeListeners.indexOf(fn);
          if (i !== -1) rangeListeners.splice(i, 1);
        };
      }
    ),
    subscribeEventChanges: jest.fn((fn: (c: EventChange[]) => void) => {
      changeListeners.push(fn);
      return () => {
        const i = changeListeners.indexOf(fn);
        if (i !== -1) changeListeners.splice(i, 1);
      };
    }),
    // test helpers
    _emit: (changes: EventChange[]) =>
      changeListeners.forEach(fn => fn(changes)),
    _emitRange: (payload: VisibleRangePayload) =>
      rangeListeners.forEach(fn => fn(payload)),
    ...overrides,
  } as unknown as ICalendarApp & {
    _emit: (c: EventChange[]) => void;
    _emitRange: (p: VisibleRangePayload) => void;
  };
}

function makeSync(overrides: Partial<GoogleSync> = {}): GoogleSync {
  return {
    listCalendars: jest.fn(() =>
      Promise.resolve([
        {
          id: 'cal-1',
          name: 'Work',
          source: 'Google',
          readOnly: false,
          colors: {
            eventColor: '#4285F4',
            eventSelectedColor: '#4285F4',
            lineColor: '#4285F4',
            textColor: '#fff',
            containerColor: '#4285F41A',
          },
        },
      ])
    ),
    syncEvents: jest.fn(() =>
      Promise.resolve({ events: [], deleted: [], syncToken: 'tok-1' })
    ),
    createEvent: jest.fn((_calId: string, event: Event) =>
      Promise.resolve({
        ...event,
        meta: {
          google: {
            eventId: event.id,
            calendarId: 'cal-1',
            etag: '"new"',
            isRecurring: false,
          },
        },
      })
    ),
    updateEvent: jest.fn((event: Event) =>
      Promise.resolve({
        ...event,
        meta: {
          google: {
            eventId: event.id,
            calendarId: 'cal-1',
            etag: '"updated"',
            isRecurring: false,
          },
        },
      })
    ),
    deleteEvent: jest.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'ev-1',
    title: 'Meeting',
    start: Temporal.ZonedDateTime.from(
      '2025-06-10T10:00:00-05:00[America/Chicago]'
    ),
    end: Temporal.ZonedDateTime.from(
      '2025-06-10T11:00:00-05:00[America/Chicago]'
    ),
    allDay: false,
    calendarId: 'cal-1',
    meta: {
      google: {
        eventId: 'ev-1',
        calendarId: 'cal-1',
        etag: '"etag1"',
        isRecurring: false,
      },
    },
    ...overrides,
  };
}

// ─── start() ─────────────────────────────────────────────────────────────────

describe('attachGoogleSyncToDayFlow – start', () => {
  it('loads calendars and syncs events on start', async () => {
    const app = makeMockApp();
    const syncEngine = makeSync({
      syncEvents: jest.fn(() =>
        Promise.resolve({
          events: [makeEvent()],
          deleted: [],
          syncToken: 'tok-1',
        })
      ),
    });

    const controller = attachGoogleSyncToDayFlow(app, syncEngine);
    await controller.start();

    expect(syncEngine.listCalendars).toHaveBeenCalledTimes(1);
    expect(syncEngine.syncEvents).toHaveBeenCalledTimes(1);
    expect(app.createCalendar).toHaveBeenCalledTimes(1);
    expect(app.applyEventsChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        add: expect.arrayContaining([expect.objectContaining({ id: 'ev-1' })]),
      }),
      false,
      'remote'
    );
  });

  it('starts as idle after successful start', async () => {
    const controller = attachGoogleSyncToDayFlow(makeMockApp(), makeSync());
    await controller.start();
    expect(controller.getStatus().state).toBe('idle');
  });

  it('sets state to error if start fails', async () => {
    const sync = makeSync({
      listCalendars: jest.fn(() => Promise.reject(new Error('Network error'))),
    });
    const controller = attachGoogleSyncToDayFlow(makeMockApp(), sync);
    await controller.start();
    expect(controller.getStatus().state).toBe('error');
    expect(controller.getStatus().error?.message).toContain('Network error');
  });

  it('calling start() twice is idempotent', async () => {
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(makeMockApp(), sync);
    await controller.start();
    await controller.start();
    expect(sync.listCalendars).toHaveBeenCalledTimes(1);
  });
});

// ─── stop() ──────────────────────────────────────────────────────────────────

describe('attachGoogleSyncToDayFlow – stop', () => {
  it('unsubscribes all listeners on stop', async () => {
    const app = makeMockApp();
    const controller = attachGoogleSyncToDayFlow(app, makeSync());
    await controller.start();
    controller.stop();

    // After stop, listeners should be gone — no more syncs triggered
    const typedApp = app as unknown as {
      _emitRange: (p: VisibleRangePayload) => void;
    };
    typedApp._emitRange({
      start: new Date('2025-06-01'),
      end: new Date('2025-06-30'),
      reason: 'navigation',
      view: 'month',
    });

    // syncEvents was called once on start; should NOT be called again after stop
    const sync = makeSync();
    expect(sync.syncEvents).toHaveBeenCalledTimes(0);
  });
});

// ─── Visible range change ─────────────────────────────────────────────────────

describe('attachGoogleSyncToDayFlow – visible range change', () => {
  it('calls syncEvents when visible range changes', async () => {
    const app = makeMockApp();
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const typedApp = app as unknown as {
      _emitRange: (p: VisibleRangePayload) => void;
    };
    typedApp._emitRange({
      start: new Date('2025-06-01'),
      end: new Date('2025-06-30'),
      reason: 'navigation',
      view: 'month',
    });

    // Give async work time to complete
    await new Promise(r => {
      setTimeout(r, 10);
    });
    expect(sync.syncEvents).toHaveBeenCalledTimes(2); // initial + range change
  });

  it('updates local-created events by google meta id instead of duplicating them', async () => {
    const localEvent = makeEvent({
      id: 'local-temp',
      meta: {
        google: {
          eventId: 'google-server-id',
          calendarId: 'cal-1',
          etag: '"etag1"',
          isRecurring: false,
        },
      },
    });
    const remoteEvent = makeEvent({
      id: 'google-server-id',
      title: 'Remote server copy',
      meta: {
        google: {
          eventId: 'google-server-id',
          calendarId: 'cal-1',
          etag: '"etag2"',
          isRecurring: false,
        },
      },
    });
    const app = makeMockApp();
    const sync = makeSync({
      syncEvents: jest
        .fn()
        .mockResolvedValueOnce({
          events: [localEvent],
          deleted: [],
          syncToken: 'tok-1',
        })
        .mockResolvedValueOnce({
          events: [remoteEvent],
          deleted: [],
          syncToken: 'tok-2',
        }),
    });
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const typedApp = app as unknown as {
      _emitRange: (p: VisibleRangePayload) => void;
    };
    typedApp._emitRange({
      start: new Date('2025-06-01'),
      end: new Date('2025-06-30'),
      reason: 'navigation',
      view: 'month',
    });
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(app.getAllEvents()).toHaveLength(1);
    expect(app.getAllEvents()[0].title).toBe('Remote server copy');
  });

  it('deletes local-created events by google meta id', async () => {
    const localEvent = makeEvent({
      id: 'local-temp',
      meta: {
        google: {
          eventId: 'google-server-id',
          calendarId: 'cal-1',
          etag: '"etag1"',
          isRecurring: false,
        },
      },
    });
    const app = makeMockApp();
    const sync = makeSync({
      syncEvents: jest
        .fn()
        .mockResolvedValueOnce({
          events: [localEvent],
          deleted: [],
          syncToken: 'tok-1',
        })
        .mockResolvedValueOnce({
          events: [],
          deleted: ['google-server-id'],
          syncToken: 'tok-2',
        }),
    });
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const typedApp = app as unknown as {
      _emitRange: (p: VisibleRangePayload) => void;
    };
    typedApp._emitRange({
      start: new Date('2025-06-01'),
      end: new Date('2025-06-30'),
      reason: 'navigation',
      view: 'month',
    });
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(app.getAllEvents()).toHaveLength(0);
  });
});

// ─── Write-back eligibility ───────────────────────────────────────────────────

describe('attachGoogleSyncToDayFlow – write-back', () => {
  it('creates event on Google when local event is created', async () => {
    const app = makeMockApp();
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    const newEvent = makeEvent({ id: 'ev-new', meta: { google: undefined } });
    typedApp._emit([{ type: 'create', event: newEvent, source: 'local' }]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(sync.createEvent).toHaveBeenCalledTimes(1);
  });

  it('updates event on Google when local event is updated', async () => {
    const app = makeMockApp();
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    typedApp._emit([
      {
        type: 'update',
        before: makeEvent(),
        after: makeEvent({ title: 'Updated meeting' }),
        source: 'local',
      },
    ]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(sync.updateEvent).toHaveBeenCalledTimes(1);
  });

  it('deletes event on Google when local event is deleted', async () => {
    const app = makeMockApp();
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    typedApp._emit([{ type: 'delete', event: makeEvent(), source: 'local' }]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(sync.deleteEvent).toHaveBeenCalledTimes(1);
  });

  it('does NOT write back remote-sourced changes (no sync loop)', async () => {
    const app = makeMockApp();
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    typedApp._emit([
      {
        type: 'update',
        before: makeEvent(),
        after: makeEvent({ title: 'Remote update' }),
        source: 'remote',
      },
    ]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(sync.updateEvent).not.toHaveBeenCalled();
  });

  it('does NOT write back when writable=false', async () => {
    const app = makeMockApp();
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync, {
      writable: false,
    });
    await controller.start();

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    typedApp._emit([
      { type: 'create', event: makeEvent({ id: 'local' }), source: 'local' },
    ]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(sync.createEvent).not.toHaveBeenCalled();
  });

  it('does NOT write back recurring events', async () => {
    const app = makeMockApp();
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const recurringEvent = makeEvent({
      meta: {
        google: {
          eventId: 'ev-1',
          calendarId: 'cal-1',
          etag: '"etag1"',
          isRecurring: true,
        },
      },
    });

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    typedApp._emit([
      {
        type: 'update',
        before: recurringEvent,
        after: recurringEvent,
        source: 'local',
      },
    ]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(sync.updateEvent).not.toHaveBeenCalled();
  });

  it('does NOT write back events from unknown calendars', async () => {
    const app = makeMockApp();
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const foreignEvent = makeEvent({ calendarId: 'foreign-cal' });

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    typedApp._emit([{ type: 'delete', event: foreignEvent, source: 'local' }]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(sync.deleteEvent).not.toHaveBeenCalled();
  });

  it('does NOT write back to readOnly calendars', async () => {
    const app = makeMockApp({
      getCalendars: jest.fn(() => [
        {
          id: 'cal-1',
          name: 'Work',
          source: 'Google',
          readOnly: true,
          colors: {
            eventColor: '#4285F4',
            eventSelectedColor: '#4285F4',
            lineColor: '#4285F4',
            textColor: '#fff',
            containerColor: '#4285F41A',
          },
        },
      ]),
    });
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(app, sync);
    await controller.start();

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    typedApp._emit([{ type: 'delete', event: makeEvent(), source: 'local' }]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(sync.deleteEvent).not.toHaveBeenCalled();
  });

  it('calls onWriteError when write-back fails', async () => {
    const onWriteError = jest.fn();
    const sync = makeSync({
      updateEvent: jest.fn(() => Promise.reject(new Error('Conflict'))),
    });
    const app = makeMockApp();
    const controller = attachGoogleSyncToDayFlow(app, sync, { onWriteError });
    await controller.start();

    const typedApp = app as unknown as { _emit: (c: EventChange[]) => void };
    typedApp._emit([
      {
        type: 'update',
        before: makeEvent(),
        after: makeEvent({ title: 'X' }),
        source: 'local',
      },
    ]);
    await new Promise(r => {
      setTimeout(r, 10);
    });

    expect(onWriteError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Conflict' }),
      expect.objectContaining({ action: 'update' })
    );
  });
});

// ─── getStatus ────────────────────────────────────────────────────────────────

describe('attachGoogleSyncToDayFlow – getStatus', () => {
  it('reports lastSyncedAt after a successful start', async () => {
    const controller = attachGoogleSyncToDayFlow(makeMockApp(), makeSync());
    await controller.start();
    expect(controller.getStatus().lastSyncedAt).toBeDefined();
  });

  it('onStatusChange is called on transitions', async () => {
    const onStatusChange = jest.fn();
    const controller = attachGoogleSyncToDayFlow(makeMockApp(), makeSync(), {
      onStatusChange,
    });
    await controller.start();
    // syncing → idle
    const calls = onStatusChange.mock.calls.map(
      (c: [{ state: string }]) => c[0].state
    );
    expect(calls).toContain('syncing');
    expect(calls).toContain('idle');
  });
});

// ─── refresh ─────────────────────────────────────────────────────────────────

describe('attachGoogleSyncToDayFlow – refresh', () => {
  it('re-syncs all calendars when no calendarId given', async () => {
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(makeMockApp(), sync);
    await controller.start();
    await controller.refresh();
    // listCalendars: called on start + refresh
    expect(sync.listCalendars).toHaveBeenCalledTimes(2);
  });

  it('syncs only the specified calendar on targeted refresh', async () => {
    const sync = makeSync();
    const controller = attachGoogleSyncToDayFlow(makeMockApp(), sync);
    await controller.start();
    await controller.refresh({ calendarId: 'cal-1' });
    // listCalendars should only be called on start, not for targeted refresh
    expect(sync.listCalendars).toHaveBeenCalledTimes(1);
    // syncEvents: once on start, once for refresh
    expect(sync.syncEvents).toHaveBeenCalledTimes(2);
  });
});
