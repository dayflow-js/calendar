import type { CalendarAppState, CalendarPlugin, ICalendarApp } from '@/types';

/**
 * PluginManager owns the plugin registry. Two behaviours matter to users:
 * installing the same plugin twice must not run its side effects twice, and
 * updating a plugin's config must both merge and notify, or the calendar shows
 * stale plugin UI.
 */
import { PluginManager } from '../plugins/PluginManager';

const noop = (): void => undefined;

const makeState = (): CalendarAppState =>
  ({ plugins: new Map<string, CalendarPlugin>() }) as CalendarAppState;

const makePlugin = (
  name: string,
  overrides: Partial<CalendarPlugin> = {}
): CalendarPlugin => ({
  name,
  install: vi.fn(),
  ...overrides,
});

const fakeApp = {} as ICalendarApp;

describe('PluginManager — install', () => {
  it('registers the plugin and runs its install hook', () => {
    const state = makeState();
    const manager = new PluginManager(state, vi.fn());
    const plugin = makePlugin('drag');

    manager.install(plugin, fakeApp);

    expect(state.plugins.get('drag')).toBe(plugin);
    expect(plugin.install).toHaveBeenCalledWith(fakeApp);
  });

  it('refuses a second install of the same name and warns', () => {
    // Installing twice would re-run listeners and DOM wiring. The warning is
    // the only signal a user gets, so it is part of the behaviour.
    const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
    const state = makeState();
    const manager = new PluginManager(state, vi.fn());
    const first = makePlugin('drag');
    const second = makePlugin('drag');

    manager.install(first, fakeApp);
    manager.install(second, fakeApp);

    expect(state.plugins.get('drag')).toBe(first);
    expect(second.install).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('already installed')
    );
    warn.mockRestore();
  });

  it('keeps plugins with different names side by side', () => {
    const state = makeState();
    const manager = new PluginManager(state, vi.fn());

    manager.install(makePlugin('drag'), fakeApp);
    manager.install(makePlugin('sidebar'), fakeApp);

    expect(manager.hasPlugin('drag')).toBe(true);
    expect(manager.hasPlugin('sidebar')).toBe(true);
  });
});

describe('PluginManager — lookup', () => {
  it('reports whether a plugin is installed', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    expect(manager.hasPlugin('drag')).toBe(false);

    manager.install(makePlugin('drag'), fakeApp);

    expect(manager.hasPlugin('drag')).toBe(true);
  });

  it('returns the plugin api, not the plugin itself', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    const api = { start: vi.fn() };
    manager.install(makePlugin('drag', { api }), fakeApp);

    expect(manager.getPlugin('drag')).toBe(api);
  });

  it('returns undefined for a plugin that is not installed', () => {
    const manager = new PluginManager(makeState(), vi.fn());

    expect(manager.getPlugin('nope')).toBeUndefined();
  });

  it('returns undefined when an installed plugin exposes no api', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    manager.install(makePlugin('drag'), fakeApp);

    expect(manager.getPlugin('drag')).toBeUndefined();
  });
});

