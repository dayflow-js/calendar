import { render, waitFor } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { DefaultYearView } from '@/components/yearView/DefaultYearView';
import { FixedWeekYearView } from '@/components/yearView/FixedWeekYearView';
import { CalendarApp } from '@/core/CalendarApp';
import { CustomRenderingContext } from '@/renderer/CustomRenderingContext';
import { CustomRenderingStore } from '@/renderer/CustomRenderingStore';
import { EventContentSlotArgs, ViewType } from '@/types';

const setup = (
  mode: 'fixed-week' | 'year-canvas',
  allDay: boolean,
  store: CustomRenderingStore | null = null
) => {
  const app = new CalendarApp({
    views: [],
    plugins: [],
    defaultView: ViewType.YEAR,
    initialDate: new Date(2026, 0, 1),
    events: [
      {
        id: 'trip',
        title: 'Trip',
        allDay,
        start: allDay
          ? Temporal.PlainDate.from('2026-01-05')
          : Temporal.PlainDateTime.from('2026-01-05T09:00'),
        end: allDay
          ? Temporal.PlainDate.from('2026-02-06')
          : Temporal.PlainDateTime.from('2026-02-06T10:00'),
      },
    ],
  });
  const YearView = mode === 'fixed-week' ? FixedWeekYearView : DefaultYearView;
  return render(
    <CustomRenderingContext.Provider value={store}>
      <YearView
        app={app}
        calendarRef={{ current: document.createElement('div') }}
        selectedEventId='trip'
        config={{ showTimedEventsInYearView: true }}
      />
    </CustomRenderingContext.Provider>
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each(['fixed-week', 'year-canvas'] as const)(
  'Year event content slots (%s)',
  mode => {
    it.each([false, true])(
      'renders host content with allDay=%s and passes event and segment args',
      async allDay => {
        vi.stubGlobal('innerWidth', 600);
        const generatorName = allDay
          ? 'eventContentAllDayYear'
          : 'eventContentYear';
        const store = new CustomRenderingStore([generatorName]);
        const renderHostContent = vi.fn(
          (args: EventContentSlotArgs) => `Host: ${args.event.title}`
        );
        const unsubscribe = store.subscribe(renderings => {
          for (const rendering of renderings.values()) {
            expect(rendering.generatorName).toBe(generatorName);
            rendering.containerEl.textContent = renderHostContent(
              rendering.generatorArgs as EventContentSlotArgs
            );
          }
        });
        const { container, unmount } = setup(mode, allDay, store);

        await waitFor(() => {
          const bars = container.querySelectorAll('.df-year-event-bar');
          expect(bars.length).toBeGreaterThan(1);
          for (const bar of bars) {
            expect(bar).toHaveTextContent('Host: Trip');
            expect(bar.querySelector('.df-event-year-title-fade')).toBeNull();
          }
        });
        expect(renderHostContent).toHaveBeenCalledWith({
          event: expect.objectContaining({ id: 'trip', title: 'Trip' }),
          viewType: ViewType.YEAR,
          isAllDay: allDay,
          isMobile: true,
          isSelected: true,
          isDragging: false,
          segment: expect.objectContaining({
            event: expect.objectContaining({ id: 'trip' }),
            isFirstSegment: true,
          }),
          layout: undefined,
        });
        expect(renderHostContent).toHaveBeenCalledWith(
          expect.objectContaining({
            segment: expect.objectContaining({ isFirstSegment: false }),
          })
        );

        unmount();
        unsubscribe();
      }
    );

    it.each([false, true])(
      'keeps the default title and markup without a host slot, allDay=%s',
      async allDay => {
        const { container } = setup(mode, allDay);

        await waitFor(() => {
          const title = container.querySelector('.df-event-year-title-fade');
          expect(title).toHaveTextContent('Trip');
          expect(title?.parentElement).toHaveClass('df-year-event-bar');
        });
        expect(container.querySelector('.df-content-slot')).toBeNull();
      }
    );
  }
);
