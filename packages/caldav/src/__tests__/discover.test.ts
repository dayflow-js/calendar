import { discoverCalendarHome } from '@caldav/adapter/discover';
import { CalDAVError } from '@caldav/adapter/errors';
import {
  ICLOUD_CALDAV_SERVER,
  fastmailConfig,
  nextcloudConfig,
  radicaleConfig,
} from '@caldav/adapter/presets';

// ─── discoverCalendarHome ─────────────────────────────────────────────────────

const PRINCIPAL_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/</D:href>
    <D:propstat>
      <D:prop>
        <D:current-user-principal>
          <D:href>/12345678901/principal/</D:href>
        </D:current-user-principal>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

const HOME_SET_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>/12345678901/principal/</D:href>
    <D:propstat>
      <D:prop>
        <C:calendar-home-set>
          <D:href>/12345678901/calendars/</D:href>
        </C:calendar-home-set>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

describe('discoverCalendarHome', () => {
  it('performs two-step PROPFIND and returns the calendar home URL', async () => {
    const calls: string[] = [];
    const mockFetch = jest
      .fn()
      .mockImplementationOnce((url: string) => {
        calls.push(url);
        return Promise.resolve(
          new Response(PRINCIPAL_RESPONSE, { status: 207 })
        );
      })
      .mockImplementationOnce((url: string) => {
        calls.push(url);
        return Promise.resolve(
          new Response(HOME_SET_RESPONSE, { status: 207 })
        );
      });

    const result = await discoverCalendarHome(
      'https://caldav.icloud.com/',
      mockFetch
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // First call: server root for current-user-principal
    expect(calls[0]).toBe('https://caldav.icloud.com/');
    // Second call: principal URL for calendar-home-set
    expect(calls[1]).toContain('/12345678901/principal/');
    // Result: resolved calendar home URL
    expect(result).toBe('https://caldav.icloud.com/12345678901/calendars/');
  });

  it('first PROPFIND sends Depth: 0 and correct body', async () => {
    const mockFetch = jest
      .fn()
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        expect((init?.headers as Record<string, string>)?.Depth).toBe('0');
        expect(init?.method).toBe('PROPFIND');
        expect(init?.body as string).toContain('current-user-principal');
        return Promise.resolve(
          new Response(PRINCIPAL_RESPONSE, { status: 207 })
        );
      })
      .mockImplementationOnce(() =>
        Promise.resolve(new Response(HOME_SET_RESPONSE, { status: 207 }))
      );

    await discoverCalendarHome('https://caldav.icloud.com/', mockFetch);
  });

  it('resolves root-relative hrefs using the server origin', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(PRINCIPAL_RESPONSE, { status: 207 }))
      .mockResolvedValueOnce(new Response(HOME_SET_RESPONSE, { status: 207 }));

    const result = await discoverCalendarHome(
      'https://caldav.icloud.com/',
      mockFetch
    );
    // Root-relative paths are resolved to the server origin
    expect(result.startsWith('https://caldav.icloud.com/')).toBe(true);
  });

  it('resolves relative hrefs against the current request URL', async () => {
    const relativePrincipal = PRINCIPAL_RESPONSE.replace(
      '/12345678901/principal/',
      'principal/'
    );
    const relativeHome = HOME_SET_RESPONSE.replace(
      '/12345678901/calendars/',
      '../calendars/'
    );
    const calls: string[] = [];
    const mockFetch = jest
      .fn()
      .mockImplementationOnce((url: string) => {
        calls.push(url);
        return Promise.resolve(
          new Response(relativePrincipal, { status: 207 })
        );
      })
      .mockImplementationOnce((url: string) => {
        calls.push(url);
        return Promise.resolve(new Response(relativeHome, { status: 207 }));
      });

    const result = await discoverCalendarHome(
      'https://example.com/dav/',
      mockFetch
    );

    expect(calls[1]).toBe('https://example.com/dav/principal/');
    expect(result).toBe('https://example.com/dav/calendars/');
  });

  it('treats serverUrl without trailing slash as a collection URL', async () => {
    const calls: string[] = [];
    const mockFetch = jest
      .fn()
      .mockImplementationOnce((url: string) => {
        calls.push(url);
        return Promise.resolve(
          new Response(
            PRINCIPAL_RESPONSE.replace('/12345678901/principal/', 'principal/'),
            { status: 207 }
          )
        );
      })
      .mockImplementationOnce((url: string) => {
        calls.push(url);
        return Promise.resolve(
          new Response(HOME_SET_RESPONSE, { status: 207 })
        );
      });

    await discoverCalendarHome('https://example.com/dav', mockFetch);

    expect(calls[1]).toBe('https://example.com/dav/principal/');
  });

  it('throws CalDAVError when principal PROPFIND returns non-207', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve(new Response('', { status: 401 }))
    );
    await expect(
      discoverCalendarHome('https://caldav.icloud.com/', mockFetch)
    ).rejects.toMatchObject({ code: 'server-error', statusCode: 401 });
  });

  it('throws CalDAVError when current-user-principal is missing', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve(
        new Response(
          `<D:multistatus xmlns:D="DAV:"><D:response><D:href>/</D:href></D:response></D:multistatus>`,
          { status: 207 }
        )
      )
    );
    await expect(
      discoverCalendarHome('https://caldav.icloud.com/', mockFetch)
    ).rejects.toMatchObject({ code: 'server-error' });
  });

  it('throws CalDAVError when calendar-home-set is missing from principal', async () => {
    const emptyHomeset = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response><D:href>/principal/</D:href><D:propstat>
    <D:prop></D:prop><D:status>HTTP/1.1 200 OK</D:status>
  </D:propstat></D:response>
</D:multistatus>`;

    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(PRINCIPAL_RESPONSE, { status: 207 }))
      .mockResolvedValueOnce(new Response(emptyHomeset, { status: 207 }));

    await expect(
      discoverCalendarHome('https://caldav.icloud.com/', mockFetch)
    ).rejects.toMatchObject({ code: 'server-error' });
  });

  it('throws CalDAVError (not a generic Error) so callers can check error.code', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve(new Response('', { status: 500 }))
    );
    const err = await discoverCalendarHome(
      'https://example.com/',
      mockFetch
    ).catch(e => e);
    expect(err).toBeInstanceOf(CalDAVError);
  });
});

// ─── Provider presets ─────────────────────────────────────────────────────────

describe('provider presets', () => {
  it('ICLOUD_CALDAV_SERVER is the correct iCloud endpoint', () => {
    expect(ICLOUD_CALDAV_SERVER).toBe('https://caldav.icloud.com/');
  });

  it('nextcloudConfig builds the correct calendar home URL', () => {
    const config = nextcloudConfig('https://nextcloud.example.com', 'alice');
    expect(config.calendarHomeUrl).toBe(
      'https://nextcloud.example.com/remote.php/dav/calendars/alice/'
    );
  });

  it('nextcloudConfig removes trailing slash from host', () => {
    const config = nextcloudConfig('https://nextcloud.example.com/', 'alice');
    expect(config.calendarHomeUrl).not.toContain('//remote');
  });

  it('nextcloudConfig URL-encodes special characters in username', () => {
    const config = nextcloudConfig(
      'https://nc.example.com',
      'alice@example.com'
    );
    expect(config.calendarHomeUrl).toContain('alice%40example.com');
  });

  it('radicaleConfig builds the correct calendar home URL', () => {
    const config = radicaleConfig('https://radicale.example.com', 'alice');
    expect(config.calendarHomeUrl).toBe('https://radicale.example.com/alice/');
  });

  it('fastmailConfig builds the correct calendar home URL', () => {
    const config = fastmailConfig(
      'https://caldav.fastmail.com/dav',
      'alice@fastmail.com'
    );
    expect(config.calendarHomeUrl).toContain('alice%40fastmail.com');
    expect(config.calendarHomeUrl).toContain('/principals/user/');
  });
});
