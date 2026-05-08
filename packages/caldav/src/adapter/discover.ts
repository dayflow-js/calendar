import { CalDAVError } from './errors';
import { normalizeXml, getFirstText } from './xml';

const CURRENT_USER_PRINCIPAL_BODY = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:current-user-principal/>
  </D:prop>
</D:propfind>`;

const CALENDAR_HOME_SET_BODY = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <C:calendar-home-set/>
  </D:prop>
</D:propfind>`;

function resolveHref(base: string, href: string): string {
  // If href is already absolute, use it directly
  if (/^https?:\/\//i.test(href)) return href;
  const collectionBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(href, collectionBase).toString();
}

/**
 * Discover the CalDAV calendar home collection URL for the authenticated user.
 *
 * Performs a two-step PROPFIND:
 *   1. Fetch `current-user-principal` from the server root
 *   2. Fetch `calendar-home-set` from the principal URL
 *
 * Works with any RFC 4791 / RFC 5397 compliant CalDAV server:
 *   - iCloud:    discoverCalendarHome('https://caldav.icloud.com/', fetch)
 *   - Nextcloud: discoverCalendarHome('https://nextcloud.example.com/remote.php/dav/', fetch)
 *   - Radicale:  discoverCalendarHome('https://radicale.example.com/', fetch)
 *
 * The `fetch` function should inject auth credentials (the discovery requests
 * require authentication, just like other CalDAV requests).
 */
export async function discoverCalendarHome(
  serverUrl: string,
  fetch: (url: string, init?: RequestInit) => Promise<Response>
): Promise<string> {
  const propfindInit: RequestInit = {
    method: 'PROPFIND',
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '0',
    },
  };

  // Step 1: find current-user-principal
  const principalResponse = await fetch(serverUrl, {
    ...propfindInit,
    body: CURRENT_USER_PRINCIPAL_BODY,
  });

  if (!principalResponse.ok && principalResponse.status !== 207) {
    throw new CalDAVError(
      'server-error',
      `Failed to discover principal: ${principalResponse.status}`,
      principalResponse.status
    );
  }

  const principalXml = normalizeXml(await principalResponse.text());
  const principalHref = getFirstText(principalXml, 'current-user-principal')
    ?.match(/<href[^>]*>([^<]+)<\/href>/i)?.[1]
    ?.trim();

  if (!principalHref) {
    throw new CalDAVError(
      'server-error',
      'current-user-principal not found in PROPFIND response'
    );
  }

  const principalUrl = resolveHref(serverUrl, principalHref);

  // Step 2: find calendar-home-set
  const homeResponse = await fetch(principalUrl, {
    ...propfindInit,
    body: CALENDAR_HOME_SET_BODY,
  });

  if (!homeResponse.ok && homeResponse.status !== 207) {
    throw new CalDAVError(
      'server-error',
      `Failed to discover calendar home: ${homeResponse.status}`,
      homeResponse.status
    );
  }

  const homeXml = normalizeXml(await homeResponse.text());
  const homeHref = getFirstText(homeXml, 'calendar-home-set')
    ?.match(/<href[^>]*>([^<]+)<\/href>/i)?.[1]
    ?.trim();

  if (!homeHref) {
    throw new CalDAVError(
      'server-error',
      'calendar-home-set not found in PROPFIND response'
    );
  }

  return resolveHref(principalUrl, homeHref);
}
