import {
  calendarAppInstances,
  resetCalendarAppFake,
  syncCalls,
} from '@test-kit';
/**
 * `useCalendarApp` owns the app: it has to keep it in step with reactive
 * config, surface app state to templates, and destroy it with the component.
 */
import { render, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { describe, it, expect, beforeEach } from 'vitest';

import HookHost from './fixtures/HookHost.svelte';

beforeEach(() => {
  resetCalendarAppFake();
});

describe('useCalendarApp (Svelte)', () => {
  it('creates one app and keeps it when the config changes', async () => {
    const { rerender } = render(HookHost, { props: { locale: 'en' } });

    await rerender({ locale: 'zh' });

    expect(calendarAppInstances).toHaveLength(1);
  });

  it('syncs a changed config onto the app', async () => {
    const { rerender } = render(HookHost, { props: { locale: 'en' } });

    await rerender({ locale: 'zh' });

    await waitFor(() => {
      expect(syncCalls.at(-1)?.config).toMatchObject({ locale: 'zh' });
    });
  });

  it('re-renders templates when the app notifies a state change', () => {
    const { getByTestId } = render(HookHost);
    const [app] = calendarAppInstances;
    expect(getByTestId('view').textContent).toBe('week');

    app.state.currentView = 'month';
    app.notify();
    flushSync();

    expect(getByTestId('view').textContent).toBe('month');
  });

  it('unsubscribes and destroys the app with the component', () => {
    const { unmount } = render(HookHost);
    const [app] = calendarAppInstances;

    unmount();

    expect(app.listeners.size).toBe(0);
    expect(app.destroyed).toBe(true);
  });
});
