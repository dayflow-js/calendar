/**
 * CalDAVStorage implementations for @dayflow/caldav.
 *
 * Two implementations are provided:
 *   - MemoryStorage    — zero deps, data lost on page reload. Good for development.
 *   - LocalStorage     — persists across reloads. Good for single-user browser apps.
 *
 * For production (multi-user, server-rendered, or offline-capable apps) use:
 *   - IndexedDB storage (e.g. idb or Dexie.js)
 *   - Server-side session storage
 *   - A dedicated sync-state database table
 *
 * None of these implementations store credentials — only sync bookkeeping
 * (etags, sync tokens, event state). Credentials live exclusively in the
 * backend proxy.
 */

import type { CalDAVEventSyncState, CalDAVStorage } from '@dayflow/caldav';

// ─── In-memory storage ────────────────────────────────────────────────────────

export function createMemoryStorage(): CalDAVStorage {
  const syncTokens = new Map<string, string>();
  const ctags = new Map<string, string>();
  const etags = new Map<string, string>();
  const eventStates = new Map<string, CalDAVEventSyncState>();

  return {
    getSyncToken: id => Promise.resolve(syncTokens.get(id) ?? null),
    setSyncToken: (id, token) => {
      syncTokens.set(id, token);
      return Promise.resolve();
    },

    getCtag: id => Promise.resolve(ctags.get(id) ?? null),
    setCtag: (id, ctag) => {
      ctags.set(id, ctag);
      return Promise.resolve();
    },

    getEtag: href => Promise.resolve(etags.get(href) ?? null),
    setEtag: (href, etag) => {
      etags.set(href, etag);
      return Promise.resolve();
    },
    deleteEtag: href => {
      etags.delete(href);
      return Promise.resolve();
    },

    getEventState: id => Promise.resolve(eventStates.get(id) ?? null),
    setEventState: (id, state) => {
      eventStates.set(id, state);
      return Promise.resolve();
    },
    deleteEventState: id => {
      eventStates.delete(id);
      return Promise.resolve();
    },

    clearCalendar: calendarId => {
      const hrefs = [];
      for (const [key, state] of eventStates) {
        if (state.calendarId === calendarId) {
          hrefs.push(state.href);
          eventStates.delete(key);
        }
      }
      hrefs.forEach(href => etags.delete(href));
      // Etags and tokens are keyed by href/calendarId — remove matching entries
      for (const key of syncTokens.keys()) {
        if (key === calendarId) syncTokens.delete(key);
      }
      for (const key of ctags.keys()) {
        if (key === calendarId) ctags.delete(key);
      }
      return Promise.resolve();
    },
  };
}

// ─── localStorage storage ────────────────────────────────────────────────────

const LS_PREFIX = '@dayflow/caldav:';

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(LS_PREFIX + key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(LS_PREFIX + key, value);
  } catch {
    // localStorage quota exceeded — silently degrade
  }
}

function lsDel(key: string): void {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    // ignore
  }
}

function lsKeys(): string[] {
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(LS_PREFIX))
      .map(k => k.slice(LS_PREFIX.length));
  } catch {
    return [];
  }
}

export function createLocalStorage(): CalDAVStorage {
  return {
    getSyncToken: id => Promise.resolve(lsGet(`st:${id}`)),
    setSyncToken: (id, token) => {
      lsSet(`st:${id}`, token);
      return Promise.resolve();
    },

    getCtag: id => Promise.resolve(lsGet(`ct:${id}`)),
    setCtag: (id, ctag) => {
      lsSet(`ct:${id}`, ctag);
      return Promise.resolve();
    },

    getEtag: href => Promise.resolve(lsGet(`et:${href}`)),
    setEtag: (href, etag) => {
      lsSet(`et:${href}`, etag);
      return Promise.resolve();
    },
    deleteEtag: href => {
      lsDel(`et:${href}`);
      return Promise.resolve();
    },

    getEventState: id => {
      const raw = lsGet(`es:${id}`);
      if (!raw) return Promise.resolve(null);
      try {
        return Promise.resolve(JSON.parse(raw) as CalDAVEventSyncState);
      } catch {
        return Promise.resolve(null);
      }
    },
    setEventState: (id, state) => {
      lsSet(`es:${id}`, JSON.stringify(state));
      return Promise.resolve();
    },
    deleteEventState: id => {
      lsDel(`es:${id}`);
      return Promise.resolve();
    },

    clearCalendar: calendarId => {
      const hrefs: string[] = [];
      const toDelete = lsKeys().filter(k => {
        if (k.startsWith('st:') || k.startsWith('ct:'))
          return k.slice(3) === calendarId;
        if (k.startsWith('es:')) {
          const raw = lsGet(k);
          if (!raw) return false;
          try {
            const state = JSON.parse(raw) as CalDAVEventSyncState;
            if (state.calendarId !== calendarId) return false;
            hrefs.push(state.href);
            return true;
          } catch {
            return false;
          }
        }
        return false;
      });
      hrefs.forEach(href => lsDel(`et:${href}`));
      toDelete.forEach(lsDel);
      return Promise.resolve();
    },
  };
}
