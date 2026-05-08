import { CalDAVError } from '@caldav/adapter/errors';
import { getCalDAVMeta } from '@caldav/mapper/meta';
import { attachCalDAVToDayFlow } from '@caldav/sync/attachCalDAVToDayFlow';
import { createCalDAVSync } from '@caldav/sync/createCalDAVSync';
import { mapCalDAVCalendarToDayFlow } from '@caldav/sync/mapCalendar';
import type { CalDAVSync } from '@caldav/sync/types';
import type { CalDAVCalendar } from '@caldav/types/calendar';
import type { CalDAVEventData } from '@caldav/types/event';
import { CalendarApp } from '@dayflow/core';
import type { Event } from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CAL_ID = '/caldav/user/personal/';
const EVENT_HREF = `${CAL_ID}event1.ics`;

const REMOTE_CALENDAR: CalDAVCalendar = {
  id: CAL_ID,
  name: 'Personal',
  color: '#3b82f6',
  readOnly: false,
  permissions: { canCreate: true, canUpdate: true, canDelete: true },
};

const READ_ONLY_CALENDAR: CalDAVCalendar = {
  id: '/caldav/user/holidays/',
  name: 'Holidays',
  readOnly: true,
};

function makeRemoteEventData(
  overrides: Partial<CalDAVEventData> = {}
): CalDAVEventData {
  return {
    calendarId: CAL_ID,
    uid: 'event1@test',
    href: EVENT_HREF,
    etag: '"etag1"',
    icalData: [
      'BEGIN:VCALENDAR\r\nVERSION:2.0',
      'BEGIN:VEVENT',
      'UID:event1@test',
      'SUMMARY:Remote Event',
      'DTSTART:20250115T100000Z',
      'DTEND:20250115T110000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n'),
    ...overrides,
  };
}

function makeApp() {
  return new CalendarApp({ views: [], plugins: [], events: [], calendars: [] });
}

function makeMockSync(
  overrides: Partial<CalDAVSync> = {}
): jest.Mocked<CalDAVSync> {
  return {
    listCalendars: jest.fn().mockResolvedValue([REMOTE_CALENDAR]),
    syncEvents: jest.fn().mockResolvedValue({ events: [], deleted: [] }),
    createEvent: jest
      .fn()
      .mockResolvedValue({ href: `${CAL_ID}new.ics`, etag: '"new-etag"' }),
    updateEvent: jest
      .fn()
      .mockResolvedValue({ href: EVENT_HREF, etag: '"updated-etag"' }),
    deleteEvent: jest.fn(() => Promise.resolve()),
    ...overrides,
  } as jest.Mocked<CalDAVSync>;
}

/** Drain microtasks and one event-loop tick to allow async listeners to complete. */
async function flush() {
  await new Promise(resolve => {
    setImmediate(resolve);
  });
}

// ─── mapCalDAVCalendarToDayFlow ───────────────────────────────────────────────

