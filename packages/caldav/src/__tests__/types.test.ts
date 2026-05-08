/**
 * Type-level and interface-shape tests for @dayflow/caldav public types.
 *
 * These tests verify that:
 * - The public types are well-formed and importable
 * - Interface shapes satisfy TypeScript's structural type system
 * - Concrete implementations of the interfaces compile correctly
 */

import type {
  CalDAVAdapter,
  CalDAVCalendar,
  CalDAVDeletedEvent,
  CalDAVEventSyncState,
  CalDAVEventData,
  CalDAVRemoteRef,
  CalDAVStorage,
  CalDAVSyncResult,
  CalDAVTransport,
  CalDAVWriteResult,
} from '@caldav/types';

// ─── CalDAVCalendar ──────────────────────────────────────────────────────────

describe('CalDAVCalendar', () => {
  it('accepts a minimal calendar with only required fields', () => {
    const calendar: CalDAVCalendar = {
      id: 'cal-1',
      name: 'Personal',
    };
    expect(calendar.id).toBe('cal-1');
    expect(calendar.name).toBe('Personal');
    expect(calendar.color).toBeUndefined();
    expect(calendar.readOnly).toBeUndefined();
    expect(calendar.permissions).toBeUndefined();
  });

  it('accepts a fully-populated calendar', () => {
    const calendar: CalDAVCalendar = {
      id: 'cal-2',
      name: 'Work',
      color: '#3b82f6',
      readOnly: false,
      permissions: {
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
    };
    expect(calendar.permissions?.canCreate).toBe(true);
  });

  it('accepts a read-only calendar with partial permissions', () => {
    const calendar: CalDAVCalendar = {
      id: 'cal-3',
      name: 'Holidays',
      readOnly: true,
      permissions: {},
    };
    expect(calendar.readOnly).toBe(true);
  });
});

// ─── CalDAVRemoteRef ─────────────────────────────────────────────────────────

describe('CalDAVRemoteRef', () => {
  it('accepts a ref with all required fields', () => {
    const ref: CalDAVRemoteRef = {
      calendarId: 'cal-1',
      uid: 'abc-123@example.com',
      href: '/calendars/user/cal-1/abc-123.ics',
    };
    expect(ref.uid).toBe('abc-123@example.com');
    expect(ref.etag).toBeUndefined();
  });

  it('accepts a ref with an etag', () => {
    const ref: CalDAVRemoteRef = {
      calendarId: 'cal-1',
      uid: 'abc-123@example.com',
      href: '/calendars/user/cal-1/abc-123.ics',
      etag: '"abc123etag"',
    };
    expect(ref.etag).toBe('"abc123etag"');
  });
});

// ─── CalDAVSyncResult ────────────────────────────────────────────────────────

describe('CalDAVSyncResult', () => {
  it('accepts a result with no events and no deletions', () => {
    const result: CalDAVSyncResult = { events: [], deleted: [] };
    expect(result.events).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });

  it('accepts a result with events and deleted remote resources', () => {
    const event: CalDAVEventData = {
      calendarId: 'cal-1',
      uid: 'e1@example.com',
      href: '/cal/e1.ics',
      etag: '"etag1"',
      icalData: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR',
    };
    const deleted: CalDAVDeletedEvent = {
      calendarId: 'cal-1',
      href: '/cal/old.ics',
    };
    const result: CalDAVSyncResult = {
      events: [event],
      deleted: [deleted],
    };
    expect(result.events).toHaveLength(1);
    expect(result.deleted).toHaveLength(1);
  });
});

// ─── CalDAVWriteResult ───────────────────────────────────────────────────────

describe('CalDAVWriteResult', () => {
  it('accepts a result with href and optional etag', () => {
    const result: CalDAVWriteResult = {
      href: '/calendars/user/cal-1/new.ics',
      etag: '"new-etag"',
    };
    expect(result.href).toBeTruthy();
  });

  it('accepts a result without an etag', () => {
    const result: CalDAVWriteResult = {
      href: '/calendars/user/cal-1/new.ics',
    };
    expect(result.etag).toBeUndefined();
  });
});

// ─── CalDAVStorage ───────────────────────────────────────────────────────────

function makeInMemoryStorage(): CalDAVStorage {
  const store = new Map<string, string>();
  const eventStates = new Map<string, CalDAVEventSyncState>();
  return {
    getSyncToken: id => Promise.resolve(store.get(`st:${id}`) ?? null),
    setSyncToken: (id, token) => {
      store.set(`st:${id}`, token);
      return Promise.resolve();
    },
    getCtag: id => Promise.resolve(store.get(`ct:${id}`) ?? null),
    setCtag: (id, ctag) => {
      store.set(`ct:${id}`, ctag);
      return Promise.resolve();
    },
    getEtag: href => Promise.resolve(store.get(`et:${href}`) ?? null),
    setEtag: (href, etag) => {
      store.set(`et:${href}`, etag);
      return Promise.resolve();
    },
    deleteEtag: href => {
      store.delete(`et:${href}`);
      return Promise.resolve();
    },
    getEventState: id => Promise.resolve(eventStates.get(id) ?? null),
    setEventState: (id, state) => {
      eventStates.set(id, state);
      return Promise.resolve();
    },
    deleteEventState: id => {
      eventStates.delete(id);
      return Promise.resolve();
    },
    clearCalendar: id => {
      for (const key of Array.from(store.keys())) {
        if (key.includes(id)) store.delete(key);
      }
      for (const [eventId, state] of Array.from(eventStates)) {
        if (state.calendarId === id) eventStates.delete(eventId);
      }
      return Promise.resolve();
    },
  };
}

describe('CalDAVStorage', () => {
  it('accepts a concrete in-memory implementation', async () => {
    const storage = makeInMemoryStorage();

    await storage.setSyncToken('cal-1', 'tok-abc');
    expect(await storage.getSyncToken('cal-1')).toBe('tok-abc');
    expect(await storage.getSyncToken('cal-x')).toBeNull();

    await storage.setEtag('/cal/e1.ics', '"etag1"');
    expect(await storage.getEtag('/cal/e1.ics')).toBe('"etag1"');

    await storage.deleteEtag('/cal/e1.ics');
    expect(await storage.getEtag('/cal/e1.ics')).toBeNull();

    await storage.setEventState('event-1', {
      calendarId: 'cal-1',
      uid: 'e1@example.com',
      href: '/cal/e1.ics',
      etag: '"etag1"',
      sequence: 2,
      lastSyncedAt: '2026-05-08T00:00:00.000Z',
    });
    expect(await storage.getEventState('event-1')).toMatchObject({
      calendarId: 'cal-1',
      uid: 'e1@example.com',
    });

    await storage.clearCalendar('cal-1');
    expect(await storage.getEventState('event-1')).toBeNull();
  });
});

// ─── CalDAVTransport ─────────────────────────────────────────────────────────

describe('CalDAVTransport', () => {
  it('accepts a concrete transport implementation', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];

    const transport: CalDAVTransport = {
      fetch: (url, init) => {
        calls.push({ url, init });
        return Promise.resolve(new Response('<multistatus/>', { status: 207 }));
      },
    };

    const response = await transport.fetch('https://caldav.example.com/user/', {
      method: 'PROPFIND',
    });

    expect(response.status).toBe(207);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://caldav.example.com/user/');
    expect(calls[0].init?.method).toBe('PROPFIND');
  });
});

// ─── CalDAVAdapter ───────────────────────────────────────────────────────────

describe('CalDAVAdapter', () => {
  it('accepts a concrete stub implementation', async () => {
    const adapter: CalDAVAdapter = {
      listCalendars: () => Promise.resolve([{ id: 'cal-1', name: 'Personal' }]),

      syncEvents: ({ calendarId, range }) => {
        expect(calendarId).toBe('cal-1');
        expect(range).toBeDefined();
        return Promise.resolve({ events: [], deleted: [] });
      },

      createEvent: ({ calendarId }) => {
        expect(calendarId).toBe('cal-1');
        return Promise.resolve({ href: '/cal/new.ics', etag: '"new"' });
      },

      updateEvent: ({ remote }) =>
        Promise.resolve({
          href: remote.href,
          etag: '"updated"',
        }),

      deleteEvent: () => Promise.resolve(),
    };

    const calendars = await adapter.listCalendars();
    expect(calendars).toHaveLength(1);
    expect(calendars[0].id).toBe('cal-1');

    const result = await adapter.syncEvents({
      calendarId: 'cal-1',
      range: { start: new Date(), end: new Date() },
    });
    expect(result.events).toHaveLength(0);
  });
});
