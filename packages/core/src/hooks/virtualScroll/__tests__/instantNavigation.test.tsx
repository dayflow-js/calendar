import { act, fireEvent, render } from '@testing-library/preact';
import { MockInstance } from 'vitest';

import { useVirtualMonthScroll } from '@/hooks/virtualScroll/useVirtualMonthScroll';
import { UseVirtualMonthScrollProps } from '@/types/monthView';

const mount = (instantNavigation?: boolean, snapToMonth = false) => {
  let latest!: ReturnType<typeof useVirtualMonthScroll>;
  const props: UseVirtualMonthScrollProps = {
    currentDate: new Date(2026, 4, 12),
    weekHeight: 120,
    initialWeeksToLoad: 26,
    instantNavigation,
    snapToMonth,
  };
  const Harness = (input: UseVirtualMonthScrollProps) => {
    latest = useVirtualMonthScroll(input);
    return <div ref={latest.scrollElementRef} onScroll={latest.handleScroll} />;
  };
  const rendered = render(<Harness {...props} />);
  const element = rendered.container.firstElementChild as HTMLDivElement;
  Object.defineProperty(element, 'scrollTo', {
    configurable: true,
    value: vi.fn((options: ScrollToOptions) => {
      element.scrollTop = options.top ?? 0;
    }),
  });
  return {
    ...rendered,
    element,
    get current() {
      return latest;
    },
    setDate: (date: Date) =>
      rendered.rerender(<Harness {...props} currentDate={date} />),
  };
};

const navigationTimers = (spy: MockInstance<typeof setTimeout>) =>
  spy.mock.calls.filter((args: unknown[]) =>
    [50, 200, 500].includes(args[1] as number)
  );

describe('instant month navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    vi.setSystemTime(new Date(2026, 4, 12));
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([undefined, false, true])(
    'preserves loaded/past/future navigation with instantNavigation=%s',
    instant => {
      for (const target of [
        new Date(2026, 5, 1),
        new Date(2025, 10, 1),
        new Date(2026, 11, 1),
      ]) {
        const month = mount(instant);
        const beforeLength = month.current.weeksData.length;
        const timers = vi.spyOn(globalThis, 'setTimeout');
        timers.mockClear();
        act(() => month.current.scrollToDate(target, true));
        act(() => {
          vi.advanceTimersByTime(32);
        });
        if (instant) {
          expect(month.element.scrollTo).toHaveBeenLastCalledWith({
            top: expect.any(Number),
            behavior: 'auto',
          });
          expect(navigationTimers(timers)).toHaveLength(0);
          expect(month.current.isNavigating).toBe(false);
          expect(month.current.scrollTop).toBe(month.element.scrollTop);
        } else {
          act(() => {
            vi.advanceTimersByTime(50);
          });
          expect(month.element.scrollTo).toHaveBeenLastCalledWith({
            top: expect.any(Number),
            behavior: 'smooth',
          });
          expect(navigationTimers(timers).some(args => args[1] === 500)).toBe(
            true
          );
          expect(month.current.isNavigating).toBe(true);
        }
        const index = month.current.weeksData.findIndex(week =>
          week.days.some(
            day => day.date.toDateString() === target.toDateString()
          )
        );
        expect(month.element.scrollTop).toBe(index * 120);
        if (target.getMonth() !== 5)
          expect(month.current.weeksData.length).toBeGreaterThan(beforeLength);
        month.unmount();
        vi.clearAllTimers();
        timers.mockRestore();
      }
    }
  );

  it.each(['previous', 'next', 'today', 'date'] as const)(
    'applies the option to %s navigation',
    action => {
      const month = mount(true);
      const timers = vi.spyOn(globalThis, 'setTimeout');
      timers.mockClear();
      act(() => {
        if (action === 'previous') month.current.handlePreviousMonth();
        if (action === 'next') month.current.handleNextMonth();
        if (action === 'today') month.current.handleToday();
        if (action === 'date') month.setDate(new Date(2026, 6, 1));
      });
      act(() => {
        vi.advanceTimersByTime(32);
      });
      expect(month.element.scrollTo).toHaveBeenLastCalledWith({
        top: expect.any(Number),
        behavior: 'auto',
      });
      expect(navigationTimers(timers)).toHaveLength(0);
      expect(month.current.isNavigating).toBe(false);
      month.unmount();
    }
  );

  it('extends the range immediately when Today is outside the loaded weeks', () => {
    const month = mount(true);
    const previousLength = month.current.weeksData.length;
    vi.setSystemTime(new Date(2026, 11, 12));
    const timers = vi.spyOn(globalThis, 'setTimeout');
    timers.mockClear();
    act(() => month.current.handleToday());
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(month.element.scrollTo).toHaveBeenLastCalledWith({
      top: expect.any(Number),
      behavior: 'auto',
    });
    expect(navigationTimers(timers)).toHaveLength(0);
    expect(month.current.currentMonth).toBe('December');
    expect(month.current.weeksData.length).toBeGreaterThan(previousLength);
    const targetIndex = month.current.weeksData.findIndex(week =>
      week.days.some(
        day => day.date.getTime() === new Date(2026, 11, 1).getTime()
      )
    );
    expect(targetIndex).toBeGreaterThanOrEqual(0);
    expect(month.element.scrollTop).toBe(targetIndex * 120);
    month.unmount();
  });

  it('synchronizes the clamped DOM position near the end of the loaded range', () => {
    const month = mount(true);
    const maxScrollTop = month.current.virtualData.totalHeight - 600;
    Object.defineProperty(month.element, 'scrollTo', {
      value: vi.fn((options: ScrollToOptions) => {
        month.element.scrollTop = Math.min(options.top ?? 0, maxScrollTop);
      }),
    });
    const target = month.current.weeksData.at(-1)!.days.at(-1)!.date;
    act(() => month.current.scrollToDate(target));
    expect(month.element.scrollTop).toBe(maxScrollTop);
    expect(month.current.scrollTop).toBe(maxScrollTop);
    month.unmount();
  });

  it('also uses auto positioning for snap-to-month after the scroll debounce', () => {
    const month = mount(true, true);
    act(() => {
      vi.advanceTimersByTime(32);
    });
    month.element.scrollTop += 60;
    fireEvent.scroll(month.element);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    act(() => {
      vi.advanceTimersByTime(232);
    });
    expect(month.element.scrollTo).toHaveBeenLastCalledWith({
      top: expect.any(Number),
      behavior: 'auto',
    });
    month.unmount();
  });

  it('keeps continuous scrolling and week extension enabled', () => {
    const month = mount(true);
    const before = month.current.weeksData.length;
    act(() => {
      vi.advanceTimersByTime(32);
    });
    month.element.scrollTop = month.current.virtualData.totalHeight - 100;
    fireEvent.scroll(month.element);
    act(() => {
      vi.advanceTimersByTime(32);
    });
    expect(month.current.weeksData.length).toBeGreaterThan(before);
    month.unmount();
  });
});