describe('mapCalDAVCalendarToDayFlow', () => {
  it('maps name, source, and readOnly', () => {
    const cal = mapCalDAVCalendarToDayFlow(REMOTE_CALENDAR);
    expect(cal.name).toBe('Personal');
    expect(cal.source).toBe('CalDAV');
    expect(cal.readOnly).toBe(false);
    expect(cal.isVisible).toBe(true);
  });

  it('marks read-only when calendar.readOnly=true', () => {
    const cal = mapCalDAVCalendarToDayFlow(READ_ONLY_CALENDAR);
    expect(cal.readOnly).toBe(true);
  });

  it('derives colors from hex via getCalendarColorsForHex', () => {
    const cal = mapCalDAVCalendarToDayFlow(REMOTE_CALENDAR);
    expect(cal.colors).toBeDefined();
    expect(typeof cal.colors.eventColor).toBe('string');
    expect(cal.darkColors).toBeDefined();
  });

  it('falls back to default color when color is absent', () => {
    const cal = mapCalDAVCalendarToDayFlow({ id: 'x', name: 'X' });
    expect(cal.colors).toBeDefined();
  });
});

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getSyncToken: jest.fn((id: string) =>
      Promise.resolve(store.get(`st:${id}`) ?? null)
    ),
    setSyncToken: jest.fn((id: string, t: string) => {
      store.set(`st:${id}`, t);
      return Promise.resolve();
    }),
    getCtag: jest.fn(() => Promise.resolve(null)),
    setCtag: jest.fn(() => Promise.resolve()),
    getEtag: jest.fn((href: string) =>
      Promise.resolve(store.get(`et:${href}`) ?? null)
    ),
    setEtag: jest.fn((href: string, etag: string) => {
      store.set(`et:${href}`, etag);
      return Promise.resolve();
    }),
    deleteEtag: jest.fn((href: string) => {
      store.delete(`et:${href}`);
      return Promise.resolve();
    }),
    getEventState: jest.fn(() => Promise.resolve(null)),
    setEventState: jest.fn(() => Promise.resolve()),
    deleteEventState: jest.fn(() => Promise.resolve()),
    clearCalendar: jest.fn(() => Promise.resolve()),
  };
}

// ─── createCalDAVSync ─────────────────────────────────────────────────────────

describe('createCalDAVSync', () => {
  function makeAdapter() {
    return {
      listCalendars: jest.fn().mockResolvedValue([REMOTE_CALENDAR]),
      syncEvents: jest.fn().mockResolvedValue({ events: [], deleted: [] }),
      createEvent: jest
        .fn()
        .mockResolvedValue({ href: `${CAL_ID}new.ics`, etag: '"new-etag"' }),
      updateEvent: jest
        .fn()
        .mockResolvedValue({ href: EVENT_HREF, etag: '"updated-etag"' }),
      deleteEvent: jest.fn(() => Promise.resolve()),
    };
  }

  it('delegates listCalendars to adapter', async () => {
    const adapter = makeAdapter();
    const engine = createCalDAVSync({
      adapter,
      storage: makeStorage() as never,
    });
    const result = await engine.listCalendars();
    expect(adapter.listCalendars).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('stores etag in storage after createEvent', async () => {
    const adapter = makeAdapter();
    const storage = makeStorage();
    const engine = createCalDAVSync({ adapter, storage: storage as never });

    const event: Event = {
      id: 'e1',
      title: 'E',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
    };
    await engine.createEvent({ calendarId: CAL_ID, event });

    expect(storage.setEtag).toHaveBeenCalledWith(
      `${CAL_ID}new.ics`,
      '"new-etag"'
    );
    expect(storage.setEventState).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        calendarId: CAL_ID,
        uid: 'e1',
        href: `${CAL_ID}new.ics`,
        etag: '"new-etag"',
      })
    );
  });

  it('stores etags and event state after syncEvents', async () => {
    const adapter = makeAdapter();
    adapter.syncEvents.mockResolvedValueOnce({
      events: [makeRemoteEventData()],
      deleted: [],
    });
    const storage = makeStorage();
    const engine = createCalDAVSync({ adapter, storage: storage as never });

    await engine.syncEvents({ calendarId: CAL_ID });

    expect(storage.setEtag).toHaveBeenCalledWith(EVENT_HREF, '"etag1"');
    expect(storage.setEventState).toHaveBeenCalledWith(
      'event1@test',
      expect.objectContaining({
        calendarId: CAL_ID,
        uid: 'event1@test',
        href: EVENT_HREF,
        etag: '"etag1"',
      })
    );
  });

  it('passes stored sync token only for collection-wide sync', async () => {
    const adapter = makeAdapter();
    const storage = makeStorage();
    await storage.setSyncToken(CAL_ID, 'sync-token-1');
    const engine = createCalDAVSync({ adapter, storage: storage as never });

    await engine.syncEvents({ calendarId: CAL_ID });
    expect(adapter.syncEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ syncToken: 'sync-token-1' })
    );

    const range = {
      start: new Date('2025-01-01'),
      end: new Date('2025-02-01'),
    };
    await engine.syncEvents({ calendarId: CAL_ID, range });
    expect(adapter.syncEvents).toHaveBeenLastCalledWith({
      calendarId: CAL_ID,
      range,
      syncToken: undefined,
    });
  });

  it('stores new sync token returned by adapter', async () => {
    const adapter = makeAdapter();
    adapter.syncEvents.mockResolvedValueOnce({
      events: [],
      deleted: [],
      syncToken: 'sync-token-2',
    });
    const storage = makeStorage();
    const engine = createCalDAVSync({ adapter, storage: storage as never });

    await engine.syncEvents({ calendarId: CAL_ID });

    expect(storage.setSyncToken).toHaveBeenCalledWith(CAL_ID, 'sync-token-2');
  });

  it('stores updated etag after updateEvent', async () => {
    const adapter = makeAdapter();
    const storage = makeStorage();
    const engine = createCalDAVSync({ adapter, storage: storage as never });

    const remote = {
      calendarId: CAL_ID,
      uid: 'event1@test',
      href: EVENT_HREF,
      etag: '"old"',
    };
    const event: Event = {
      id: 'event1@test',
      title: 'E',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
    };
    await engine.updateEvent({ calendarId: CAL_ID, event, remote });

    expect(storage.setEtag).toHaveBeenCalledWith(EVENT_HREF, '"updated-etag"');
  });

  it('removes etag from storage after deleteEvent', async () => {
    const adapter = makeAdapter();
    const storage = makeStorage();
    const engine = createCalDAVSync({ adapter, storage: storage as never });

    const remote = { calendarId: CAL_ID, uid: 'event1@test', href: EVENT_HREF };
    await engine.deleteEvent({ calendarId: CAL_ID, remote });

    expect(adapter.deleteEvent).toHaveBeenCalled();
    expect(storage.deleteEtag).toHaveBeenCalledWith(EVENT_HREF);
  });
});

