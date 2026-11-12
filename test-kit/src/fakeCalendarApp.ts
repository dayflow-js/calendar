import type { FakePlugin } from './fakeApp';
/**
 * Stand-ins for the pieces `useCalendarApp` reaches for: the app class itself
 * and the config-normalisation helpers around it.
 *
 * What matters here is instance identity and subscription bookkeeping — a hook
 * that quietly rebuilds the app throws away all calendar state — so the class
 * counts its instances and exposes its listener set.
 */
import {
  emptyArray,
  emptyObject,
  noop,
  returnsNull,
  returnsTrue,
} from './noop';

export const calendarAppInstances: FakeCalendarApp[] = [];

export const syncCalls: Array<{
  app: FakeCalendarApp;
  config: Record<string, unknown>;
}> = [];

export class FakeCalendarApp {
  static created = 0;

  readonly instanceId: number;
  readonly config: Record<string, unknown>;
  readonly listeners = new Set<(app: FakeCalendarApp) => void>();

  state: {
    plugins: FakePlugin[];
    currentView: string;
    currentDate: unknown;
  };

  updatedConfigs: Record<string, unknown>[] = [];
  overrides: string[] = [];
  /** Mirrors the real app: destroy() tears plugins down, restore() re-arms. */
  destroyed = false;
  destroyCount = 0;

  constructor(config: Record<string, unknown>) {
    FakeCalendarApp.created += 1;
    this.instanceId = FakeCalendarApp.created;
    this.config = config;
    this.state = {
      plugins: (config['plugins'] as FakePlugin[]) ?? [],
      currentView: 'week',
      currentDate: null,
    };
    calendarAppInstances.push(this);
  }

  subscribe = (listener: (app: FakeCalendarApp) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  notify = (): void => {
    this.listeners.forEach(fn => fn(this));
  };

  setOverrides = (names: string[]): void => {
    this.overrides = names;
  };

  updateConfig = (config: Record<string, unknown>): void => {
    this.updatedConfigs.push(config);
  };

  destroy = (): void => {
    this.destroyed = true;
    this.destroyCount += 1;
  };

  restore = (): void => {
    this.destroyed = false;
  };

  // The rest of the surface exists only so the hook's return object builds.
  getEvents = emptyArray;
  getAllEvents = emptyArray;
  getCalendars = emptyArray;
  applyEventsChanges = noop;
  changeView = noop;
  setCurrentDate = noop;
  addEvent = noop;
  updateEvent = noop;
  deleteEvent = noop;
  undo = noop;
  redo = noop;
  goToToday = noop;
  goToPrevious = noop;
  goToNext = noop;
  selectDate = noop;
  createCalendar = noop;
  mergeCalendars = noop;
  setCalendarVisibility = noop;
  setAllCalendarsVisibility = noop;
  highlightEvent = noop;
  setVisibleMonth = noop;
  emitVisibleRange = noop;
  getVisibleMonth = returnsNull;
  canMutateFromUI = returnsTrue;
  getReadOnlyConfig = emptyObject;
}

export function resetCalendarAppFake(): void {
  FakeCalendarApp.created = 0;
  calendarAppInstances.length = 0;
  syncCalls.length = 0;
}

export function createNormalizedCalendarAppConfigGetter(
  getConfig: () => Record<string, unknown>
): () => Record<string, unknown> {
  return () => ({ ...getConfig() });
}

export function createConfigSyncSnapshot(
  config: Record<string, unknown>
): Record<string, unknown> {
  return { ...config };
}

export function syncCalendarAppConfig(
  app: FakeCalendarApp,
  _snapshot: Record<string, unknown>,
  config: Record<string, unknown>
): Record<string, unknown> {
  syncCalls.push({ app, config });
  return { ...config };
}
