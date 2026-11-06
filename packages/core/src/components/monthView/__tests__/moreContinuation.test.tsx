import { act, fireEvent, render, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { Temporal } from 'temporal-polyfill';

import WeekComponent from '@/components/monthView/WeekComponent';
import { CalendarApp } from '@/core/CalendarApp';
import { LocaleProvider } from '@/locale';
import { MonthViewConfig } from '@/types';
import { generateWeekData } from '@/utils/calendarDataUtils';
import MonthView from '@/views/MonthView';

const mount = (
  allDay = false,
  monthConfig?: MonthViewConfig,
  screenSize: 'desktop' | 'mobile' = 'desktop',
  locale: 'en-US' | 'fr-FR' = 'en-US'
) => {
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
  const app = new CalendarApp({
    views: [],
    events,
    initialDate: new Date(2026, 2, 12),
  });
  const onMoreEventsClick = vi.fn();
  const onGridDateClick = vi.fn();
  const onSelectDate = vi.fn();
  const onChangeView = vi.fn();
  const Harness = () => (
    <LocaleProvider
      locale={locale}
      messages={locale === 'fr-FR' ? { more: 'plus' } : undefined}
    >
      <button type='button'>Before calendar</button>
      {monthConfig ? (
        <MonthView
          app={app}
          config={monthConfig}
          calendarRef={{ current: null }}
        />
      ) : (
        <WeekComponent
          currentMonth='March'
          currentYear={2026}
          newlyCreatedEventId={null}
          screenSize={screenSize}
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
          moreHeight={32}
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
          onMoreEventsClick={onMoreEventsClick}
          app={app}
        />
      )}
    </LocaleProvider>
  );
  return {
    ...render(<Harness />),
    app,
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
    targets: Element[];
    disconnect: ReturnType<typeof vi.fn>;
  }[] = [];
  let originalFontSize: string;
  let lineHeight = 1;
  let measured = true;
  let initialHeight: number | undefined;
  const rowHeight = () =>
    measured
      ? Number.parseFloat(document.documentElement.style.fontSize) * lineHeight
      : 0;

  beforeEach(() => {
    originalFontSize = document.documentElement.style.fontSize;
    lineHeight = 1;
    measured = true;
    initialHeight = undefined;
    document.documentElement.style.fontSize = '32px';
    vi.stubGlobal('innerHeight', 876); // Six 121px weeks below the header.
    // jsdom has no layout engine. Stub layout size, leaving slot selection
    // and event rendering real. Client rects deliberately stay unmeasured.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('df-month-more-events')
          ? (initialHeight ?? rowHeight())
          : 0;
      }
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        targets: Element[] = [];
        observe = vi.fn((target: Element) => this.targets.push(target));
        disconnect = vi.fn();
        constructor(callback: ResizeObserverCallback) {
          observers.push({
            targets: this.targets,
            disconnect: this.disconnect,
            notify: () =>
              callback(
                this.targets.map(target => ({
                  target,
                  borderBoxSize: [{ blockSize: rowHeight(), inlineSize: 100 }],
                  contentBoxSize: [],
                  devicePixelContentBoxSize: [],
                  contentRect: new DOMRectReadOnly(0, 0, 100, rowHeight()),
                })),
                this as unknown as ResizeObserver
              ),
          });
        }
      }
    );
  });

  const rowObservers = () =>
    observers.filter(observer =>
      observer.targets.some(target =>
        target.classList.contains('df-month-more-events-measure')
      )
    );

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
    const height = rowHeight();
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
      const { container, events } = mount(allDay, {});
      expect(expectFits(container, events.length)).toBe(3);
    }
  );

  it.each([false, true])(
    'fits a taller row height at a 32px root font (allDay=%s)',
    allDay => {
      lineHeight = 1.125;
      const { container, events } = mount(allDay, {});
      expect(expectFits(container, events.length)).toBe(allDay ? 3 : 2);
    }
  );

  it('remeasures after a font/container resize and disconnects on unmount', () => {
    document.documentElement.style.fontSize = '16px';
    const { container, events, unmount } = mount(false, {});
    expect(expectFits(container, events.length)).toBe(4);
    document.documentElement.style.fontSize = '32px';
    act(() => rowObservers().forEach(observer => observer.notify()));
    expect(expectFits(container, events.length)).toBe(3);
    unmount();
    expect(rowObservers()).toHaveLength(1);
    expect(
      observers.every(observer => observer.disconnect.mock.calls.length > 0)
    ).toBe(true);
  });

  it('uses observer border-box layout size under a scaled ancestor', () => {
    initialHeight = 16;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ height: rowHeight() / 2 }) as DOMRect
    );
    const { container, events } = mount(false, {});
    (container as HTMLElement).style.transform = 'scale(0.5)';
    act(() => rowObservers().forEach(observer => observer.notify()));
    expect(expectFits(container, events.length)).toBe(3);
  });

  it('keeps the shared measurement when scrolling mounts more weeks', async () => {
    const heightRead = vi.mocked(
      Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!
        .get!
    );
    const { container } = mount(false, {});
    const reads = heightRead.mock.calls.length;
    const observer = rowObservers()[0];
    const firstWeek = container.querySelector('.df-month-week');
    const scroller = container.querySelector('.df-scroll-container')!;
    fireEvent.scroll(scroller, { target: { scrollTop: 121 * 55 } });
    await vi.waitFor(() => expect(firstWeek).not.toBeInTheDocument());
    expect(rowObservers()).toEqual([observer]);
    expect(heightRead).toHaveBeenCalledTimes(reads);
  });

  it('reserves 20px before a positive layout measurement is available', () => {
    measured = false;
    const { container } = mount(false, {});
    const cell = container.querySelector('[data-date="2026-03-12"]')!;
    const more = within(cell as HTMLElement).getByText(/\+\d+ more/);
    expect(more).toHaveStyle({ height: '20px' });
    expect(cell.querySelectorAll('[data-event-id]')).toHaveLength(3);
    act(() => rowObservers().forEach(observer => observer.notify()));
    expect(more).toHaveStyle({ height: '20px' });
  });

  it.each([{}, { scroll: { disabled: true, transition: 'fade' } }] as const)(
    'shares one layout measurement across weeks with config %j',
    config => {
      const { container } = mount(false, config);
      expect(
        container.querySelectorAll('.df-month-week').length
      ).toBeGreaterThan(1);
      const measures = container.querySelectorAll(
        '.df-month-more-events-measure'
      );
      expect(measures).toHaveLength(1);
      expect(measures[0].parentElement).toHaveClass('df-scroll-container');
      expect(rowObservers()).toHaveLength(1);
    }
  );

  it.each(['desktop', 'mobile'] as const)(
    'includes the visible text and full localized date in the %s accessible name',
    screenSize => {
      const { container } = mount(false, undefined, screenSize, 'fr-FR');
      const more = container.querySelector('.df-month-day-cell-more-events')!;
      expect(more).toHaveAccessibleName('+3 plus, jeudi 12 mars 2026');
      expect(
        more.getAttribute('aria-label')!.startsWith(more.textContent!)
      ).toBe(true);
    }
  );

  it.each(['{Enter}', ' '])(
    'tabs to the continuation and fires the click callback once with %s',
    async key => {
      const user = userEvent.setup();
      const result = mount();
      const more = result.getByText(/\+\d+ more/);
      result.getByRole('button', { name: 'Before calendar' }).focus();
      await user.tab();
      expect(more).toHaveFocus();
      expect(more).toHaveAttribute('type', 'button');
      await user.keyboard(key);
      expect(result.onMoreEventsClick).toHaveBeenCalledOnce();
      expect(result.onMoreEventsClick).toHaveBeenCalledWith(
        new Date(2026, 2, 12),
        expect.objectContaining({ type: 'click' })
      );
      expect(result.onGridDateClick).not.toHaveBeenCalled();
      expect(result.onSelectDate).not.toHaveBeenCalled();
      expect(result.onChangeView).not.toHaveBeenCalled();
    }
  );
});
