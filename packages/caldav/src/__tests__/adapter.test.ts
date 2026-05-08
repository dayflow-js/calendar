import { createCalDAVAdapter } from '@caldav/adapter/createCalDAVAdapter';
import { CalDAVError } from '@caldav/adapter/errors';
import {
  normalizeXml,
  getFirstText,
  getPrivileges,
  getCalendarColor,
  getResponseBlocks,
  isCalendarCollection,
} from '@caldav/adapter/xml';
import type { Event } from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';

// ─── XML utilities ────────────────────────────────────────────────────────────

describe('normalizeXml', () => {
  it('strips DAV: namespace prefixes', () => {
    const xml =
      '<D:multistatus xmlns:D="DAV:"><D:response><D:href>/</D:href></D:response></D:multistatus>';
    const result = normalizeXml(xml);
    expect(result).toContain('<multistatus>');
    expect(result).toContain('<response>');
    expect(result).toContain('<href>/</href>');
    expect(result).not.toContain('xmlns:');
  });

  it('strips CalDAV namespace prefixes', () => {
    const xml =
      '<C:calendar-data xmlns:C="urn:ietf:params:xml:ns:caldav">DATA</C:calendar-data>';
    expect(normalizeXml(xml)).toContain('<calendar-data>DATA</calendar-data>');
  });

  it('handles multiple different prefixes for same element type', () => {
    const xml =
      '<IC:calendar-color>#3b82f6</IC:calendar-color><CS:calendar-color>#ff0000</CS:calendar-color>';
    const result = normalizeXml(xml);
    expect(result).toContain('<calendar-color>#3b82f6</calendar-color>');
    expect(result).toContain('<calendar-color>#ff0000</calendar-color>');
  });
});

describe('XML extraction helpers', () => {
  it('decodes XML entities in text values', () => {
    const xml = '<displayname>R&amp;D &lt;Calendar&gt; &#x2603;</displayname>';
    expect(getFirstText(xml, 'displayname')).toBe('R&D <Calendar> \u2603');
  });

  it('splits response blocks even when response has attributes', () => {
    const xml =
      '<multistatus><response xml:lang="en"><href>/cal/</href></response></multistatus>';
    expect(getResponseBlocks(xml)).toHaveLength(1);
  });

  it('detects expanded calendar collection tags', () => {
    const xml =
      '<resourcetype><collection></collection><calendar></calendar></resourcetype>';
    expect(isCalendarCollection(xml)).toBe(true);
  });
});

describe('getPrivileges', () => {
  it('detects write privileges from bind/write/unbind', () => {
    const xml = `<current-user-privilege-set>
      <privilege><read/></privilege>
      <privilege><write/></privilege>
      <privilege><bind/></privilege>
      <privilege><unbind/></privilege>
    </current-user-privilege-set>`;
    const perms = getPrivileges(xml);
    expect(perms.canCreate).toBe(true);
    expect(perms.canUpdate).toBe(true);
    expect(perms.canDelete).toBe(true);
  });

  it('returns empty object when privilege set is absent', () => {
    expect(
      getPrivileges('<prop><displayname>Cal</displayname></prop>')
    ).toEqual({});
  });

  it('returns read-only permissions when only read privilege is present', () => {
    const xml =
      '<current-user-privilege-set><privilege><read/></privilege></current-user-privilege-set>';
    const perms = getPrivileges(xml);
    expect(perms.canCreate).toBeUndefined();
    expect(perms.canUpdate).toBeUndefined();
    expect(perms.canDelete).toBeUndefined();
  });

  it('detects expanded privilege tags', () => {
    const xml =
      '<current-user-privilege-set><privilege><write></write></privilege><privilege><bind></bind></privilege></current-user-privilege-set>';
    const perms = getPrivileges(xml);
    expect(perms.canCreate).toBe(true);
    expect(perms.canUpdate).toBe(true);
  });
});

