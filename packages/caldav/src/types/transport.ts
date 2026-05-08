/**
 * CalDAV transport interface.
 *
 * The transport is the only place where authentication credentials, tokens,
 * or cookies are involved. DayFlow never sees or stores authentication material.
 *
 * Applications inject a transport that adds the required auth headers before
 * forwarding requests to the CalDAV server, typically via a backend proxy.
 *
 * Example (backend proxy):
 *
 *   const transport: CalDAVTransport = {
 *     fetch: (url, init) =>
 *       fetch('/api/caldav-proxy', {
 *         method: 'POST',
 *         body: JSON.stringify({ url, init }),
 *       }),
 *   };
 */
export interface CalDAVTransport {
  /**
   * Execute a CalDAV HTTP request.
   * The implementation controls auth, retries, and error mapping.
   */
  fetch(url: string, init?: RequestInit): Promise<Response>;
}
