import type { CalendarAppConfig } from '@/types';

/**
 * Every adapter's `useCalendarApp` runs this on each render: diff the config
 * the user passed against a snapshot, and push only what changed.
 *
 * Two failure modes to keep out. Push too much and the calendar rebuilds views
 * on every parent render. Push too little and a user's `setTheme` never lands.
 */
import {
  createConfigSyncSnapshot,
  getCallbackConfigUpdate,
  getSyncConfigUpdates,
  pickSyncableConfig,
  syncCalendarAppConfig,
} from '../configSync';

const noop = (): void => undefined;

const comparator = (): number => 0;

// `views` and `callbacks` are compared by identity, so the fixtures hold them
// stable — a fresh array per call would make every config look changed and
// quietly defeat the "nothing changed" cases below.
const VIEWS = ['week'];
const CALLBACKS = {};

const baseConfig = (overrides: Partial<CalendarAppConfig> = {}) =>
  ({
    views: VIEWS,
    calendars: [{ id: 'a', isVisible: true }],
    theme: { mode: 'light' },
    locale: 'en',
    timeZone: 'UTC',
    callbacks: CALLBACKS,
    ...overrides,
  }) as unknown as CalendarAppConfig;

describe('pickSyncableConfig', () => {
  it('keeps only the fields an existing app can absorb live', () => {
    const config = baseConfig({
      plugins: [{ name: 'drag' }],
      callbacks: { onEventClick: noop },
    } as unknown as Partial<CalendarAppConfig>);

    const picked = pickSyncableConfig(config);

    // Plugins and callbacks are handled elsewhere; leaking them in here would
    // make every render look like a change.
    expect(picked).not.toHaveProperty('plugins');
    expect(picked).not.toHaveProperty('callbacks');
    expect(picked.views).toEqual(['week']);
    expect(picked.timeZone).toBe('UTC');
  });
});

describe('createConfigSyncSnapshot', () => {
  it('splits the config into callbacks and syncable fields', () => {
    const callbacks = { onEventClick: noop };
    const snapshot = createConfigSyncSnapshot(
      baseConfig({ callbacks } as unknown as Partial<CalendarAppConfig>)
    );

    expect(snapshot.callbacks).toBe(callbacks);
    expect(snapshot.syncableConfig.locale).toBe('en');
  });
});

describe('getCallbackConfigUpdate', () => {
  it('returns null when the callbacks object is identical', () => {
    const callbacks = { onEventClick: noop };

    expect(getCallbackConfigUpdate(callbacks, callbacks)).toBeNull();
  });

  it('returns an update when the callbacks object is replaced', () => {
    const next = { onEventClick: noop };

    expect(getCallbackConfigUpdate({}, next)).toEqual({ callbacks: next });
  });

  it('compares by identity, not deeply', () => {
    // Callbacks are replaced wholesale on every render in most apps; comparing
    // deeply would be expensive and would never match anyway.
    expect(getCallbackConfigUpdate({}, {})).toEqual({ callbacks: {} });
  });
});

