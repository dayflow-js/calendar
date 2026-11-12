import {
  createFakeApp,
  createdRenderers,
  initialOverrides,
  lifecycleLog,
  resetCoreFake,
  expectUnsubscribeBeforeUnmount,
  expectNoEmptyEmitAfterMount,
  expectAdapterContract,
} from '@test-kit';
import type { FakeApp } from '@test-kit';
/**
 * Svelte adapter: components in as props, portaled out with a `use:` action.
 *
 * The lifecycle rules are shared with every other adapter (see
 * `test-kit`); the portal mechanics are Svelte-specific.
 */
import { render, waitFor } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';

import DayFlowCalendar from '../DayFlowCalendar.svelte';
import TitleBar from './fixtures/TitleBar.svelte';

beforeEach(() => {
  resetCoreFake();
});

/** onMount awaits a tick before building the renderer, so tests must too. */
const whenMounted = () =>
  waitFor(() => {
    expect(createdRenderers.length).toBeGreaterThan(0);
    expect(lifecycleLog.some(e => e.type === 'mount')).toBe(true);
  });

describe('DayFlowCalendar (Svelte) — mount', () => {
  it('renders the wrapper div and mounts a renderer', async () => {
    const app = createFakeApp();
    const { container } = render(DayFlowCalendar, {
      props: { calendar: app as never },
    });
    await whenMounted();

    expect(container.querySelector('.df-calendar-wrapper')).not.toBeNull();
    expect(createdRenderers).toHaveLength(1);
  });

  it('treats a component prop as an override', async () => {
    const app = createFakeApp();
    render(DayFlowCalendar, {
      props: { calendar: app as never, titleBarSlot: TitleBar },
    });
    await whenMounted();

    const overrides = initialOverrides(lifecycleLog);
    expect(overrides).toContain('titleBarSlot');
  });

  it('leaves slots that were not passed out of the overrides', async () => {
    const app = createFakeApp();
    render(DayFlowCalendar, {
      props: { calendar: app as never, titleBarSlot: TitleBar },
    });
    await whenMounted();

    const overrides = initialOverrides(lifecycleLog);
    expect(overrides).not.toContain('calendarHeader');
    expect(overrides).not.toContain('eventContentWeek');
  });

  it('portals the component into the placeholder the core registered', async () => {
    const app = createFakeApp();
    render(DayFlowCalendar, {
      props: { calendar: app as never, titleBarSlot: TitleBar },
    });
    await whenMounted();

    await waitFor(() => {
      const placeholder = document.querySelector('[data-slot="titleBarSlot"]');
      expect(placeholder).not.toBeNull();
      expect(placeholder?.textContent).toContain('my toolbar');
    });
  });

  it('spreads the generator args onto the component as props', async () => {
    const app = createFakeApp();
    render(DayFlowCalendar, {
      props: { calendar: app as never, titleBarSlot: TitleBar },
    });
    await whenMounted();

    await waitFor(() => {
      const el = document.querySelector('[data-testid="title-bar"]');
      // The fake registers generatorArgs { slot: <name> }; the adapter must
      // spread those onto the component rather than passing them as one blob.
      expect(el?.textContent).toBe('my toolbar:titleBarSlot');
    });
  });

  it('pushes the active overrides onto the app', async () => {
    const app = createFakeApp();
    render(DayFlowCalendar, {
      props: { calendar: app as never, titleBarSlot: TitleBar },
    });
    await whenMounted();

    await waitFor(() => {
      expect((app as FakeApp).overrides).toContain('titleBarSlot');
    });
  });
});

describe('DayFlowCalendar (Svelte) — teardown', () => {
  it('unsubscribes before unmounting the renderer', async () => {
    const app = createFakeApp();
    const { unmount } = render(DayFlowCalendar, {
      props: { calendar: app as never, titleBarSlot: TitleBar },
    });
    await whenMounted();

    unmount();

    expectUnsubscribeBeforeUnmount(lifecycleLog);
  });

  it('never hands the adapter an empty map after mount', async () => {
    const app = createFakeApp();
    const { unmount } = render(DayFlowCalendar, {
      props: { calendar: app as never, titleBarSlot: TitleBar },
    });
    await whenMounted();
    unmount();

    expectNoEmptyEmitAfterMount(lifecycleLog);
  });
});

describe('DayFlowCalendar (Svelte) — calendar prop', () => {
  it('rebuilds the renderer when the calendar prop is replaced', async () => {
    const first = createFakeApp();
    const second = createFakeApp();
    const { rerender, unmount } = render(DayFlowCalendar, {
      props: { calendar: first as never, titleBarSlot: TitleBar },
    });
    await whenMounted();

    await rerender({ calendar: second as never });

    await waitFor(() => {
      expect(createdRenderers).toHaveLength(2);
    });
    expect(lifecycleLog.filter(e => e.type === 'unmount')).toHaveLength(1);
    expect((second as FakeApp).overrides).toContain('titleBarSlot');
    expectUnsubscribeBeforeUnmount(lifecycleLog);
    unmount();
  });

  it('keeps the renderer when an unrelated prop changes', async () => {
    const app = createFakeApp();
    const { rerender } = render(DayFlowCalendar, {
      props: { calendar: app as never },
    });
    await whenMounted();

    await rerender({ calendar: app as never, collapsedSafeAreaLeft: 12 });

    expect(createdRenderers).toHaveLength(1);
  });
});

describe('Svelte adapter conformance', () => {
  it('satisfies the shared contract on mount and unmount', async () => {
    const app = createFakeApp();
    const { unmount } = render(DayFlowCalendar, {
      props: { calendar: app as never, titleBarSlot: TitleBar },
    });
    await whenMounted();
    unmount();

    expectAdapterContract(lifecycleLog);
  });
});
