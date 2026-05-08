/**
 * Headless, adapter-first Google Calendar sync engine for DayFlow.
 *
 * This package provides:
 * - Type-safe Google Calendar API types
 * - Calendar and event mappers (Google Calendar ↔ DayFlow)
 * - Transport-agnostic sync engine (GoogleSync)
 * - DayFlow binding with write-back, sync-token support, and status reporting
 * - Default HTTP adapter (createGoogleSyncAdapter)
 *
 * What this package does NOT provide:
 * - OAuth flows or token management
 * - Credential storage
 * - Hosted sync service
 *
 * Authentication and transport are fully controlled by the application.
 *
 * Quick start:
 * ```ts
 * const adapter = createGoogleSyncAdapter({ fetch: authenticatedFetch });
 * const sync = createGoogleSync(adapter);
 * const controller = attachGoogleSyncToDayFlow(app, sync);
 * await controller.start();
 * ```
 */

// Public types
export type {
  GoogleCalendarEvent,
  GoogleCalendarList,
  GoogleCalendarListEntry,
  GoogleDateTime,
  GoogleEventInput,
  GoogleEventList,
  GoogleListEventsOptions,
} from './types/api';

export type { GoogleEventMeta } from './types/meta';
export { getGoogleMeta } from './types/meta';

export type {
  GoogleSyncAdapter,
  GoogleSyncStatus,
  GoogleDayFlowOptions,
} from './types/adapter';

// Mappers
export {
  mapGoogleEventToDayFlow,
  mapDayFlowEventToGoogle,
  mapGoogleCalendarToDayFlow,
} from './mapper';

// Sync engine + DayFlow binding
export {
  createGoogleSync,
  type GoogleSync,
  type GoogleSyncRange,
  type GoogleSyncResult,
} from './sync/createGoogleSync';

export {
  attachGoogleSyncToDayFlow,
  type GoogleDayFlowController,
} from './sync/attachGoogleSyncToDayFlow';

export {
  createGoogleSyncAdapter,
  GoogleSyncError,
  type GoogleSyncAdapterOptions,
} from './sync/createGoogleSyncAdapter';