describe('getCalendarColor', () => {
  it('returns 6-digit hex as-is', () => {
    expect(getCalendarColor('<calendar-color>#3b82f6</calendar-color>')).toBe(
      '#3b82f6'
    );
  });

  it('strips alpha from 8-digit Nextcloud RGBA format', () => {
    expect(getCalendarColor('<calendar-color>#3b82f6FF</calendar-color>')).toBe(
      '#3b82f6'
    );
  });

  it('returns undefined for non-hex values', () => {
    expect(
      getCalendarColor('<calendar-color>blue</calendar-color>')
    ).toBeUndefined();
  });

  it('returns undefined when element is absent', () => {
    expect(getCalendarColor('<displayname>Cal</displayname>')).toBeUndefined();
  });
});

// ─── Mock transport builder ───────────────────────────────────────────────────

type MockResponse = {
  status: number;
  body?: string;
  headers?: Record<string, string>;
};

function makeMockFetch(responses: MockResponse[]) {
  let idx = 0;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const fetchFn = jest.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = responses[idx++] ?? { status: 200, body: '' };
    const hdrs = new Headers(r.headers ?? {});
    // Response constructor forbids a body for 204/304
    const body = r.status === 204 || r.status === 304 ? null : (r.body ?? '');
    return Promise.resolve(
      new Response(body, { status: r.status, headers: hdrs })
    );
  });

  return { fetchFn, calls };
}

// ─── PROPFIND (listCalendars) ─────────────────────────────────────────────────

const PROPFIND_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:IC="http://apple.com/ns/ical/">
  <D:response>
    <D:href>/caldav/user/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>user</D:displayname>
        <D:resourcetype><D:collection/></D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/caldav/user/personal/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>Personal</D:displayname>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
        <IC:calendar-color>#3b82f6FF</IC:calendar-color>
        <D:current-user-privilege-set>
          <D:privilege><D:read/></D:privilege>
          <D:privilege><D:write/></D:privilege>
          <D:privilege><D:write-content/></D:privilege>
          <D:privilege><D:bind/></D:privilege>
          <D:privilege><D:unbind/></D:privilege>
        </D:current-user-privilege-set>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/caldav/user/holidays/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>Public Holidays</D:displayname>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
        <D:current-user-privilege-set>
          <D:privilege><D:read/></D:privilege>
        </D:current-user-privilege-set>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

describe('listCalendars (PROPFIND)', () => {
  function makeAdapter() {
    const { fetchFn, calls } = makeMockFetch([
      { status: 207, body: PROPFIND_RESPONSE },
    ]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/caldav/user/',
      fetch: fetchFn,
    });
    return { adapter, fetchFn, calls };
  }

  it('sends PROPFIND with Depth: 1 to the calendar home URL', async () => {
    const { adapter, calls } = makeAdapter();
    await adapter.listCalendars();
    expect(calls[0].url).toBe('/caldav/user/');
    expect((calls[0].init as RequestInit & { method: string }).method).toBe(
      'PROPFIND'
    );
    expect((calls[0].init!.headers as Record<string, string>)['Depth']).toBe(
      '1'
    );
  });

  it('skips the home collection and returns only calendar resources', async () => {
    const { adapter } = makeAdapter();
    const calendars = await adapter.listCalendars();
    expect(calendars).toHaveLength(2);
    expect(calendars.map(c => c.id)).toEqual([
      '/caldav/user/personal/',
      '/caldav/user/holidays/',
    ]);
  });

  it('parses calendar display name', async () => {
    const { adapter } = makeAdapter();
    const [personal] = await adapter.listCalendars();
    expect(personal.name).toBe('Personal');
  });

  it('parses calendar color (strips alpha from Nextcloud 8-digit format)', async () => {
    const { adapter } = makeAdapter();
    const [personal] = await adapter.listCalendars();
    expect(personal.color).toBe('#3b82f6');
  });

  it('derives readOnly=false for calendar with write privileges', async () => {
    const { adapter } = makeAdapter();
    const [personal] = await adapter.listCalendars();
    expect(personal.readOnly).toBe(false);
    expect(personal.permissions?.canCreate).toBe(true);
    expect(personal.permissions?.canUpdate).toBe(true);
    expect(personal.permissions?.canDelete).toBe(true);
  });

  it('derives readOnly=true for read-only calendar (read privilege only)', async () => {
    const { adapter } = makeAdapter();
    const [, holidays] = await adapter.listCalendars();
    expect(holidays.name).toBe('Public Holidays');
    expect(holidays.readOnly).toBe(true);
  });

  it('treats missing current-user-privilege-set as read-only (Radicale compatibility)', async () => {
    const noPrivXml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>/dav/cal/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>My Cal</D:displayname>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;
    const { fetchFn } = makeMockFetch([{ status: 207, body: noPrivXml }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/dav/',
      fetch: fetchFn,
    });
    const calendars = await adapter.listCalendars();
    expect(calendars[0].readOnly).toBe(true);
    expect(calendars[0].permissions).toBeUndefined();
  });

  it('throws CalDAVError(forbidden) for 403 response', async () => {
    const { fetchFn } = makeMockFetch([{ status: 403 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/dav/',
      fetch: fetchFn,
    });
    const err = await adapter.listCalendars().catch(e => e);
    expect(err).toBeInstanceOf(CalDAVError);
    expect(err.code).toBe('forbidden');
    expect(err.statusCode).toBe(403);
  });
});