// ─── attachCalDAVToDayFlow – initial sync ────────────────────────────────────

describe('attachCalDAVToDayFlow – initial sync', () => {
  it('registers remote calendars in DayFlow after start()', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);

    await controller.start();

    const calendars = app.getCalendars();
    expect(calendars).toHaveLength(1);
    expect(calendars[0].id).toBe(CAL_ID);
    expect(calendars[0].name).toBe('Personal');
    expect(calendars[0].source).toBe('CalDAV');
  });

  it('updates existing calendar on repeated start()', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);

    await controller.start();
    controller.stop();

    // Remote calendar gets a new name
    sync.listCalendars.mockResolvedValueOnce([
      { ...REMOTE_CALENDAR, name: 'Updated' },
    ]);
    await controller.start();

    expect(app.getCalendars()[0].name).toBe('Updated');
  });

  it('calls syncEvents for each discovered calendar', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);

    await controller.start();

    expect(sync.syncEvents).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: CAL_ID })
    );
  });

  it('loads remote events into DayFlow state', async () => {
    const app = makeApp();
    const sync = makeMockSync({
      syncEvents: jest.fn().mockResolvedValue({
        events: [makeRemoteEventData()],
        deleted: [],
      }),
    });
    const controller = attachCalDAVToDayFlow(app, sync);

    await controller.start();

    const events = app.getAllEvents();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Remote Event');
    expect(getCalDAVMeta(events[0])?.uid).toBe('event1@test');
  });

  it('applies remote events without triggering write-back', async () => {
    const app = makeApp();
    const sync = makeMockSync({
      syncEvents: jest.fn().mockResolvedValue({
        events: [makeRemoteEventData()],
        deleted: [],
      }),
    });
    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();
    await flush();

    // createEvent should NOT have been called — remote loads don't write back
    expect(sync.createEvent).not.toHaveBeenCalled();
  });

  it('reports idle status after successful start()', async () => {
    const app = makeApp();
    const controller = attachCalDAVToDayFlow(app, makeMockSync());
    await controller.start();
    expect(controller.getStatus().state).toBe('idle');
    expect(controller.getStatus().lastSyncedAt).toBeInstanceOf(Date);
  });

  it('reports error status when listCalendars fails', async () => {
    const app = makeApp();
    const onError = jest.fn();
    const sync = makeMockSync({
      listCalendars: jest.fn().mockRejectedValue(new Error('Network error')),
    });
    const controller = attachCalDAVToDayFlow(app, sync, { onError });

    await controller.start();

    expect(controller.getStatus().state).toBe('error');
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ operation: 'initial-sync' })
    );
  });
});

