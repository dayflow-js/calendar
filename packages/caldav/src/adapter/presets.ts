import type { CalDAVAdapterOptions } from './createCalDAVAdapter';

/**
 * Provider preset helpers.
 *
 * These are thin configuration helpers, not separate adapters.
 * Use them with `createCalDAVAdapter`:
 *
 *   const adapter = createCalDAVAdapter({
 *     ...nextcloudConfig('https://nextcloud.example.com', 'alice'),
 *     fetch: proxiedFetch,
 *   });
 */

// ─── iCloud ──────────────────────────────────────────────────────────────────

/**
 * iCloud CalDAV server URL. Use with `discoverCalendarHome()` to find
 * the actual calendar home URL for the authenticated user.
 *
 * Authentication requires an app-specific password, not the Apple ID password.
 * Generate one at: https://appleid.apple.com/account/manage → App-Specific Passwords
 */
export const ICLOUD_CALDAV_SERVER = 'https://caldav.icloud.com/';

/**
 * iCloud notes:
 * - Calendar home URL must be discovered via `discoverCalendarHome(ICLOUD_CALDAV_SERVER, fetch)`
 * - iCloud uses 8-digit RGBA hex colors (#RRGGBBAA) — alpha is stripped automatically
 * - iCloud returns standard ETag headers; conditional writes (If-Match) work correctly
 * - Recurring events (RRULE) are common in iCloud calendars; they are read-only in MVP
 * - All-day events use VALUE=DATE format (standard)
 * - Timezone-aware events use TZID parameter (standard)
 * - iCloud does not support CORS; a backend proxy is required
 */

// ─── Nextcloud ────────────────────────────────────────────────────────────────

/**
 * Return CalDAVAdapterOptions base config for a Nextcloud server.
 *
 * @param host     Nextcloud base URL, e.g. https://nextcloud.example.com
 * @param username Nextcloud username (not email)
 *
 * Use an app password (Settings → Security → App passwords), not your account password.
 */
export function nextcloudConfig(
  host: string,
  username: string
): Pick<CalDAVAdapterOptions, 'calendarHomeUrl'> {
  const base = host.replace(/\/$/, '');
  return {
    calendarHomeUrl: `${base}/remote.php/dav/calendars/${encodeURIComponent(username)}/`,
  };
}

/**
 * Nextcloud notes:
 * - Calendar colors are 8-digit RGBA (#RRGGBBAA) — alpha stripped automatically
 * - `current-user-privilege-set` is returned correctly
 * - Supports sync-collection REPORT (RFC 6578) for incremental sync
 * - Does not support CORS; use a backend proxy
 */

// ─── Radicale ────────────────────────────────────────────────────────────────

/**
 * Return CalDAVAdapterOptions base config for a Radicale server.
 *
 * @param host     Radicale base URL, e.g. https://radicale.example.com
 * @param username Radicale username
 */
export function radicaleConfig(
  host: string,
  username: string
): Pick<CalDAVAdapterOptions, 'calendarHomeUrl'> {
  const base = host.replace(/\/$/, '');
  return {
    calendarHomeUrl: `${base}/${encodeURIComponent(username)}/`,
  };
}

/**
 * Radicale notes:
 * - `current-user-privilege-set` is typically absent → adapter defaults to read-only
 *   Override by setting `readOnly: false` on the CalendarType after discovery if you
 *   know the user has write access
 * - Versions < 3.x may not support calendar-query REPORT; use 3.x+
 * - Sync-collection REPORT support varies by version
 * - CORS support varies; a backend proxy is recommended
 */

// ─── Fastmail ────────────────────────────────────────────────────────────────

/**
 * Return CalDAVAdapterOptions base config for Fastmail.
 *
 * @param host     Fastmail CalDAV base URL (typically https://caldav.fastmail.com/dav)
 * @param username Fastmail email address
 */
export function fastmailConfig(
  host: string,
  username: string
): Pick<CalDAVAdapterOptions, 'calendarHomeUrl'> {
  const base = host.replace(/\/$/, '');
  return {
    calendarHomeUrl: `${base}/principals/user/${encodeURIComponent(username)}/`,
  };
}
