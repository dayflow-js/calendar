# CalDAV Proxy Example

A minimal backend proxy that enables `@dayflow/caldav` to talk to a CalDAV server from the browser securely — without ever exposing credentials to the frontend.

## Why a proxy is necessary

Two reasons make a backend proxy mandatory for browser-based CalDAV:

### 1. CORS

CalDAV servers (Nextcloud, Radicale, iCloud) do not serve CORS headers.
Browsers block cross-origin HTTP requests without them. A proxy running
on the same origin as the frontend can add CORS headers and forward requests
to the CalDAV server.

### 2. Credential security

Credentials (usernames, passwords, OAuth tokens) must never appear in
browser code, network tabs, or frontend bundles. The proxy is the only process
that knows the credentials. `@dayflow/caldav` never asks for them — it
only receives a `fetch` function and calls it.

```
Browser (DayFlow + @dayflow/caldav)
  → POST /api/caldav { url, init }   (no auth)
      ↓
Backend proxy (proxy.mjs)
  → PROPFIND https://nextcloud.example.com/dav/...
    + Authorization: Basic ...        (credentials injected here)
      ↓
CalDAV server
```

## Files

| File         | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `proxy.mjs`  | Minimal Node.js CalDAV proxy (no framework)             |
| `client.ts`  | Frontend integration with `@dayflow/caldav`             |
| `storage.ts` | `CalDAVStorage` implementations (memory + localStorage) |

## Quick start

### 1. Set environment variables

```sh
export CALDAV_BASE_URL="https://nextcloud.example.com/remote.php/dav"
export CALDAV_USERNAME="alice"
export CALDAV_PASSWORD="app-token-or-password"
export FRONTEND_ORIGIN="http://localhost:5173"  # your frontend dev server
```

### 2. Start the proxy

```sh
node proxy.mjs
# CalDAV proxy listening on http://localhost:3001/api/caldav
```

### 3. Use in your frontend

```ts
import { useCalendarApp } from '@dayflow/react';
import { startCalDAVSync } from './client';

function CalendarPage() {
  const { app, ...rest } = useCalendarApp({ views, plugins });

  useEffect(() => {
    const controller = startCalDAVSync(app);
    controller.start();
    return () => controller.stop();
  }, [app]);

  return <DayFlowCalendar {...rest} />;
}
```

## Provider configuration

### Nextcloud

```
CALDAV_BASE_URL=https://nextcloud.example.com/remote.php/dav
```

Calendar home URL in `client.ts`:

```ts
const CALENDAR_HOME_URL = '/calendars/alice/';
```

Do not include `/remote.php/dav` twice. The proxy resolves the frontend path
relative to `CALDAV_BASE_URL`.

Notes:

- Use an **app password** (Settings → Security → App passwords), not your account password
- Colors are returned as 8-digit RGBA hex (`#3b82f6FF`) — the alpha is stripped automatically
- `current-user-privilege-set` is returned correctly — read-only calendars are detected

Full discovery flow (optional — find calendar home automatically):

```sh
curl -u alice:app-token \
  -X PROPFIND \
  -H "Depth: 0" \
  -H "Content-Type: application/xml" \
  https://nextcloud.example.com/remote.php/dav/principals/users/alice/ \
  --data '<?xml version="1.0"?><D:propfind xmlns:D="DAV:"><D:prop><C:calendar-home-set xmlns:C="urn:ietf:params:xml:ns:caldav"/></D:prop></D:propfind>'
```

### Radicale

```
CALDAV_BASE_URL=https://radicale.example.com
```

Calendar home URL in `client.ts`:

```ts
const CALENDAR_HOME_URL = '/alice/';
```

Notes:

- Radicale may omit `current-user-privilege-set` — the adapter defaults to **read-only** in that case
- To allow writes, explicitly set `readOnly: false` in the calendar returned by `listCalendars`, or configure Radicale to return privilege sets
- Radicale versions prior to 3.x may not support `calendar-query` REPORT correctly; use version 3.x or later

### iCloud

iCloud CalDAV requires Apple ID authentication and is not directly accessible from browsers due to strict CORS policies. The proxy pattern still applies, but you must use an app-specific password:

```
CALDAV_BASE_URL=https://caldav.icloud.com
CALDAV_USERNAME=alice@icloud.com
CALDAV_PASSWORD=xxxx-xxxx-xxxx-xxxx   # app-specific password from appleid.apple.com
```

Calendar home URL:

```ts
// Discover via PROPFIND on the principal URL first
const CALENDAR_HOME_URL = '/alice_abc123/calendars/';
```

Note: iCloud CalDAV is subject to Apple's terms of service. Use only for accounts you own.

### Fastmail

```
CALDAV_BASE_URL=https://caldav.fastmail.com/dav
CALDAV_USERNAME=alice@fastmail.com
CALDAV_PASSWORD=your-fastmail-password
```

Calendar home URL:

```ts
const CALENDAR_HOME_URL = '/dav/principals/user/alice@fastmail.com/';
```

## Extending the proxy

### Token-based auth (OAuth / Bearer)

Replace the Basic auth header with a Bearer token:

```js
// In proxy.mjs, replace BASIC_AUTH with:
const BEARER_TOKEN = process.env.CALDAV_BEARER_TOKEN;
// And in upstreamHeaders:
Authorization: `Bearer ${BEARER_TOKEN}`;
```

For OAuth, the proxy can hold a refresh token and exchange it for an access token before each request.

### Framework integration

The proxy logic is framework-agnostic. To integrate into an existing backend:

```js
// Express
app.post('/api/caldav', express.json(), async (req, res) => {
  const { url, init } = req.body;
  const upstream = await fetch(`${CALDAV_BASE_URL}${url}`, {
    method: init.method,
    headers: { ...init.headers, Authorization: BASIC_AUTH },
    body: init.body,
  });
  res.status(upstream.status);
  res.set('ETag', upstream.headers.get('ETag'));
  res.send(Buffer.from(await upstream.arrayBuffer()));
});

// Hono / Bun / Deno — similar pattern, adapt to your runtime's Request/Response API
```

### Per-user credentials

For multi-user applications where each user has their own CalDAV account,
read credentials from the session rather than environment variables:

```js
// Pseudocode
const { username, password } = req.session.caldavCredentials;
const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
```

Credentials should be stored encrypted in the session store, not in plain text.

## Security considerations

- **Never** pass credentials in the URL query string — they appear in server logs
- **Never** return credentials in proxy responses — the browser should not see them
- **Always** validate the `url` parameter to prevent SSRF (Server-Side Request Forgery). The example proxy only accepts relative CalDAV paths under `CALDAV_BASE_URL` and rejects absolute URLs:

```js
// Only allow paths under the CalDAV base
const base = new URL(
  CALDAV_BASE_URL.endsWith('/') ? CALDAV_BASE_URL : `${CALDAV_BASE_URL}/`
);
const target = new URL(`.${url}`, base);
if (!target.pathname.startsWith(base.pathname)) {
  throw new Error('CalDAV URL escapes the configured base path');
}
```

- Use `FRONTEND_ORIGIN` to restrict CORS instead of `*` in production
- Rotate app passwords / tokens regularly
- Consider rate-limiting the `/api/caldav` endpoint