// ─── attachCalDAVToDayFlow – range sync ─────────────────────────────────────

describe('attachCalDAVToDayFlow – range sync', () => {
  it('syncs with range when visible range changes', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync, {
      refreshOnVisibleRangeChange: true,
    });
    await controller.start();
    sync.syncEvents.mockClear();

    const start = new Date('2025-02-01');
    const end = new Date('2025-02-28');
    app.emitVisibleRange(start, end, 'navigation');
    await flush();

    expect(sync.syncEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: CAL_ID,
        range: { start, end },
      })
    );
  });

  it('does not subscribe to range changes when refreshOnVisibleRangeChange=false', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync, {
      refreshOnVisibleRangeChange: false,
    });
    await controller.start();
    sync.syncEvents.mockClear();

    app.emitVisibleRange(new Date(), new Date(), 'navigation');
    await flush();

    expect(sync.syncEvents).not.toHaveBeenCalled();
  });

  it('updates existing events (add→update on re-sync)', async () => {
    const app = makeApp();
    const sync = makeMockSync({
      syncEvents: jest.fn().mockResolvedValue({
        events: [makeRemoteEventData()],
        deleted: [],
      }),
    });
    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();

    expect(app.getAllEvents()[0].title).toBe('Remote Event');

    // Second sync with updated title
    sync.syncEvents.mockResolvedValueOnce({
      events: [
        makeRemoteEventData({
          icalData: [
            'BEGIN:VCALENDAR\r\nVERSION:2.0',
            'BEGIN:VEVENT',
            'UID:event1@test',
            'SUMMARY:Updated Remote Event',
            'DTSTART:20250115T100000Z',
            'DTEND:20250115T110000Z',
            'END:VEVENT',
            'END:VCALENDAR',
          ].join('\r\n'),
        }),
      ],
      deleted: [],
    });
    app.emitVisibleRange(new Date(), new Date(), 'navigation');
    await flush();

    const events = app.getAllEvents();
    expect(events.filter(e => e.id === 'event1@test')).toHaveLength(1);
    expect(events.find(e => e.id === 'event1@test')!.title).toBe(
      'Updated Remote Event'
    );
  });

  it('removes events reported as deleted by the server', async () => {
    const app = makeApp();
    const sync = makeMockSync({
      syncEvents: jest
        .fn()
        .mockResolvedValueOnce({ events: [makeRemoteEventData()], deleted: [] })
        .mockResolvedValueOnce({
          events: [],
          deleted: [{ calendarId: CAL_ID, href: EVENT_HREF }],
        }),
    });

    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();
    expect(app.getAllEvents()).toHaveLength(1);

    app.emitVisibleRange(new Date(), new Date(), 'navigation');
    await flush();

    expect(app.getAllEvents()).toHaveLength(0);
  });
});

// ─── attachCalDAVToDayFlow – write-back ─────────────────────────────────────

