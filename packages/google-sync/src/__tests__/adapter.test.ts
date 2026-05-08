import {
  createGoogleSyncAdapter,
  GoogleSyncError,
} from '@google-sync/sync/createGoogleSyncAdapter';
import type {
  GoogleCalendarEvent,
  GoogleCalendarList,
  GoogleEventList,
} from '@google-sync/types/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGoogleEvent(
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
    etag: '"abc"',
    status: 'confirmed',
    ...overrides,
  };
}

function mockFetch(
  body: unknown,
  status = 200
): jest.MockedFunction<(url: string, init?: RequestInit) => Promise<Response>> {
  return jest.fn((_url: string, _init?: RequestInit) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );
}

// ─── listCalendars ────────────────────────────────────────────────────────────

describe('createGoogleSyncAdapter – listCalendars', () => {
  it('calls the correct endpoint', async () => {
    const fetch = mockFetch({ items: [] } as GoogleCalendarList);
    const adapter = createGoogleSyncAdapter({ fetch });
    await adapter.listCalendars();
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('paginates through all pages', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: 'cal-1', summary: 'A', accessRole: 'owner' }],
            nextPageToken: 'pg-2',
          }),
          { status: 200 }
        )
      )
      .mockImplementationOnce((url: string) => {
        expect(url).toContain('pageToken=pg-2');
        return Promise.resolve(
          new Response(
            JSON.stringify({
              items: [{ id: 'cal-2', summary: 'B', accessRole: 'reader' }],
              nextSyncToken: 'tok',
            }),
            { status: 200 }
          )
        );
      }) as jest.MockedFunction<
      (url: string, init?: RequestInit) => Promise<Response>
    >;
    const adapter = createGoogleSyncAdapter({ fetch });
    const result = await adapter.listCalendars();
    expect(result.items).toHaveLength(2);
    expect(result.nextSyncToken).toBe('tok');
  });

  it('throws GoogleSyncError on non-OK response', async () => {
    const fetch = mockFetch({ error: { message: 'Unauthorized' } }, 401);
    const adapter = createGoogleSyncAdapter({ fetch });
    await expect(adapter.listCalendars()).rejects.toBeInstanceOf(
      GoogleSyncError
    );
  });

  it('GoogleSyncError has the correct statusCode', async () => {
    const fetch = mockFetch({}, 403);
    const adapter = createGoogleSyncAdapter({ fetch });
    const err = await adapter.listCalendars().catch(e => e);
    expect(err.statusCode).toBe(403);
  });
});

// ─── listEvents ──────────────────────────────────────────────────────────────

