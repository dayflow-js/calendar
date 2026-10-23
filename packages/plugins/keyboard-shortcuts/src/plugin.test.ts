import { CalendarApp, ViewType } from '@dayflow/core';

/**
 * The plugin listens on `window`, which outlives any one calendar. If the
 * listener is not released with the app, every remount stacks another one and
 * the dead apps keep reacting to keys.
 */
import { createKeyboardShortcutsPlugin } from './plugin';

const makeApp = (plugin = createKeyboardShortcutsPlugin()) =>
  new CalendarApp({
    views: [],
    events: [],
    defaultView: ViewType.WEEK,
    plugins: [plugin],
  });

const keydownListeners = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.filter(([type]) => type === 'keydown').map(([, fn]) => fn);

describe('keyboard shortcuts plugin — lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('removes its window listener when the app is destroyed', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const app = makeApp();

    const [listener] = keydownListeners(add);
    expect(listener).toBeDefined();

    app.destroy();

    expect(keydownListeners(remove)).toEqual([listener]);
  });

  it('listens again after restore, with exactly one listener', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const app = makeApp();

    app.destroy();
    app.restore();

    expect(keydownListeners(add)).toHaveLength(2);
    expect(keydownListeners(remove)).toHaveLength(1);
  });

  it('attaches nothing when created disabled', () => {
    const add = vi.spyOn(window, 'addEventListener');
    makeApp(createKeyboardShortcutsPlugin({ enabled: false }));

    expect(keydownListeners(add)).toHaveLength(0);
  });
});