// ─── REPORT (syncEvents) ─────────────────────────────────────────────────────

const REPORT_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>/caldav/user/personal/event1.ics</D:href>
    <D:propstat>
      <D:prop>
        <D:getetag>"etag-event1"</D:getetag>
        <C:calendar-data>BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:event1@test\r\nSUMMARY:Team Standup\r\nDTSTART:20250115T090000Z\r\nDTEND:20250115T093000Z\r\nEND:VEVENT\r\nEND:VCALENDAR</C:calendar-data>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/caldav/user/personal/allday.ics</D:href>
    <D:propstat>
      <D:prop>
        <D:getetag>"etag-allday"</D:getetag>
        <C:calendar-data>BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:allday@test\r\nSUMMARY:Holiday\r\nDTSTART;VALUE=DATE:20250101\r\nDTEND;VALUE=DATE:20250102\r\nEND:VEVENT\r\nEND:VCALENDAR</C:calendar-data>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

describe('syncEvents (REPORT)', () => {
  const CAL_ID = '/caldav/user/personal/';

  function makeAdapter(body = REPORT_RESPONSE) {
    const { fetchFn, calls } = makeMockFetch([{ status: 207, body }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/caldav/user/',
      fetch: fetchFn,
    });
    return { adapter, fetchFn, calls };
  }

  it('sends REPORT to the calendarId URL with Depth: 1', async () => {
    const { adapter, calls } = makeAdapter();
    await adapter.syncEvents({ calendarId: CAL_ID });
    expect(calls[0].url).toBe(CAL_ID);
    expect((calls[0].init as RequestInit & { method: string }).method).toBe(
      'REPORT'
    );
    expect((calls[0].init!.headers as Record<string, string>)['Depth']).toBe(
      '1'
    );
  });

  it('includes time-range in REPORT body when range is provided', async () => {
    const { adapter, calls } = makeAdapter();
    await adapter.syncEvents({
      calendarId: CAL_ID,
      range: { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
    });
    const body = (calls[0].init as RequestInit).body as string;
    expect(body).toContain('<C:time-range');
    expect(body).toContain('20250101T000000Z');
  });

  it('omits time-range when range is not provided', async () => {
    const { adapter, calls } = makeAdapter();
    await adapter.syncEvents({ calendarId: CAL_ID });
    const body = (calls[0].init as RequestInit).body as string;
    expect(body).not.toContain('<C:time-range');
  });

  it('returns parsed events with uid, href, etag, and calendarId', async () => {
    const { adapter } = makeAdapter();
    const result = await adapter.syncEvents({ calendarId: CAL_ID });
    expect(result.events).toHaveLength(2);

    const [first] = result.events;
    expect(first.uid).toBe('event1@test');
    expect(first.href).toBe('/caldav/user/personal/event1.ics');
    expect(first.etag).toBe('"etag-event1"');
    expect(first.calendarId).toBe(CAL_ID);
    expect(first.icalData).toContain('BEGIN:VCALENDAR');
  });

  it('returns empty deleted array (deletions tracked in sync engine)', async () => {
    const { adapter } = makeAdapter();
    const result = await adapter.syncEvents({ calendarId: CAL_ID });
    expect(result.deleted).toHaveLength(0);
  });

  it('uses sync-collection REPORT when syncToken is provided', async () => {
    const syncResponse = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:sync-token>token-2</D:sync-token>
  <D:response>
    <D:href>/caldav/user/personal/event1.ics</D:href>
    <D:propstat>
      <D:prop>
        <D:getetag>"etag-event1"</D:getetag>
        <C:calendar-data>BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:event1@test\r\nSUMMARY:Changed\r\nDTSTART:20250115T090000Z\r\nDTEND:20250115T093000Z\r\nEND:VEVENT\r\nEND:VCALENDAR</C:calendar-data>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
  <D:response>
    <D:href>/caldav/user/personal/deleted.ics</D:href>
    <D:status>HTTP/1.1 404 Not Found</D:status>
  </D:response>
</D:multistatus>`;
    const { fetchFn, calls } = makeMockFetch([
      { status: 207, body: syncResponse },
    ]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/caldav/user/',
      fetch: fetchFn,
    });

    const result = await adapter.syncEvents({
      calendarId: CAL_ID,
      syncToken: 'token-1',
    });

    expect(calls[0].init?.method).toBe('REPORT');
    expect(calls[0].init?.body as string).toContain('<D:sync-collection');
    expect(calls[0].init?.body as string).toContain(
      '<D:sync-token>token-1</D:sync-token>'
    );
    expect(result.syncToken).toBe('token-2');
    expect(result.events).toHaveLength(1);
    expect(result.deleted).toEqual([
      { calendarId: CAL_ID, href: '/caldav/user/personal/deleted.ics' },
    ]);
  });

  it('falls back to calendar-query when sync token is rejected', async () => {
    const { fetchFn, calls } = makeMockFetch([
      { status: 409 },
      { status: 207, body: REPORT_RESPONSE },
    ]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/caldav/user/',
      fetch: fetchFn,
    });

    const result = await adapter.syncEvents({
      calendarId: CAL_ID,
      syncToken: 'stale-token',
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].init?.body as string).toContain('<D:sync-collection');
    expect(calls[1].init?.body as string).toContain('<C:calendar-query');
    expect(result.events).toHaveLength(2);
  });

  it('skips response blocks without calendar-data or uid', async () => {
    const partialXml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>/cal/no-data.ics</D:href>
    <D:propstat><D:prop><D:getetag>"e1"</D:getetag></D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat>
  </D:response>
  <D:response>
    <D:href>/cal/event1.ics</D:href>
    <D:propstat>
      <D:prop>
        <D:getetag>"e2"</D:getetag>
        <C:calendar-data>BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:e2@test\r\nSUMMARY:E\r\nDTSTART:20250115T100000Z\r\nDTEND:20250115T110000Z\r\nEND:VEVENT\r\nEND:VCALENDAR</C:calendar-data>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;
    const { adapter } = makeAdapter(partialXml);
    const result = await adapter.syncEvents({ calendarId: CAL_ID });
    expect(result.events).toHaveLength(1);
    expect(result.events[0].uid).toBe('e2@test');
  });
});

// ─── PUT create (createEvent) ─────────────────────────────────────────────────

describe('createEvent (PUT)', () => {
  function makeEvent(overrides: Partial<Event> = {}): Event {
    return {
      id: 'local-1',
      title: 'New Event',
      start: Temporal.ZonedDateTime.from('2025-06-10T09:00:00+00:00[UTC]'),
      end: Temporal.ZonedDateTime.from('2025-06-10T10:00:00+00:00[UTC]'),
      calendarId: 'cal-1',
      ...overrides,
    };
  }

  it('sends PUT with Content-Type and If-None-Match: *', async () => {
    const { fetchFn, calls } = makeMockFetch([
      { status: 201, headers: { ETag: '"new-etag"' } },
    ]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });

    await adapter.createEvent({
      calendarId: '/cal/personal/',
      event: makeEvent(),
    });

    const call = calls[0];
    expect(call.init?.method).toBe('PUT');
    expect(
      (call.init!.headers as Record<string, string>)['Content-Type']
    ).toContain('text/calendar');
    expect(
      (call.init!.headers as Record<string, string>)['If-None-Match']
    ).toBe('*');
  });

  it('constructs href from calendarId + uid', async () => {
    const { fetchFn, calls } = makeMockFetch([{ status: 201 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });

    const event = makeEvent({
      meta: {
        caldav: {
          uid: 'test-uid@dayflow',
          href: '',
          calendarId: 'cal',
          isRecurring: false,
        },
      },
    });
    await adapter.createEvent({ calendarId: '/cal/personal/', event });

    expect(calls[0].url).toContain('test-uid@dayflow.ics');
    expect(calls[0].url.startsWith('/cal/personal/')).toBe(true);
  });

  it('returns href and etag from response headers', async () => {
    const { fetchFn } = makeMockFetch([
      {
        status: 201,
        headers: { ETag: '"new-etag"', Location: '/cal/personal/new.ics' },
      },
    ]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });

    const result = await adapter.createEvent({
      calendarId: '/cal/personal/',
      event: makeEvent(),
    });

    expect(result.etag).toBe('"new-etag"');
    expect(result.href).toBe('/cal/personal/new.ics');
  });

  it('throws CalDAVError with code=etag-conflict on 412', async () => {
    const { fetchFn } = makeMockFetch([{ status: 412 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });

    await expect(
      adapter.createEvent({ calendarId: '/cal/personal/', event: makeEvent() })
    ).rejects.toMatchObject({ code: 'etag-conflict' });
  });

  it('sends valid VCALENDAR in request body', async () => {
    const { fetchFn, calls } = makeMockFetch([{ status: 201 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    await adapter.createEvent({
      calendarId: '/cal/personal/',
      event: makeEvent(),
    });

    const body = calls[0].init?.body as string;
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('SUMMARY:New Event');
  });
});

// ─── PUT update (updateEvent) ─────────────────────────────────────────────────

describe('updateEvent (PUT)', () => {
  const remote: import('../types/event').CalDAVRemoteRef = {
    calendarId: '/cal/personal/',
    uid: 'event1@test',
    href: '/cal/personal/event1.ics',
    etag: '"old-etag"',
  };

  function makeEvent(): Event {
    return {
      id: 'event1@test',
      title: 'Updated Title',
      start: Temporal.ZonedDateTime.from('2025-06-10T09:00:00+00:00[UTC]'),
      end: Temporal.ZonedDateTime.from('2025-06-10T10:00:00+00:00[UTC]'),
      meta: {
        caldav: {
          uid: 'event1@test',
          href: remote.href,
          calendarId: '/cal/personal/',
          isRecurring: false,
        },
      },
    };
  }

  it('sends PUT to remote.href with If-Match header', async () => {
    const { fetchFn, calls } = makeMockFetch([{ status: 204 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    await adapter.updateEvent({
      calendarId: '/cal/personal/',
      event: makeEvent(),
      remote,
    });

    expect(calls[0].url).toBe('/cal/personal/event1.ics');
    expect(calls[0].init?.method).toBe('PUT');
    expect((calls[0].init!.headers as Record<string, string>)['If-Match']).toBe(
      '"old-etag"'
    );
  });

  it('returns updated etag from ETag response header', async () => {
    const { fetchFn } = makeMockFetch([
      { status: 204, headers: { ETag: '"updated-etag"' } },
    ]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    const result = await adapter.updateEvent({
      calendarId: '/cal/personal/',
      event: makeEvent(),
      remote,
    });
    expect(result.etag).toBe('"updated-etag"');
  });

  it('falls back to old etag when server does not return ETag on 204', async () => {
    const { fetchFn } = makeMockFetch([{ status: 204 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    const result = await adapter.updateEvent({
      calendarId: '/cal/personal/',
      event: makeEvent(),
      remote,
    });
    expect(result.etag).toBe('"old-etag"');
  });

  it('throws CalDAVError etag-conflict on 412', async () => {
    const { fetchFn } = makeMockFetch([{ status: 412 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    await expect(
      adapter.updateEvent({
        calendarId: '/cal/personal/',
        event: makeEvent(),
        remote,
      })
    ).rejects.toMatchObject({ code: 'etag-conflict', statusCode: 412 });
  });

  it('sends PUT without If-Match when etag is absent', async () => {
    const { fetchFn, calls } = makeMockFetch([{ status: 204 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    const remoteNoEtag = { ...remote, etag: undefined };
    await adapter.updateEvent({
      calendarId: '/cal/personal/',
      event: makeEvent(),
      remote: remoteNoEtag,
    });

    expect(
      (calls[0].init!.headers as Record<string, string>)['If-Match']
    ).toBeUndefined();
  });

  it('serializes the remote UID when the local event has no CalDAV meta', async () => {
    const { fetchFn, calls } = makeMockFetch([{ status: 204 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    const eventWithoutMeta: Event = {
      id: 'local-copy',
      title: 'Updated Title',
      start: Temporal.ZonedDateTime.from('2025-06-10T09:00:00+00:00[UTC]'),
      end: Temporal.ZonedDateTime.from('2025-06-10T10:00:00+00:00[UTC]'),
    };

    await adapter.updateEvent({
      calendarId: '/cal/personal/',
      event: eventWithoutMeta,
      remote,
    });

    expect(calls[0].init?.body as string).toContain('UID:event1@test');
  });
});

// ─── DELETE (deleteEvent) ─────────────────────────────────────────────────────

describe('deleteEvent (DELETE)', () => {
  const remote: import('../types/event').CalDAVRemoteRef = {
    calendarId: '/cal/personal/',
    uid: 'event1@test',
    href: '/cal/personal/event1.ics',
    etag: '"etag1"',
  };

  it('sends DELETE to remote.href with If-Match header', async () => {
    const { fetchFn, calls } = makeMockFetch([{ status: 204 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    await adapter.deleteEvent({ calendarId: '/cal/personal/', remote });

    expect(calls[0].url).toBe('/cal/personal/event1.ics');
    expect(calls[0].init?.method).toBe('DELETE');
    expect((calls[0].init!.headers as Record<string, string>)['If-Match']).toBe(
      '"etag1"'
    );
  });

  it('succeeds silently on 404 (already deleted)', async () => {
    const { fetchFn } = makeMockFetch([{ status: 404 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    await expect(
      adapter.deleteEvent({ calendarId: '/cal/personal/', remote })
    ).resolves.toBeUndefined();
  });

  it('throws CalDAVError etag-conflict on 412', async () => {
    const { fetchFn } = makeMockFetch([{ status: 412 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    await expect(
      adapter.deleteEvent({ calendarId: '/cal/personal/', remote })
    ).rejects.toMatchObject({ code: 'etag-conflict' });
  });

  it('sends DELETE without If-Match when etag is absent', async () => {
    const { fetchFn, calls } = makeMockFetch([{ status: 204 }]);
    const adapter = createCalDAVAdapter({
      calendarHomeUrl: '/cal/',
      fetch: fetchFn,
    });
    const remoteNoEtag = { ...remote, etag: undefined };
    await adapter.deleteEvent({
      calendarId: '/cal/personal/',
      remote: remoteNoEtag,
    });

    expect(
      (calls[0].init!.headers as Record<string, string>)['If-Match']
    ).toBeUndefined();
  });
});
