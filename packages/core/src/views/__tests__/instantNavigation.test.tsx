import { act, fireEvent } from '@testing-library/preact';

import { CalendarApp } from '@/core/CalendarApp';
import { createMonthView } from '@/factories/createMonthView';
import { CalendarRenderer } from '@/renderer/CalendarRenderer';

describe('MonthView instant navigation configuration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([undefined, false, true])(
    'forwards scroll.instantNavigation=%s without blocking wheel/touch scrolling',
    instantNavigation => {
      const app = new CalendarApp({
        views: [createMonthView({ scroll: { instantNavigation } })],
        defaultView: 'month',
        initialDate: new Date(2026, 4, 1),
      });
      const host = document.createElement('div');
      const renderer = new CalendarRenderer(app);
      try {
        act(() => renderer.mount(host));
        const scroller = host.querySelector<HTMLElement>(
          '.df-month-view-virtual-scroller'
        )!;
        Object.defineProperty(scroller, 'scrollTo', {
          value: vi.fn((options: ScrollToOptions) => {
            scroller.scrollTop = options.top ?? 0;
          }),
        });
        act(() => app.goToNext());
        act(() => {
          vi.advanceTimersByTime(32);
        });
        expect(scroller.scrollTo).toHaveBeenLastCalledWith({
          top: expect.any(Number),
          behavior: instantNavigation ? 'auto' : 'smooth',
        });
        expect(
          fireEvent.wheel(scroller, { cancelable: true, deltaY: 100 })
        ).toBe(true);
        expect(fireEvent.touchMove(scroller, { cancelable: true })).toBe(true);
      } finally {
        act(() => renderer.unmount());
      }
    }
  );
});
