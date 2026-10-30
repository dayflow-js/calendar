import { fireEvent, render, waitFor } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { DefaultYearView } from '@/components/yearView/DefaultYearView';
import { FixedWeekYearView } from '@/components/yearView/FixedWeekYearView';
import { CalendarApp } from '@/core/CalendarApp';
import { ViewType } from '@/types';

describe('DefaultYearView', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientWidth'
  );

  afterEach(() => {
    if (originalClientWidth) {
      // eslint-disable-next-line no-extend-native
      Object.defineProperty(
        HTMLElement.prototype,
        'clientWidth',
        originalClientWidth
      );
    }
  });

  it('uses the measured container width on first render instead of an initial window-width guess', async () => {
    // eslint-disable-next-line no-extend-native
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return 1200;
      },
    });

    const app = new CalendarApp({
      views: [],
      plugins: [],
      events: [],
      defaultView: ViewType.YEAR,
      calendars: [
        {
          id: 'work',
          name: 'Work',
          colors: {
            lineColor: '#2563eb',
            eventColor: '#dbeafe',
            eventSelectedColor: '#bfdbfe',
            textColor: '#1e3a8a',
          },
        },
      ],
    });

    const calendarRef = {
      current: document.createElement('div'),
    } as { current: HTMLDivElement };

    const { container } = render(
      <DefaultYearView app={app} calendarRef={calendarRef} />
    );

    await waitFor(() => {
      const rows = container.querySelectorAll('.df-year-row');
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]?.querySelectorAll('[data-date]').length).toBe(15);
    });
  });

  it('uses gridDateDoubleClick callback in year-canvas mode when provided', async () => {
    const onGridDateDoubleClick = vi.fn();

    const app = new CalendarApp({
      views: [],
      plugins: [],
      events: [],
      defaultView: ViewType.YEAR,
      initialDate: new Date(2026, 0, 1),
      calendars: [
        {
          id: 'work',
          name: 'Work',
          colors: {
            lineColor: '#2563eb',
            eventColor: '#dbeafe',
            eventSelectedColor: '#bfdbfe',
            textColor: '#1e3a8a',
          },
        },
      ],
    });

    const calendarRef = {
      current: document.createElement('div'),
    } as { current: HTMLDivElement };

    const { container } = render(
      <DefaultYearView
        app={app}
        calendarRef={calendarRef}
        config={{ gridDateDoubleClick: onGridDateDoubleClick }}
      />
    );

    await waitFor(() => {
      expect(
        container.querySelector('[data-date="2026-01-01"]')
      ).not.toBeNull();
    });

    fireEvent.dblClick(container.querySelector('[data-date="2026-01-01"]')!);

    expect(onGridDateDoubleClick).toHaveBeenCalledTimes(1);
    expect(onGridDateDoubleClick.mock.calls[0][0]).toEqual(
      new Date(2026, 0, 1)
    );
    expect(onGridDateDoubleClick.mock.calls[0][1]).toEqual([]);
  });

  it('uses gridDateDoubleClick callback in fixed-week mode when provided', async () => {
    const onGridDateDoubleClick = vi.fn();

    const app = new CalendarApp({
      views: [],
      plugins: [],
      events: [],
      defaultView: ViewType.YEAR,
      initialDate: new Date(2026, 0, 1),
      calendars: [
        {
          id: 'work',
          name: 'Work',
          colors: {
            lineColor: '#2563eb',
            eventColor: '#dbeafe',
            eventSelectedColor: '#bfdbfe',
            textColor: '#1e3a8a',
          },
        },
      ],
    });

    const calendarRef = {
      current: document.createElement('div'),
    } as { current: HTMLDivElement };

    const { container } = render(
      <FixedWeekYearView
        app={app}
        calendarRef={calendarRef}
        config={{
          mode: 'fixed-week',
          gridDateDoubleClick: onGridDateDoubleClick,
        }}
      />
    );

    await waitFor(() => {
      expect(
        container.querySelector('[data-date="2026-01-01"]')
      ).not.toBeNull();
    });

    fireEvent.dblClick(container.querySelector('[data-date="2026-01-01"]')!);

    expect(onGridDateDoubleClick).toHaveBeenCalledTimes(1);
    expect(onGridDateDoubleClick.mock.calls[0][0]).toEqual(
      new Date(2026, 0, 1)
    );
    expect(onGridDateDoubleClick.mock.calls[0][1]).toEqual([]);
  });

  describe('fixed-week event clicks follow eventDetailTrigger', () => {
    const setup = (eventDetailTrigger?: 'click' | 'dbClick') => {
      const onEventClick = vi.fn();
      const onEventDoubleClick = vi.fn();
      const app = new CalendarApp({
        views: [],
        plugins: [],
        defaultView: ViewType.YEAR,
        initialDate: new Date(2026, 0, 1),
        useEventDetailPanel: true,
        eventDetailTrigger,
        callbacks: { onEventClick, onEventDoubleClick },
        events: [
          {
            id: 'trip',
            title: 'Trip',
            start: Temporal.PlainDate.from('2026-01-05'),
            end: Temporal.PlainDate.from('2026-01-06'),
            allDay: true,
          },
        ],
      });
      const onDetailPanelToggle = vi.fn();
      const { container } = render(
        <FixedWeekYearView
          app={app}
          calendarRef={{ current: document.createElement('div') }}
          config={{ mode: 'fixed-week', fixedWeekColumnWidth: 48 }}
          onEventSelect={vi.fn()}
          onDetailPanelToggle={onDetailPanelToggle}
        />
      );
      const bar = () =>
        container.querySelector<HTMLElement>('[data-event-id="trip"]')!;
      return {
        container,
        bar,
        onDetailPanelToggle,
        onEventClick,
        onEventDoubleClick,
      };
    };

    it('opens the panel on a single click in click mode', async () => {
      const { bar, onDetailPanelToggle, onEventClick } = setup('click');
      await waitFor(() => expect(bar()).not.toBeNull());
      fireEvent.click(bar());
      expect(onEventClick).toHaveBeenCalledOnce();
      expect(onDetailPanelToggle).toHaveBeenLastCalledWith(
        bar().dataset.segmentId
      );
    });

    it('selects on click and opens on double click by default', async () => {
      const { bar, onDetailPanelToggle, onEventDoubleClick } = setup();
      await waitFor(() => expect(bar()).not.toBeNull());
      fireEvent.click(bar());
      expect(onDetailPanelToggle).not.toHaveBeenCalledWith(
        bar().dataset.segmentId
      );
      fireEvent.dblClick(bar());
      expect(onEventDoubleClick).toHaveBeenCalledOnce();
      await waitFor(() =>
        expect(onDetailPanelToggle).toHaveBeenLastCalledWith(
          bar().dataset.segmentId
        )
      );
    });

    it('widens day columns with fixedWeekColumnWidth', () => {
      const { container } = setup('click');
      const root = container.querySelector<HTMLElement>('.df-year-fixed')!;
      expect(root.style.getPropertyValue('--df-year-fixed-column-width')).toBe(
        '48px'
      );
      expect(
        container.querySelector<HTMLElement>('.df-year-fixed-content-inner')!
          .style.minWidth
      ).toContain('var(--df-year-fixed-column-width');
    });
  });
});