describe('getSyncConfigUpdates', () => {
  const snapshotOf = (config: CalendarAppConfig) => pickSyncableConfig(config);

  it('reports nothing when nothing changed', () => {
    const previous = snapshotOf(baseConfig());
    const next = snapshotOf(baseConfig());

    expect(getSyncConfigUpdates(previous, next)).toEqual({});
  });

  it('does not report calendars rebuilt into an equal array', () => {
    // The common case: a user maps state into a fresh array each render.
    const previous = snapshotOf(baseConfig());
    const next = snapshotOf(
      baseConfig({ calendars: [{ id: 'a', isVisible: true }] } as never)
    );

    expect(getSyncConfigUpdates(previous, next)).toEqual({});
  });

  it('reports calendars when their contents actually change', () => {
    const previous = snapshotOf(baseConfig());
    const next = snapshotOf(
      baseConfig({ calendars: [{ id: 'a', isVisible: false }] } as never)
    );

    expect(getSyncConfigUpdates(previous, next)).toHaveProperty('calendars');
  });

  it('reports theme changes structurally', () => {
    const previous = snapshotOf(baseConfig());
    const unchanged = snapshotOf(
      baseConfig({ theme: { mode: 'light' } } as never)
    );
    const changed = snapshotOf(
      baseConfig({ theme: { mode: 'dark' } } as never)
    );

    expect(getSyncConfigUpdates(previous, unchanged)).toEqual({});
    expect(getSyncConfigUpdates(previous, changed)).toEqual({
      theme: { mode: 'dark' },
    });
  });

  it('reports views by identity, so a new array counts as a change', () => {
    // View configs carry render functions; a fresh array means fresh views.
    const previous = snapshotOf(baseConfig());
    const next = snapshotOf(baseConfig({ views: ['week'] } as never));

    expect(getSyncConfigUpdates(previous, next)).toHaveProperty('views');
  });

  it('reports scalar flag changes', () => {
    const previous = snapshotOf(
      baseConfig({ useEventDetailPanel: true, switcherMode: 'tabs' } as never)
    );
    const next = snapshotOf(
      baseConfig({ useEventDetailPanel: false, switcherMode: 'tabs' } as never)
    );

    expect(getSyncConfigUpdates(previous, next)).toEqual({
      useEventDetailPanel: false,
    });
  });

  it('reports a timezone change', () => {
    const previous = snapshotOf(baseConfig());
    const next = snapshotOf(baseConfig({ timeZone: 'Asia/Tokyo' } as never));

    expect(getSyncConfigUpdates(previous, next)).toEqual({
      timeZone: 'Asia/Tokyo',
    });
  });

  it('reports a locale change structurally', () => {
    const previous = snapshotOf(baseConfig());
    const next = snapshotOf(baseConfig({ locale: 'zh' } as never));

    expect(getSyncConfigUpdates(previous, next)).toEqual({ locale: 'zh' });
  });

  it('reports the sort comparator by identity', () => {
    const previous = snapshotOf(
      baseConfig({ allDaySortComparator: comparator } as never)
    );
    const same = snapshotOf(
      baseConfig({ allDaySortComparator: comparator } as never)
    );
    const different = snapshotOf(
      baseConfig({ allDaySortComparator: () => 0 } as never)
    );

    expect(getSyncConfigUpdates(previous, same)).toEqual({});
    expect(getSyncConfigUpdates(previous, different)).toHaveProperty(
      'allDaySortComparator'
    );
  });

  it('collects several changes into one update', () => {
    const previous = snapshotOf(baseConfig());
    const next = snapshotOf(
      baseConfig({ locale: 'ja', timeZone: 'Asia/Tokyo' } as never)
    );

    expect(getSyncConfigUpdates(previous, next)).toEqual({
      locale: 'ja',
      timeZone: 'Asia/Tokyo',
    });
  });
});

describe('syncCalendarAppConfig', () => {
  it('leaves the app alone when nothing changed', () => {
    const app = { updateConfig: vi.fn() };
    const config = baseConfig();
    const snapshot = createConfigSyncSnapshot(config);

    syncCalendarAppConfig(app, snapshot, config);

    expect(app.updateConfig).not.toHaveBeenCalled();
  });

  it('pushes only the fields that changed', () => {
    const app = { updateConfig: vi.fn() };
    const snapshot = createConfigSyncSnapshot(baseConfig());

    syncCalendarAppConfig(app, snapshot, baseConfig({ locale: 'zh' } as never));

    expect(app.updateConfig).toHaveBeenCalledTimes(1);
    expect(app.updateConfig).toHaveBeenCalledWith({ locale: 'zh' });
  });

  it('pushes callbacks separately from the rest', () => {
    const app = { updateConfig: vi.fn() };
    const snapshot = createConfigSyncSnapshot(baseConfig());
    const nextCallbacks = { onEventClick: noop };

    syncCalendarAppConfig(
      app,
      snapshot,
      baseConfig({ callbacks: nextCallbacks, locale: 'zh' } as never)
    );

    expect(app.updateConfig).toHaveBeenCalledTimes(2);
    expect(app.updateConfig).toHaveBeenNthCalledWith(1, {
      callbacks: nextCallbacks,
    });
    expect(app.updateConfig).toHaveBeenNthCalledWith(2, { locale: 'zh' });
  });

  it('returns a snapshot that makes the next identical sync a no-op', () => {
    const app = { updateConfig: vi.fn() };
    let snapshot = createConfigSyncSnapshot(baseConfig());
    const nextConfig = baseConfig({ locale: 'zh' } as never);

    snapshot = syncCalendarAppConfig(app, snapshot, nextConfig);
    app.updateConfig.mockClear();
    syncCalendarAppConfig(app, snapshot, nextConfig);

    expect(app.updateConfig).not.toHaveBeenCalled();
  });
});

describe('task configuration sync', () => {
  it('syncs opt-in and removal of the option to an existing app', () => {
    const off = pickSyncableConfig(baseConfig());
    const on = pickSyncableConfig(baseConfig({ enableTasks: true }));
    expect(getSyncConfigUpdates(off, on)).toEqual({ enableTasks: true });
    expect(getSyncConfigUpdates(on, off)).toEqual({ enableTasks: false });
  });
});
