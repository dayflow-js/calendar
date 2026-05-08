# @dayflow/google-sync

Headless, adapter-first Google Calendar sync infrastructure for DayFlow.

This package does not provide OAuth UI, token management, credential storage, or a hosted sync service. Applications provide an authenticated transport, usually through a backend proxy.

## Quick Start

```ts
import {
  attachGoogleSyncToDayFlow,
  createGoogleSync,
  createGoogleSyncAdapter,
} from '@dayflow/google-sync';

const adapter = createGoogleSyncAdapter({
  baseUrl: '/api/google-calendar',
  fetch,
});

const sync = createGoogleSync(adapter);

const controller = attachGoogleSyncToDayFlow(calendar.app, sync);

await controller.start();
```

## Auth Boundary

`@dayflow/google-sync` never asks for OAuth tokens directly. The injected `fetch` function is responsible for authentication.

Recommended browser architecture:

```txt
Browser
  -> /api/google-calendar
    -> backend injects OAuth access token
      -> Google Calendar API
```

The package only handles mapping, sync orchestration, optimistic write conflicts, and DayFlow attachment.

## Current Limits

- Recurring event writes are blocked by the DayFlow attachment layer.
- Google `syncToken` is kept in the attachment controller memory for now.
- Full backend proxy example is deferred.
