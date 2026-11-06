import { act, render, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { useState } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import WeekComponent from '@/components/monthView/WeekComponent';
import { CalendarApp } from '@/core/CalendarApp';
import { generateWeekData } from '@/utils/calendarDataUtils';

const mount = (allDay = false) => {
  const events = Array.from({ length: 6 }, (_, index) => ({
    id: `event-${index}`,
    title: `Event ${index}`,
    allDay,
    start: allDay
      ? Temporal.PlainDate.from('2026-03-12')
      : Temporal.PlainDateTime.from(`2026-03-12T${index + 10}:00`),
    end: allDay
      ? Temporal.PlainDate.from('2026-03-12')
      : Temporal.PlainDateTime.from(`2026-03-12T${index + 11}:00`),
  }));
  const app = new CalendarApp({ views: [], events });
  const onMoreEventsClick = vi.fn();
  const onGridDateClick = vi.fn();
  const onSelectDate = vi.fn();
  const onChangeView = vi.fn();
  const Harness = () => {
    const [open, setOpen] = useState(false);
    return (
      <form
        onSubmit={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        <button type='button'>Before calendar</button>
        <WeekComponent
          currentMonth='March'
          currentYear={2026}
          newlyCreatedEventId={null}
          screenSize='desktop'
          isScrolling={false}
          isDragging={false}
          showMonthIndicator={false}
          item={{
            index: 0,
            weekData: generateWeekData(new Date(2026, 2, 9)),
            top: 0,
            height: 121,
          }}
          weekHeight={121}
          events={events}
          dragState={{
            active: false,
            mode: null,
            eventId: null,
            targetDate: null,
            startDate: null,
            endDate: null,
          }}
          calendarRef={{ current: null }}
          onEventUpdate={vi.fn()}
          onEventDelete={vi.fn()}
          onDetailPanelOpen={vi.fn()}
          detailPanelEventId={null}
          onDetailPanelToggle={vi.fn()}
          onCalendarDrop={vi.fn(() => null)}
          onGridDateClick={onGridDateClick}
          onSelectDate={onSelectDate}
          onChangeView={onChangeView}
          onMoreEventsClick={(date, event) => {
            onMoreEventsClick(date, event);
            setOpen(true);
          }}
          app={app}
        />
        {open && <aside role='dialog'>Hidden events (Escape to close)</aside>}
      </form>
    );
  };
  return {
    ...render(<Harness />),
    events,
    onMoreEventsClick,
    onGridDateClick,
    onSelectDate,
    onChangeView,
  };
};

describe('month more continuation', () => {
  const observers: {
    notify: () => void;
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  let originalFontSize: string;
  let lineHeight = 1;

  beforeEach(() => {
    originalFontSize = document.documentElement.style.fontSize;
    lineHeight = 1;
    document.documentElement.style.fontSize = '32px';
    // jsdom has no layout engine. Supply the font-relative row measurement
    // at the DOM boundary, leaving slot selection and event rendering real.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return {
          height: this.classList.contains('df-month-more-events')
            ? Number.parseFloat(document.documentElement.style.fontSize) *
              lineHeight
            : 0,
        } as DOMRect;
      }
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(notify: () => void) {
          observers.push({ notify, disconnect: this.disconnect });
        }
      }
    );
  });

  afterEach(() => {
    document.documentElement.style.fontSize = originalFontSize;
    observers.length = 0;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const expectFits = (container: Element, total: number) => {
    const cell = container.querySelector<HTMLElement>(
      '[data-date="2026-03-12"]'
    )!;
    const more = within(cell).getByText(/\+\d+ more/);
    const visible = container.querySelectorAll('[data-event-id]').length;
    const slotCount = Array.from(more.parentElement!.children)
      .slice(0, Array.from(more.parentElement!.children).indexOf(more))
      .filter(
        node => !node.classList.contains('df-month-day-cell-overlay-mask')
      ).length;
    const height = more.getBoundingClientRect().height;
    const spacing = cell.querySelector('[data-event-id]') ? 18 : 17;
    expect(33 + slotCount * spacing + height).toBeLessThanOrEqual(
      Number.parseFloat(cell.style.height)
    );
    expect(more.textContent).toBe(`+${total - visible} more`);
    expect(Number.parseFloat(more.style.height)).toBe(height);
    expect(
      container.querySelector<HTMLElement>('.df-month-week')!.style.height
    ).toBe('121px');
    return visible;
  };

  it.each([false, true])(
    'fits the continuation at a 32px root font and counts hidden events (allDay=%s)',
    allDay => {
      const { container, events } = mount(allDay);
      expect(expectFits(container, events.length)).toBe(3);
      expect(container.querySelector('.df-month-title')).toBeNull();
    }
  );

  it.each([false, true])(
    'fits a taller inherited line height at a 32px root font (allDay=%s)',
    allDay => {
      lineHeight = 1.125;
      const { container, events } = mount(allDay);
      expect(expectFits(container, events.length)).toBe(allDay ? 3 : 2);
    }
  );

  it('remeasures after a font/container resize and disconnects on unmount', () => {
    document.documentElement.style.fontSize = '16px';
    const { container, events, unmount } = mount();
    expect(expectFits(container, events.length)).toBe(4);
    document.documentElement.style.fontSize = '32px';
    act(() => observers.forEach(observer => observer.notify()));
    expect(expectFits(container, events.length)).toBe(3);
    unmount();
    expect(observers.length).toBeGreaterThan(0);
    expect(
      observers.every(observer => observer.disconnect.mock.calls.length > 0)
    ).toBe(true);
  });

  it.each(['{Enter}', ' '])(
    'tabs to the continuation and opens the click callback with %s, retaining focus after close',
    async key => {
      const user = userEvent.setup();
      const result = mount();
      const more = result.getByText(/\+\d+ more/);
      await user.click(more);
      const clickDate = result.onMoreEventsClick.mock.calls[0][0];
      await user.keyboard('{Escape}');
      result.onMoreEventsClick.mockClear();

      result.getByRole('button', { name: 'Before calendar' }).focus();
      await user.tab();
      expect(more).toHaveFocus();
      expect(more).toHaveAttribute('type', 'button');
      await user.keyboard(key);
      expect(result.getByRole('dialog')).toBeInTheDocument();
      expect(result.onMoreEventsClick).toHaveBeenCalledOnce();
      expect(result.onMoreEventsClick).toHaveBeenCalledWith(
        clickDate,
        expect.objectContaining({ type: 'click' })
      );
      await user.keyboard('{Escape}');
      expect(result.queryByRole('dialog')).toBeNull();
      expect(more).toHaveFocus();
      expect(result.onGridDateClick).not.toHaveBeenCalled();
      expect(result.onSelectDate).not.toHaveBeenCalled();
      expect(result.onChangeView).not.toHaveBeenCalled();
      expect(clickDate).toEqual(new Date(2026, 2, 12));
    }
  );
});
