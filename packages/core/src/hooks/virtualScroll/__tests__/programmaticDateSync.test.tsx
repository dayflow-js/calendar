import { act, render } from '@testing-library/preact';
import { RefObject } from 'preact';

import { useVirtualMonthScroll } from '@/hooks/virtualScroll/useVirtualMonthScroll';
import { UseVirtualMonthScrollProps } from '@/types/monthView';

const WEEK_HEIGHT = 120;

const mount = (
  currentDate: Date,
  skipScrollOnDateChange?: RefObject<boolean>
) => {
  let latest!: ReturnType<typeof useVirtualMonthScroll>;
  const props: UseVirtualMonthScrollProps = {
    currentDate,
    weekHeight: WEEK_HEIGHT,
    initialWeeksToLoad: 26,
    skipScrollOnDateChange,
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

const weekTopOf = (month: ReturnType<typeof mount>, target: Date): number =>
  month.current.weeksData.findIndex(week =>
    week.days.some(day => day.date.toDateString() === target.toDateString())
  ) * WEEK_HEIGHT;

describe('month date sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 7));
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('scrolls to the new month when the target date is in the last row of the current grid', () => {
    // Dec 2026's six-week grid runs Nov 30 – Jan 10, so Jan 7 is already on screen.
    const month = mount(new Date(2026, 11, 7));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(month.current.currentYear).toBe(2026);

    act(() => month.setDate(new Date(2027, 0, 7)));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(month.element.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: weekTopOf(month, new Date(2027, 0, 1)) })
    );
    expect(month.current.currentYear).toBe(2027);
    month.unmount();
  });

  it('does not scroll when the date change came from clicking a visible grid date', () => {
    const skip = { current: false };
    const month = mount(new Date(2026, 11, 7), skip);
    act(() => {
      vi.advanceTimersByTime(100);
    });

    skip.current = true;
    act(() => month.setDate(new Date(2027, 0, 7)));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(month.element.scrollTo).not.toHaveBeenCalled();
    expect(month.current.currentYear).toBe(2026);
    expect(skip.current).toBe(false);
    month.unmount();
  });
});