describe('attachCalDAVToDayFlow – write-back (creates)', () => {
  it('calls sync.createEvent when user adds event to writable CalDAV calendar', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync, { writable: true });
    await controller.start();

    const newEvent: Event = {
      id: 'local-new',
      title: 'User Event',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: CAL_ID,
    };
    app.addEvent(newEvent);
    await flush();

    expect(sync.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: CAL_ID })
    );
  });

  it('does NOT call createEvent when writable=false', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync, { writable: false });
    await controller.start();

    app.addEvent({
      id: 'x',
      title: 'X',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: CAL_ID,
    });
    await flush();

    expect(sync.createEvent).not.toHaveBeenCalled();
  });

  it('does NOT call createEvent for events in unknown (non-CalDAV) calendars', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();

    app.addEvent({
      id: 'x',
      title: 'X',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: 'local-only-cal',
    });
    await flush();

    expect(sync.createEvent).not.toHaveBeenCalled();
  });

  it('does NOT call createEvent for recurring events', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync, {
      eventMode: { recurring: 'read-only' },
    });
    await controller.start();

    const recurringEvent: Event = {
      id: 'rec-1',
      title: 'Weekly',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: CAL_ID,
      meta: {
        caldav: {
          uid: 'rec-1@test',
          href: `${CAL_ID}rec-1.ics`,
          calendarId: CAL_ID,
          isRecurring: true,
        },
      },
    };
    app.addEvent(recurringEvent);
    await flush();

    expect(sync.createEvent).not.toHaveBeenCalled();
  });
});

describe('attachCalDAVToDayFlow – write-back (updates)', () => {
  async function setupWithExistingRemoteEvent(sync: jest.Mocked<CalDAVSync>) {
    const app = makeApp();
    // First, load the event as a remote event (sets meta.caldav)
    sync.syncEvents.mockResolvedValueOnce({
      events: [makeRemoteEventData()],
      deleted: [],
    });
    const controller = attachCalDAVToDayFlow(app, sync, { writable: true });
    await controller.start();
    sync.updateEvent.mockClear();
    return { app, controller };
  }

  it('calls sync.updateEvent when user updates an event with caldav meta', async () => {
    const sync = makeMockSync();
    const { app } = await setupWithExistingRemoteEvent(sync);

    await app.updateEvent('event1@test', { title: 'Changed Title' });
    await flush();

    expect(sync.updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: CAL_ID,
        remote: expect.objectContaining({ href: EVENT_HREF }),
      })
    );
  });

  it('updates local CalDAV metadata after create so later updates write back', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync, { writable: true });
    await controller.start();
    sync.updateEvent.mockClear();

    app.addEvent({
      id: 'local',
      title: 'L',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: CAL_ID,
    });
    await flush();

    const created = app
      .getAllEvents()
      .find((event: Event) => event.id === 'local')!;
    expect(getCalDAVMeta(created)).toEqual(
      expect.objectContaining({
        uid: 'local',
        href: `${CAL_ID}new.ics`,
        etag: '"new-etag"',
      })
    );

    await app.updateEvent('local', { title: 'Changed' });
    await flush();

    expect(sync.updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        remote: expect.objectContaining({
          uid: 'local',
          href: `${CAL_ID}new.ics`,
          etag: '"new-etag"',
        }),
      })
    );
  });
});

describe('attachCalDAVToDayFlow – write-back (deletes)', () => {
  it('calls sync.deleteEvent when user deletes event with caldav meta', async () => {
    const app = makeApp();
    const sync = makeMockSync({
      syncEvents: jest
        .fn()
        .mockResolvedValue({ events: [makeRemoteEventData()], deleted: [] }),
    });
    const controller = attachCalDAVToDayFlow(app, sync, { writable: true });
    await controller.start();
    sync.deleteEvent.mockClear();

    await app.deleteEvent('event1@test');
    await flush();

    expect(sync.deleteEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        remote: expect.objectContaining({ href: EVENT_HREF, etag: '"etag1"' }),
      })
    );
  });
});

// ─── attachCalDAVToDayFlow – read-only calendars ─────────────────────────────