describe('PluginManager — config', () => {
  it('returns an installed plugin config', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    manager.install(makePlugin('sidebar', { config: { open: true } }), fakeApp);

    expect(manager.getPluginConfig('sidebar')).toEqual({ open: true });
  });

  it('returns an empty object for an unknown plugin', () => {
    const manager = new PluginManager(makeState(), vi.fn());

    expect(manager.getPluginConfig('nope')).toEqual({});
  });

  it('returns an empty object when the plugin has no config', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    manager.install(makePlugin('drag'), fakeApp);

    expect(manager.getPluginConfig('drag')).toEqual({});
  });

  it('merges an update rather than replacing the config', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    manager.install(
      makePlugin('sidebar', { config: { open: true, width: 200 } }),
      fakeApp
    );

    manager.updatePluginConfig('sidebar', { width: 320 });

    expect(manager.getPluginConfig('sidebar')).toEqual({
      open: true,
      width: 320,
    });
  });

  it('calls the plugin updateConfig hook with just the delta', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    const updateConfig = vi.fn();
    manager.install(
      makePlugin('sidebar', { config: { open: true }, updateConfig }),
      fakeApp
    );

    manager.updatePluginConfig('sidebar', { width: 320 });

    expect(updateConfig).toHaveBeenCalledWith({ width: 320 });
  });

  it('notifies so the calendar re-renders with the new plugin state', () => {
    const notify = vi.fn();
    const manager = new PluginManager(makeState(), notify);
    manager.install(makePlugin('sidebar', { config: {} }), fakeApp);

    manager.updatePluginConfig('sidebar', { open: false });

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('does nothing — and does not notify — for an unknown plugin', () => {
    const notify = vi.fn();
    const manager = new PluginManager(makeState(), notify);

    expect(() =>
      manager.updatePluginConfig('nope', { open: false })
    ).not.toThrow();
    expect(notify).not.toHaveBeenCalled();
  });

  it('survives updating a plugin that has no updateConfig hook', () => {
    const notify = vi.fn();
    const manager = new PluginManager(makeState(), notify);
    manager.install(makePlugin('drag', { config: {} }), fakeApp);

    manager.updatePluginConfig('drag', { snap: 15 });

    expect(manager.getPluginConfig('drag')).toEqual({ snap: 15 });
    expect(notify).toHaveBeenCalledTimes(1);
  });
});

describe('PluginManager — teardown', () => {
  it('runs the cleanup a plugin returned from install', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    const cleanup = vi.fn();
    manager.install(makePlugin('keys', { install: () => cleanup }), fakeApp);

    manager.destroy();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('runs cleanups last-installed first', () => {
    // A later plugin may lean on an earlier one, so it has to let go first.
    const manager = new PluginManager(makeState(), vi.fn());
    const order: string[] = [];
    manager.install(
      makePlugin('a', { install: () => () => order.push('a') }),
      fakeApp
    );
    manager.install(
      makePlugin('b', { install: () => () => order.push('b') }),
      fakeApp
    );

    manager.destroy();

    expect(order).toEqual(['b', 'a']);
  });

  it('runs each cleanup once however often destroy is called', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    const cleanup = vi.fn();
    manager.install(makePlugin('keys', { install: () => cleanup }), fakeApp);

    manager.destroy();
    manager.destroy();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('still runs the remaining cleanups when one throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(noop);
    const manager = new PluginManager(makeState(), vi.fn());
    const cleanup = vi.fn();
    manager.install(makePlugin('a', { install: () => cleanup }), fakeApp);
    manager.install(
      makePlugin('b', {
        install: () => () => {
          throw new Error('boom');
        },
      }),
      fakeApp
    );

    expect(() => manager.destroy()).not.toThrow();
    expect(cleanup).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('keeps plugins registered after destroy', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    const api = { start: vi.fn() };
    manager.install(makePlugin('keys', { api, install: () => noop }), fakeApp);

    manager.destroy();

    expect(manager.hasPlugin('keys')).toBe(true);
    expect(manager.getPlugin('keys')).toBe(api);
  });
});

describe('PluginManager — restore', () => {
  it('re-installs a plugin that was torn down, and can tear it down again', () => {
    // React StrictMode replays effects on the same app: cleanup, then setup.
    const manager = new PluginManager(makeState(), vi.fn());
    const cleanup = vi.fn();
    const install = vi.fn(() => cleanup);
    manager.install(makePlugin('keys', { install }), fakeApp);

    manager.destroy();
    manager.restore(fakeApp);

    expect(install).toHaveBeenCalledTimes(2);

    manager.destroy();

    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('does not re-install a plugin that has no cleanup', () => {
    // It was never torn down, so a second install would double its effects.
    const manager = new PluginManager(makeState(), vi.fn());
    const plugin = makePlugin('legacy');
    manager.install(plugin, fakeApp);

    manager.destroy();
    manager.restore(fakeApp);

    expect(plugin.install).toHaveBeenCalledTimes(1);
  });

  it('does nothing when nothing was destroyed', () => {
    const manager = new PluginManager(makeState(), vi.fn());
    const install = vi.fn(() => noop);
    manager.install(makePlugin('keys', { install }), fakeApp);

    manager.restore(fakeApp);

    expect(install).toHaveBeenCalledTimes(1);
  });
});
