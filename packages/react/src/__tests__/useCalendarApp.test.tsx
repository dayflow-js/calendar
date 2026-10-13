import {
  calendarAppInstances,
  resetCalendarAppFake,
  syncCalls,
} from '@test-kit';
import type { FakeCalendarApp } from '@test-kit';
/**
 * `useCalendarApp` owns the CalendarApp instance. The contract users depend on
 * is that the instance is stable across renders — recreating it silently would
 * throw away all calendar state — and that config edits are synced, not
 * reconstructed.
 */
import { renderHook, act } from '@testing-library/react';
import { StrictMode } from 'react';

import { useCalendarApp } from '../hooks/useCalendarApp';

beforeEach(() => {
  resetCalendarAppFake();
});

describe('useCalendarApp', () => {
  it('creates exactly one app and keeps it across re-renders', () => {
    const { result, rerender } = renderHook(
      ({ views }) => useCalendarApp({ views } as never),
      { initialProps: { views: ['week'] } }
    );

    const first = result.current.app;
    rerender({ views: ['week'] });
    rerender({ views: ['month'] });

    expect(calendarAppInstances).toHaveLength(1);
    expect(result.current.app).toBe(first);
  });

  it('recreates the app when the version changes', () => {
    // `version` is the escape hatch for changes an app cannot absorb live —
    // swapping plugins, for instance.
    const { result, rerender } = renderHook(
      ({ version }) => useCalendarApp({ views: ['week'] } as never, version),
      { initialProps: { version: 1 } }
    );

    const first = result.current.app;
    rerender({ version: 2 });

    expect(calendarAppInstances).toHaveLength(2);
    expect(result.current.app).not.toBe(first);
  });

  it('syncs config changes onto the existing app instead of rebuilding it', () => {
    const { rerender } = renderHook(
      ({ locale }) => useCalendarApp({ views: ['week'], locale } as never),
      { initialProps: { locale: 'en' } }
    );

    rerender({ locale: 'zh' });

    expect(calendarAppInstances).toHaveLength(1);
    expect(syncCalls.at(-1)?.config).toMatchObject({ locale: 'zh' });
  });

  it('re-renders when the app notifies a state change', () => {
    const { result } = renderHook(() =>
      useCalendarApp({ views: ['week'] } as never)
    );

    const app = result.current.app as unknown as FakeCalendarApp;
    expect(app.listeners.size).toBe(1);

    let renderedView = result.current.currentView;
    act(() => {
      app.state.currentView = 'month';
      app.notify();
    });
    renderedView = result.current.currentView;

    expect(renderedView).toBe('month');
  });

  it('unsubscribes from the app on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useCalendarApp({ views: ['week'] } as never)
    );

    const app = result.current.app as unknown as FakeCalendarApp;
    expect(app.listeners.size).toBe(1);

    unmount();

    expect(app.listeners.size).toBe(0);
  });

  it('moves the subscription to the new app when version changes', () => {
    const { result, rerender } = renderHook(
      ({ version }) => useCalendarApp({ views: ['week'] } as never, version),
      { initialProps: { version: 1 } }
    );

    const first = result.current.app as unknown as FakeCalendarApp;
    rerender({ version: 2 });
    const second = result.current.app as unknown as FakeCalendarApp;

    expect(first.listeners.size).toBe(0);
    expect(second.listeners.size).toBe(1);
  });

  it('destroys the app on unmount so plugins release global listeners', () => {
    const { result, unmount } = renderHook(() =>
      useCalendarApp({ views: ['week'] } as never)
    );
    const app = result.current.app as unknown as FakeCalendarApp;

    unmount();

    expect(app.destroyed).toBe(true);
  });

  it('destroys the old app when version replaces it', () => {
    const { result, rerender } = renderHook(
      ({ version }) => useCalendarApp({ views: ['week'] } as never, version),
      { initialProps: { version: 1 } }
    );
    const first = result.current.app as unknown as FakeCalendarApp;

    rerender({ version: 2 });
    const second = result.current.app as unknown as FakeCalendarApp;

    expect(first.destroyed).toBe(true);
    expect(second.destroyed).toBe(false);
  });

  it('leaves the app live after a StrictMode effect replay', () => {
    // StrictMode runs cleanup then setup on the same app. Without the restore
    // the calendar would stay mounted with its plugins torn down.
    const { result } = renderHook(
      () => useCalendarApp({ views: ['week'] } as never),
      { wrapper: StrictMode }
    );
    const app = result.current.app as unknown as FakeCalendarApp;

    expect(app.destroyCount).toBe(1);
    expect(app.destroyed).toBe(false);
  });
});
