import { fireEvent, renderHook, waitFor } from '@testing-library/preact';

import { calendarLocale, CalendarSystem } from '@/calendar/calendarSystem';
import { CalendarApp } from '@/core/CalendarApp';
import { createMonthView } from '@/factories/createMonthView';
import { useVirtualMonthScroll } from '@/hooks/virtualScroll/useVirtualMonthScroll';
import { CalendarRenderer } from '@/renderer/CalendarRenderer';
import { generateWeekRange } from '@/utils';

vi.mock('@/utils', async importOriginal => {
  const actual = await importOriginal<typeof import('@/utils')>();
  return { ...actual, generateWeekRange: vi.fn(actual.generateWeekRange) };
});

const weekRangeSpy = vi.mocked(generateWeekRange);

const sleep = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

type HookProps = {
  date: Date;
  system?: CalendarSystem;
  onCurrentMonthChange?: (month: string, year: number) => void;
};

/** Renders the hook the way MonthView does: a new Date object on every render. */
const renderMonthScroll = (initialProps: HookProps) =>
  renderHook(
    ({ date, system = 'gregorian', onCurrentMonthChange }: HookProps) =>
      useVirtualMonthScroll({
        currentDate: new Date(date.getTime()),
        calendarSystem: system,
        locale: calendarLocale('en-US', system),
        weekHeight: 120,
        initialWeeksToLoad: 104,
        startOfWeek: 1,
        onCurrentMonthChange,
      }),
    { initialProps }
  );

beforeEach(() => {
  weekRangeSpy.mockClear();
});

describe('useVirtualMonthScroll current date handling', () => {
  it.each(['gregorian', 'jalali'] as const)(
    'does not rebuild the week range when re-rendered with an equal date (%s)',
    system => {
      const date = new Date(2026, 4, 12);
      const { result, rerender } = renderMonthScroll({ date, system });
      const callsAfterMount = weekRangeSpy.mock.calls.length;
      const monthAfterMount = result.current.currentMonth;

      for (let i = 0; i < 20; i++) {
        rerender({ date: new Date(date.getTime()), system });
      }

      expect(weekRangeSpy.mock.calls.length).toBe(callsAfterMount);
      expect(result.current.currentMonth).toBe(monthAfterMount);
    }
  );

  it('rebuilds the week range when the date value changes', () => {
    const { rerender } = renderMonthScroll({ date: new Date(2026, 4, 12) });
    const callsAfterMount = weekRangeSpy.mock.calls.length;

    rerender({ date: new Date(2026, 4, 20) });

    expect(weekRangeSpy.mock.calls.length).toBe(callsAfterMount + 1);
    // Range is built from the first day of the date's month
    expect(weekRangeSpy.mock.lastCall?.[0]).toEqual(new Date(2026, 4, 1));
  });

  it('treats a date with a different time of day as a new value', () => {
    const { rerender } = renderMonthScroll({ date: new Date(2026, 4, 12, 9) });
    const callsAfterMount = weekRangeSpy.mock.calls.length;

    rerender({ date: new Date(2026, 4, 12, 17) });

    expect(weekRangeSpy.mock.calls.length).toBe(callsAfterMount + 1);
  });

  it('follows navigation to another month, then stays put on equal re-renders', async () => {
    const onCurrentMonthChange = vi.fn();
    const { result, rerender } = renderMonthScroll({
      date: new Date(2026, 4, 12),
      onCurrentMonthChange,
    });
    expect(result.current.currentMonth).toBe('May');

    rerender({ date: new Date(2026, 10, 3), onCurrentMonthChange });

    await waitFor(() => expect(result.current.currentMonth).toBe('November'));
    expect(result.current.currentYear).toBe(2026);
    expect(onCurrentMonthChange).toHaveBeenLastCalledWith('November', 2026);

    const notifications = onCurrentMonthChange.mock.calls.length;
    for (let i = 0; i < 10; i++) {
      rerender({ date: new Date(2026, 10, 3), onCurrentMonthChange });
    }
    expect(onCurrentMonthChange.mock.calls.length).toBe(notifications);
    expect(result.current.currentMonth).toBe('November');
  });

  it('follows navigation across a Persian year boundary', async () => {
    const onCurrentMonthChange = vi.fn();
    // 2025-02-01 = 13 Bahman 1403
    const { result, rerender } = renderMonthScroll({
      date: new Date(2025, 1, 1),
      system: 'jalali',
      onCurrentMonthChange,
    });
    expect(result.current.currentMonth).toBe('Bahman');
    expect(result.current.currentYear).toBe(1403);

    // 2025-07-01 = 10 Tir 1404
    rerender({
      date: new Date(2025, 6, 1),
      system: 'jalali',
      onCurrentMonthChange,
    });

    await waitFor(() => expect(result.current.currentMonth).toBe('Tir'));
    expect(result.current.currentYear).toBe(1404);
    expect(onCurrentMonthChange).toHaveBeenLastCalledWith('Tir', 1404);
  });

  it('switches calendar systems while the parent keeps passing new Date objects', async () => {
    const date = new Date(2025, 2, 21); // 1 Farvardin 1404
    const { result, rerender } = renderMonthScroll({
      date,
      system: 'gregorian',
    });
    expect(result.current.currentMonth).toBe('March');

    rerender({ date: new Date(date.getTime()), system: 'jalali' });
    await waitFor(() => expect(result.current.currentYear).toBe(1404));
    expect(result.current.currentMonth).toBe('Farvardin');
    const nowruz = result.current.weeksData
      .flatMap(week => week.days)
      .find(day => day.date.getTime() === date.getTime());
    expect(nowruz).toMatchObject({ year: 1404, month: 0, day: 1 });

    rerender({ date: new Date(date.getTime()), system: 'gregorian' });
    await waitFor(() => expect(result.current.currentYear).toBe(2025));
    expect(result.current.currentMonth).toBe('March');
  });
});