describe('createGoogleSyncAdapter – listEvents', () => {
  it('includes timeMin and timeMax in query string', async () => {
    const fetch = mockFetch({ items: [] } as GoogleEventList);
    const adapter = createGoogleSyncAdapter({ fetch });
    await adapter.listEvents('cal-1', {
      timeMin: '2025-06-01T00:00:00Z',
      timeMax: '2025-06-30T00:00:00Z',
      singleEvents: true,
    });
    const [url] = (fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('timeMin=2025-06-01');
    expect(url).toContain('timeMax=2025-06-30');
    expect(url).toContain('singleEvents=true');
  });

  it('includes syncToken in query string for incremental sync', async () => {
    const fetch = mockFetch({ items: [] } as GoogleEventList);
    const adapter = createGoogleSyncAdapter({ fetch });
    await adapter.listEvents('cal-1', {
      syncToken: 'my-tok',
      showDeleted: true,
    });
    const [url] = (fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('syncToken=my-tok');
    expect(url).toContain('showDeleted=true');
  });

  it('URL-encodes calendarId with special characters', async () => {
    const fetch = mockFetch({ items: [] } as GoogleEventList);
    const adapter = createGoogleSyncAdapter({ fetch });
    await adapter.listEvents('alice@example.com', {});
    const [url] = (fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('alice%40example.com');
  });
});

// ─── createEvent ─────────────────────────────────────────────────────────────

describe('createGoogleSyncAdapter – createEvent', () => {
  it('POSTs to the correct endpoint', async () => {
    const fetch = mockFetch(makeGoogleEvent());
    const adapter = createGoogleSyncAdapter({ fetch });
    await adapter.createEvent('cal-1', {
      summary: 'New event',
      start: { dateTime: '2025-06-10T10:00:00Z' },
      end: { dateTime: '2025-06-10T11:00:00Z' },
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/calendars/cal-1/events'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

// ─── updateEvent ─────────────────────────────────────────────────────────────

describe('createGoogleSyncAdapter – updateEvent', () => {
  it('PUTs with If-Match header', async () => {
    const fetch = mockFetch(makeGoogleEvent({ etag: '"new-etag"' }));
    const adapter = createGoogleSyncAdapter({ fetch });
    await adapter.updateEvent(
      'cal-1',
      'ev-1',
      {
        summary: 'Updated',
        start: { dateTime: '2025-06-10T10:00:00Z' },
        end: { dateTime: '2025-06-10T11:00:00Z' },
      },
      '"abc"'
    );
    const [, init] = (fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.method).toBe('PUT');
    expect((init.headers as Record<string, string>)['If-Match']).toBe('"abc"');
  });

  it('throws GoogleSyncError on 412 (conflict)', async () => {
    const fetch = mockFetch({}, 412);
    const adapter = createGoogleSyncAdapter({ fetch });
    const err = await adapter
      .updateEvent(
        'cal-1',
        'ev-1',
        {
          summary: 'X',
          start: { dateTime: '2025-06-10T10:00:00Z' },
          end: { dateTime: '2025-06-10T11:00:00Z' },
        },
        '"stale"'
      )
      .catch(e => e);
    expect(err).toBeInstanceOf(GoogleSyncError);
    expect(err.statusCode).toBe(412);
  });
});

// ─── deleteEvent ─────────────────────────────────────────────────────────────

describe('createGoogleSyncAdapter – deleteEvent', () => {
  it('DELETEs the correct URL', async () => {
    const fetch = jest.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(new Response(null, { status: 204 }))
    );
    const adapter = createGoogleSyncAdapter({ fetch });
    await adapter.deleteEvent('cal-1', 'ev-1');
    const [url, init] = (fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain('/calendars/cal-1/events/ev-1');
    expect(init.method).toBe('DELETE');
  });

  it('treats 404 as success (already deleted)', async () => {
    const fetch = mockFetch({ error: 'Not found' }, 404);
    const adapter = createGoogleSyncAdapter({ fetch });
    await expect(adapter.deleteEvent('cal-1', 'ev-1')).resolves.toBeUndefined();
  });

  it('sends If-Match header when etag is provided', async () => {
    const fetch = jest.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(new Response(null, { status: 204 }))
    );
    const adapter = createGoogleSyncAdapter({ fetch });
    await adapter.deleteEvent('cal-1', 'ev-1', '"my-etag"');
    const [, init] = (fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>)['If-Match']).toBe(
      '"my-etag"'
    );
  });
});

// ─── custom baseUrl ───────────────────────────────────────────────────────────

describe('createGoogleSyncAdapter – custom baseUrl', () => {
  it('uses provided baseUrl', async () => {
    const fetch = mockFetch({ items: [] } as GoogleCalendarList);
    const adapter = createGoogleSyncAdapter({
      baseUrl: 'https://proxy.example.com/gcal',
      fetch,
    });
    await adapter.listCalendars();
    const [url] = (fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).toContain('proxy.example.com/gcal');
  });

  it('strips trailing slash from baseUrl', async () => {
    const fetch = mockFetch({ items: [] } as GoogleCalendarList);
    const adapter = createGoogleSyncAdapter({
      baseUrl: 'https://proxy.example.com/gcal/',
      fetch,
    });
    await adapter.listCalendars();
    const [url] = (fetch as jest.Mock).mock.calls[0] as [string];
    expect(url).not.toContain('//users');
  });
});