describe('attachCalDAVToDayFlow – read-only calendars', () => {
  it('does not write events to read-only calendars', async () => {
    const app = makeApp();
    const sync = makeMockSync({
      listCalendars: jest.fn().mockResolvedValue([READ_ONLY_CALENDAR]),
    });
    const controller = attachCalDAVToDayFlow(app, sync, { writable: true });
    await controller.start();

    app.addEvent({
      id: 'x',
      title: 'X',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: READ_ONLY_CALENDAR.id,
    });
    await flush();

    expect(sync.createEvent).not.toHaveBeenCalled();
  });

  it('respects operation-specific permissions', async () => {
    const updateOnlyCalendar: CalDAVCalendar = {
      ...REMOTE_CALENDAR,
      readOnly: false,
      permissions: { canUpdate: true },
    };
    const app = makeApp();
    const sync = makeMockSync({
      listCalendars: jest.fn().mockResolvedValue([updateOnlyCalendar]),
      syncEvents: jest
        .fn()
        .mockResolvedValue({ events: [makeRemoteEventData()], deleted: [] }),
    });
    const controller = attachCalDAVToDayFlow(app, sync, { writable: true });
    await controller.start();

    app.addEvent({
      id: 'create-blocked',
      title: 'Create Blocked',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: CAL_ID,
    });
    await flush();
    expect(sync.createEvent).not.toHaveBeenCalled();

    await app.updateEvent('event1@test', { title: 'Update Allowed' });
    await flush();
    expect(sync.updateEvent).toHaveBeenCalled();
  });
});

// ─── attachCalDAVToDayFlow – ETag conflict handling ──────────────────────────

describe('attachCalDAVToDayFlow – ETag conflict', () => {
  it('calls onError with operation=update when update returns 412', async () => {
    const onError = jest.fn();
    const app = makeApp();
    const sync = makeMockSync({
      syncEvents: jest
        .fn()
        .mockResolvedValue({ events: [makeRemoteEventData()], deleted: [] }),
      updateEvent: jest
        .fn()
        .mockRejectedValue(
          new CalDAVError('etag-conflict', 'ETag conflict', 412, EVENT_HREF)
        ),
    });
    const controller = attachCalDAVToDayFlow(app, sync, { onError });
    await controller.start();

    await app.updateEvent('event1@test', { title: 'Conflict' });
    await flush();

    expect(onError).toHaveBeenCalledWith(
      expect.any(CalDAVError),
      expect.objectContaining({ operation: 'update' })
    );
    expect(controller.getStatus().state).toBe('error');
  });
});

// ─── attachCalDAVToDayFlow – lifecycle ───────────────────────────────────────

describe('attachCalDAVToDayFlow – lifecycle', () => {
  it('start() is idempotent while already running', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();
    await controller.start();
    sync.createEvent.mockClear();

    app.addEvent({
      id: 'x',
      title: 'X',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: CAL_ID,
    });
    await flush();

    expect(sync.createEvent).toHaveBeenCalledTimes(1);
  });

  it('stop() unsubscribes listeners so range changes no longer trigger sync', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();
    controller.stop();
    sync.syncEvents.mockClear();

    app.emitVisibleRange(new Date(), new Date(), 'navigation');
    await flush();

    expect(sync.syncEvents).not.toHaveBeenCalled();
  });

  it('stop() prevents event write-back', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();
    controller.stop();
    sync.createEvent.mockClear();

    app.addEvent({
      id: 'x',
      title: 'X',
      start: Temporal.Now.plainDateISO(),
      end: Temporal.Now.plainDateISO(),
      calendarId: CAL_ID,
    });
    await flush();

    expect(sync.createEvent).not.toHaveBeenCalled();
  });

  it('refresh() re-syncs all calendars', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();
    sync.syncEvents.mockClear();

    await controller.refresh();

    expect(sync.syncEvents).toHaveBeenCalled();
  });

  it('refresh({ calendarId }) syncs only the specified calendar', async () => {
    const app = makeApp();
    const sync = makeMockSync();
    const controller = attachCalDAVToDayFlow(app, sync);
    await controller.start();
    sync.syncEvents.mockClear();

    await controller.refresh({ calendarId: CAL_ID });

    expect(sync.syncEvents).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: CAL_ID })
    );
    expect(sync.listCalendars).toHaveBeenCalledTimes(1); // not re-discovered
  });
});
