import type { Event } from '@dayflow/core';
import { createGoogleSync } from '@google-sync/sync/createGoogleSync';
import { GoogleSyncError } from '@google-sync/sync/createGoogleSyncAdapter';
import type { GoogleSyncAdapter } from '@google-sync/types/adapter';
import type {
  GoogleCalendarEvent,
  GoogleCalendarList,
  GoogleCalendarListEntry,
  GoogleEventList,
} from '@google-sync/types/api';
import { Temporal } from 'temporal-polyfill';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(
  overrides: Partial<GoogleCalendarListEntry> = {}
): GoogleCalendarListEntry {
  return { id: 'cal-1', summary: 'Work', accessRole: 'owner', ...overrides };
}

function makeApiEvent(
  overrides: Partial<GoogleCalendarEvent> = {}
): GoogleCalendarEvent {
  return {
    id: 'ev-1',
    summary: 'Meeting',
    start: {
      dateTime: '2025-06-10T10:00:00-05:00',
      timeZone: 'America/Chicago',
    },
    end: { dateTime: '2025-06-10T11:00:00-05:00', timeZone: 'America/Chicago' },
    etag: '"etag1"',
    status: 'confirmed',
    ...overrides,
  };
}

function makeDayFlowEvent(overrides: Partial<Event> = {}): Event {
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

function makeAdapter(
  overrides: Partial<GoogleSyncAdapter> = {}
): GoogleSyncAdapter {
  return {
    listCalendars: vi.fn((): Promise<GoogleCalendarList> =>
      Promise.resolve({ items: [makeEntry()] })
    ),
    listEvents: vi.fn((): Promise<GoogleEventList> =>
      Promise.resolve({
        items: [makeApiEvent()],
        nextSyncToken: 'tok-1',
      })
    ),
    getEvent: vi.fn(() =>
      Promise.resolve(makeApiEvent({ etag: '"fresh-etag"' }))
    ),
    createEvent: vi.fn(() =>
      Promise.resolve(makeApiEvent({ id: 'ev-new', etag: '"new-etag"' }))
    ),
    updateEvent: vi.fn(() =>
      Promise.resolve(makeApiEvent({ etag: '"updated-etag"' }))
    ),
    deleteEvent: vi.fn(() => Promise.resolve()),
    moveEvent: vi.fn(() => Promise.resolve(makeApiEvent())),
    ...overrides,
  };
}

// ─── listCalendars ────────────────────────────────────────────────────────────

describe('createGoogleSync – listCalendars', () => {
  it('returns mapped DayFlow calendars', async () => {
    const sync = createGoogleSync(makeAdapter());
    const calendars = await sync.listCalendars();
    expect(calendars).toHaveLength(1);
    expect(calendars[0].id).toBe('cal-1');
    expect(calendars[0].name).toBe('Work');
    expect(calendars[0].source).toBe('Google');
  });

  it('excludes hidden calendars', async () => {
    const adapter = makeAdapter({
      listCalendars: vi.fn(() =>
        Promise.resolve({
          items: [
            makeEntry(),
            makeEntry({ id: 'cal-2', summary: 'Hidden', hidden: true }),
          ],
        })
      ),
    });
    const sync = createGoogleSync(adapter);
    const calendars = await sync.listCalendars();
    expect(calendars).toHaveLength(1);
    expect(calendars[0].id).toBe('cal-1');
  });

  it('marks reader calendars as readOnly', async () => {
    const adapter = makeAdapter({
      listCalendars: vi.fn(() =>
        Promise.resolve({
          items: [makeEntry({ accessRole: 'reader' })],
        })
      ),
    });
    const sync = createGoogleSync(adapter);
    const calendars = await sync.listCalendars();
    expect(calendars[0].readOnly).toBe(true);
  });
});

// ─── syncEvents ──────────────────────────────────────────────────────────────

describe('createGoogleSync – syncEvents', () => {
  it('returns mapped events for a range query', async () => {
    const sync = createGoogleSync(makeAdapter());
    const result = await sync.syncEvents('cal-1', {
      start: '2025-06-01T00:00:00Z',
      end: '2025-06-30T00:00:00Z',
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe('ev-1');
    expect(result.deleted).toHaveLength(0);
  });

  it('passes timeMin and timeMax for range queries', async () => {
    const listEvents = vi.fn(() =>
      Promise.resolve({ items: [], nextSyncToken: 'tok' })
    );
    const sync = createGoogleSync(makeAdapter({ listEvents }));
    await sync.syncEvents('cal-1', {
      start: '2025-06-01T00:00:00Z',
      end: '2025-06-30T00:00:00Z',
    });
    expect(listEvents).toHaveBeenCalledWith(
      'cal-1',
      expect.objectContaining({
        timeMin: '2025-06-01T00:00:00Z',
        timeMax: '2025-06-30T00:00:00Z',
        singleEvents: true,
      })
    );
  });

  it('passes syncToken for incremental sync', async () => {
    const listEvents = vi.fn(() =>
      Promise.resolve({ items: [], nextSyncToken: 'tok-2' })
    );
    const sync = createGoogleSync(makeAdapter({ listEvents }));
    await sync.syncEvents('cal-1', undefined, 'existing-tok');
    expect(listEvents).toHaveBeenCalledWith(
      'cal-1',
      expect.objectContaining({
        syncToken: 'existing-tok',
        showDeleted: true,
      })
    );
  });

  it('returns nextSyncToken from the response', async () => {
    const sync = createGoogleSync(makeAdapter());
    const result = await sync.syncEvents('cal-1', {
      start: '2025-06-01T00:00:00Z',
      end: '2025-06-30T00:00:00Z',
    });
    expect(result.syncToken).toBe('tok-1');
  });

  it('treats cancelled events as deletions', async () => {
    const adapter = makeAdapter({
      listEvents: vi.fn(() =>
        Promise.resolve({
          items: [makeApiEvent({ id: 'ev-del', status: 'cancelled' })],
        })
      ),
    });
    const sync = createGoogleSync(adapter);
    const result = await sync.syncEvents('cal-1', undefined, 'stale-tok');
    expect(result.events).toHaveLength(0);
    expect(result.deleted).toContain('ev-del');
  });

  it('paginates when nextPageToken is returned', async () => {
    const listEvents = vi
      .fn()
      .mockResolvedValueOnce({
        items: [makeApiEvent({ id: 'ev-a' })],
        nextPageToken: 'pg-2',
      })
      .mockResolvedValueOnce({
        items: [makeApiEvent({ id: 'ev-b' })],
        nextSyncToken: 'tok-final',
      });
    const sync = createGoogleSync(makeAdapter({ listEvents }));
    const result = await sync.syncEvents('cal-1', {
      start: '2025-06-01T00:00:00Z',
      end: '2025-06-30T00:00:00Z',
    });
    expect(result.events).toHaveLength(2);
    expect(result.syncToken).toBe('tok-final');
  });

  it('clears an expired sync token and retries with a full query', async () => {
    const storage = {
      getSyncToken: vi.fn(() => Promise.resolve('expired-token')),
      setSyncToken: vi.fn(() => Promise.resolve()),
    };
    const listEvents = vi
      .fn()
      .mockRejectedValueOnce(new GoogleSyncError(410, 'expired'))
      .mockResolvedValueOnce({
        items: [makeApiEvent({ id: 'ev-after-retry' })],
        nextSyncToken: 'fresh-token',
      });
    const sync = createGoogleSync(makeAdapter({ listEvents }), { storage });

    const result = await sync.syncEvents('cal-1');

    expect(storage.setSyncToken).toHaveBeenCalledWith('cal-1', null);
    expect(storage.setSyncToken).toHaveBeenCalledWith('cal-1', 'fresh-token');
    expect(listEvents).toHaveBeenNthCalledWith(
      2,
      'cal-1',
      expect.objectContaining({ singleEvents: true })
    );
    expect(result.events[0].id).toBe('ev-after-retry');
  });
});

// ─── createEvent ─────────────────────────────────────────────────────────────

describe('createGoogleSync – createEvent', () => {
  it('calls adapter.createEvent and returns mapped event', async () => {
    const createEvent = vi.fn(() =>
      Promise.resolve(makeApiEvent({ id: 'ev-new', etag: '"new-etag"' }))
    );
    const sync = createGoogleSync(makeAdapter({ createEvent }));
    const created = await sync.createEvent('cal-1', makeDayFlowEvent());
    expect(createEvent).toHaveBeenCalledWith(
      'cal-1',
      expect.objectContaining({ summary: 'Meeting' })
    );
    const meta = created.meta!.google as { etag: string };
    expect(meta.etag).toBe('"new-etag"');
  });
});

// ─── updateEvent ─────────────────────────────────────────────────────────────

describe('createGoogleSync – updateEvent', () => {
  it('calls adapter.updateEvent with correct etag', async () => {
    const updateEvent = vi.fn(() =>
      Promise.resolve(makeApiEvent({ etag: '"updated-etag"' }))
    );
    const sync = createGoogleSync(makeAdapter({ updateEvent }));
    const updated = await sync.updateEvent(makeDayFlowEvent());
    expect(updateEvent).toHaveBeenCalledWith(
      'cal-1',
      'ev-1',
      expect.anything(),
      '"etag1"'
    );
    const meta = updated.meta!.google as { etag: string };
    expect(meta.etag).toBe('"updated-etag"');
  });

  it('throws if event has no google meta', async () => {
    const sync = createGoogleSync(makeAdapter());
    const event = makeDayFlowEvent({ meta: {} });
    await expect(sync.updateEvent(event)).rejects.toThrow('google meta');
  });
});

// ─── deleteEvent ─────────────────────────────────────────────────────────────

describe('createGoogleSync – deleteEvent', () => {
  it('calls adapter.deleteEvent with correct ids', async () => {
    const deleteEvent = vi.fn(() => Promise.resolve());
    const sync = createGoogleSync(makeAdapter({ deleteEvent }));
    await sync.deleteEvent(makeDayFlowEvent());
    expect(deleteEvent).toHaveBeenCalledWith('cal-1', 'ev-1', '"etag1"');
  });

  it('throws if event has no google meta', async () => {
    const sync = createGoogleSync(makeAdapter());
    const event = makeDayFlowEvent({ meta: {} });
    await expect(sync.deleteEvent(event)).rejects.toThrow('google meta');
  });
});
