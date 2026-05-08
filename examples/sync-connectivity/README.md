# Sync Connectivity Example

This example lets you test whether `@dayflow/google-sync` and iCloud CalDAV can connect to real remote calendars.

Credentials stay in the local Node proxy. The browser only talks to `http://localhost:3002`.

## Start the Proxy

Google can use either a short-lived access token:

```sh
export GOOGLE_ACCESS_TOKEN="ya29..."
```

Or a refresh-token setup:

```sh
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
export GOOGLE_REFRESH_TOKEN="..."
```

iCloud requires an app-specific password from Apple ID settings:

```sh
export ICLOUD_USERNAME="you@icloud.com"
export ICLOUD_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

Then start the proxy:

```sh
node examples/sync-connectivity/proxy.mjs
```

## Start DayFlow

In another terminal:

```sh
pnpm --filter @dayflow/core dev
```

Open:

```txt
http://localhost:5529/sync-connectivity
```

## What It Tests

- Google Calendar list/events through `@dayflow/google-sync`
- Google sync attachment into `CalendarApp`
- iCloud CalDAV discovery and event loading through `@dayflow/caldav`
- iCloud sync attachment into `CalendarApp`
- Visible-range refresh from DayFlow navigation

Both providers are attached in read-only mode in this example, so connection testing does not write to your real calendars.

## Notes

- iCloud uses CalDAV and app-specific passwords.
- Google OAuth is intentionally outside the package. This proxy only demonstrates token injection.
- For production, store OAuth refresh tokens and iCloud app passwords encrypted server-side.
