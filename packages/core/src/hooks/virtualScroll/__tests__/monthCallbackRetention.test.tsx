import { act, renderHook } from '@testing-library/preact';

import { useVirtualMonthScroll } from '@/hooks/virtualScroll/useVirtualMonthScroll';
import { UseVirtualMonthScrollProps } from '@/types/monthView';

describe('month callback retention', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const mount = () => {
    const props: UseVirtualMonthScrollProps = {
      currentDate: new Date(2026, 4, 1),
      weekHeight: 120,
      initialWeeksToLoad: 26,
      onCurrentMonthChange: vi.fn(),
    };
    const hook = renderHook(useVirtualMonthScroll, { initialProps: props });
    const element = document.createElement('div');
    element.scrollTo = vi.fn();
    hook.result.current.scrollElementRefCallback(element);
    return { ...hook, props, element };
  };

  it('keeps one callback identity while replacing prior week ranges', () => {
    const { result, unmount } = mount();
    const callbacks = {
      scrollToDate: result.current.scrollToDate,
      handleScroll: result.current.handleScroll,
      handlePreviousMonth: result.current.handlePreviousMonth,
      handleNextMonth: result.current.handleNextMonth,
      handleToday: result.current.handleToday,
      scrollElementRefCallback: result.current.scrollElementRefCallback,
    };
    let previousWeeks = result.current.weeksData;
    for (const date of [new Date(2026, 11, 1), new Date(2025, 11, 1)]) {
      act(() => result.current.scrollToDate(date, false));
      act(() => {
        vi.runAllTimers();
      });
      expect(result.current.weeksData).not.toBe(previousWeeks);
      previousWeeks = result.current.weeksData;
      for (const name of Object.keys(callbacks) as (keyof typeof callbacks)[]) {
        expect(result.current[name], name).toBe(callbacks[name]);
      }
    }
    unmount();
  });

  it('retained callbacks read current inputs', () => {
    const { result, rerender, unmount, props, element } = mount();
    const today = result.current.handleToday;
    const onCurrentMonthChange = vi.fn();
    rerender({ ...props, weekHeight: 200, onCurrentMonthChange });

    act(() => today());
    act(() => {
      vi.runAllTimers();
    });
    expect(props.onCurrentMonthChange).not.toHaveBeenCalled();
    expect(onCurrentMonthChange).toHaveBeenLastCalledWith('May', 2026);
    const index = result.current.weeksData.findIndex(week =>
      week.days.some(
        day => day.date.getTime() === new Date(2026, 4, 1).getTime()
      )
    );
    expect(element.scrollTop).toBe(index * 200);

    unmount();
  });

  it('releases the implementation of externally retained callbacks on unmount', () => {
    const { result, unmount, props, element } = mount();
    const today = result.current.handleToday;
    const scroll = result.current.scrollToDate;
    unmount();
    act(() => {
      today();
      scroll(new Date(2026, 4, 1));
      vi.runAllTimers();
    });
    expect(props.onCurrentMonthChange).not.toHaveBeenCalled();
    expect(element.scrollTo).not.toHaveBeenCalled();
  });
});
