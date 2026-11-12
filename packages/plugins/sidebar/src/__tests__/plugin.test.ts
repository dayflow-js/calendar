import { CalendarApp, ViewType, useSidebarBridge } from '@dayflow/core';
/**
 * Core holds a single sidebar bridge for the whole page. Two calendars with
 * their own sidebar plugins must still each get their own config and their own
 * collapse state — the bridge used to serve whichever plugin installed last.
 */
import { createSidebarPlugin } from '@sidebar/plugin';
import type { SidebarPluginConfig, SidebarService } from '@sidebar/plugin';
import { act, renderHook } from '@testing-library/preact';

const makeApp = (config: SidebarPluginConfig) =>
  new CalendarApp({
    views: [],
    events: [],
    defaultView: ViewType.WEEK,
    plugins: [createSidebarPlugin(config)],
  });

describe('sidebar plugin — two calendars on one page', () => {
  it('gives each app its own width and initial collapsed state', () => {
    const first = makeApp({ width: 200, initialCollapsed: true });
    const second = makeApp({ width: 320 });

    const a = renderHook(() => useSidebarBridge(first));
    const b = renderHook(() => useSidebarBridge(second));

    expect(a.result.current.width).toBe('200px');
    expect(a.result.current.isCollapsed).toBe(true);
    expect(b.result.current.width).toBe('320px');
    expect(b.result.current.isCollapsed).toBe(false);
  });

  it('collapses only the app whose service was called', () => {
    const first = makeApp({});
    const second = makeApp({});
    const a = renderHook(() => useSidebarBridge(first));
    const b = renderHook(() => useSidebarBridge(second));

    act(() => {
      first.getPlugin<SidebarService>('sidebar')?.collapse();
    });

    expect(a.result.current.isCollapsed).toBe(true);
    expect(b.result.current.isCollapsed).toBe(false);
    expect(first.getPlugin<SidebarService>('sidebar')?.isCollapsed()).toBe(
      true
    );
    expect(second.getPlugin<SidebarService>('sidebar')?.isCollapsed()).toBe(
      false
    );
  });
});