describe('MonthView virtual scrolling', () => {
  const originalScrollTo = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollTo'
  );

  beforeEach(() => {
    // CalendarRoot observes viewport changes; jsdom has no matchMedia or scrollTo.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }));
    // eslint-disable-next-line no-extend-native
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalScrollTo) {
      // eslint-disable-next-line no-extend-native
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollTo',
        originalScrollTo
      );
    } else {
      delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
    }
  });

  it.each(['gregorian', 'jalali'] as const)(
    'does not rebuild the week range while scrolling (%s)',
    async system => {
      const app = new CalendarApp({
        views: [createMonthView()],
        initialDate: new Date(2026, 4, 12),
        defaultView: 'month',
        calendarSystem: system,
        locale: 'en-US',
      });
      const host = document.createElement('div');
      document.body.append(host);
      const renderer = new CalendarRenderer(app);
      try {
        renderer.mount(host);
        const scroller = await waitFor(() => {
          const el = host.querySelector<HTMLElement>(
            '.df-month-view-virtual-scroller'
          );
          expect(el).not.toBeNull();
          return el!;
        });
        const callsAfterMount = weekRangeSpy.mock.calls.length;

        for (let i = 1; i <= 30; i++) {
          scroller.scrollTop = i * 40;
          fireEvent.scroll(scroller);
        }
        await sleep(50);

        expect(weekRangeSpy.mock.calls.length).toBe(callsAfterMount);
      } finally {
        renderer.unmount();
        host.remove();
      }
    }
  );

  it('rebuilds the range once when the app navigates to another month', async () => {
    const app = new CalendarApp({
      views: [createMonthView()],
      initialDate: new Date(2026, 4, 12),
      defaultView: 'month',
      locale: 'en-US',
    });
    const host = document.createElement('div');
    document.body.append(host);
    const renderer = new CalendarRenderer(app);
    try {
      renderer.mount(host);
      await waitFor(() =>
        expect(
          host.querySelector('.df-month-view-virtual-scroller')
        ).not.toBeNull()
      );
      const callsAfterMount = weekRangeSpy.mock.calls.length;

      app.setCurrentDate(new Date(2026, 10, 3));

      await waitFor(() => expect(host.textContent).toContain('November'));
      expect(
        weekRangeSpy.mock.calls.length - callsAfterMount
      ).toBeGreaterThanOrEqual(1);
      const callsAfterNavigation = weekRangeSpy.mock.calls.length;

      // Unrelated re-renders (e.g. event changes) must not rebuild it again.
      app.addEvent({
        id: 'e1',
        title: 'Test',
        start: new Date(2026, 10, 4, 9) as never,
        end: new Date(2026, 10, 4, 10) as never,
      });
      await sleep(50);
      expect(weekRangeSpy.mock.calls.length).toBe(callsAfterNavigation);
    } finally {
      renderer.unmount();
      host.remove();
    }
  });
});
