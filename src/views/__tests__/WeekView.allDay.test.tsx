import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Temporal } from 'temporal-polyfill';
import WeekView from '@/views/WeekView';
import { CalendarApp } from '@/core';
import { ViewType, CalendarAppConfig } from '@/types';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { defaultDragConfig, defaultViewConfigs } from '@/core/config';

jest.mock('@/plugins/dragPlugin', () => ({
  useDragForView: () => ({
    handleMoveStart: jest.fn(),
    handleCreateStart: jest.fn(),
    handleResizeStart: jest.fn(),
    handleCreateAllDayEvent: jest.fn(),
    dragState: null,
    isDragging: false,
  }),
}));

const createAppWithEvent = (override?: Partial<CalendarAppConfig>) => {
  const startDate = Temporal.PlainDate.from('2024-10-29');
  const endDate = startDate.add({ days: 1 }); // Covers Oct 29-30 inclusively

  return new CalendarApp({
    events: [
      {
        id: 'event-a',
        title: 'Event A',
        start: startDate,
        end: endDate,
        allDay: true,
        calendarId: 'blue',
      },
    ],
    plugins: [],
    views: [],
    defaultView: ViewType.WEEK,
    initialDate: new Date('2024-10-29T00:00:00'),
    ...(override ?? {}),
  });
};

describe('WeekView all-day multi-day events', () => {
  const renderWeekView = (
    app: CalendarApp,
    config?: Record<string, unknown>
  ) => {
    const calendarRef = React.createRef<HTMLDivElement>();

    const mockConfig = {
      ...defaultDragConfig,
      ...defaultViewConfigs.week,
    };

    render(
      <ThemeProvider initialTheme={app.getTheme()}>
        <div ref={calendarRef}>
          <WeekView
            app={app}
            config={mockConfig}
            calendarRef={calendarRef}
            customDetailPanelContent={undefined}
            customEventDetailDialog={undefined}
            config={config}
          />
        </div>
      </ThemeProvider>
    );

    return calendarRef;
  };

  it('spans all intended days without requiring user interaction', () => {
    const app = createAppWithEvent();
    renderWeekView(app);

    const eventLabel = screen.getByText('Event A');
    const eventNode = eventLabel.closest('.calendar-event') as HTMLElement;

    expect(eventNode).not.toBeNull();
    expect(eventNode.style.left).toBe('calc(14.285714285714285% + 2px)');
    expect(eventNode.style.width).toMatch(/28\.57/);
  });

  it('handles PlainDateTime-based all-day events consistently', () => {
    const startDateTime = Temporal.PlainDateTime.from('2024-10-29T00:00:00');
    const endDateTime = Temporal.PlainDateTime.from('2024-10-30T23:59:59');

    const app = createAppWithEvent({
      events: [
        {
          id: 'event-b',
          title: 'Event B',
          start: startDateTime,
          end: endDateTime,
          allDay: true,
          calendarId: 'blue',
        },
      ],
    });

    renderWeekView(app);

    const eventLabel = screen.getByText('Event B');
    const eventNode = eventLabel.closest('.calendar-event') as HTMLElement;

    expect(eventNode).not.toBeNull();
    expect(eventNode.style.left).toBe('calc(14.285714285714285% + 2px)');
    expect(eventNode.style.width).toMatch(/28\.57/);
  });

  it('keeps single-day all-day duration unchanged after double click', async () => {
    const app = createAppWithEvent();
    renderWeekView(app);

    const eventLabel = screen.getByText('Event A');
    const eventNode = eventLabel.closest('.calendar-event') as HTMLElement;
    const originalEnd = app.getAllEvents()[0].end;

    fireEvent.doubleClick(eventNode);

    await waitFor(() => {
      expect(app.getAllEvents()[0].end.toString()).toBe(
        originalEnd.toString()
      );
    });
  });

  it('preserves original start/end for cross-week all-day events after double click', async () => {
    const crossWeekEventStart = Temporal.PlainDate.from('2024-10-26');
    const crossWeekEventEnd = Temporal.PlainDate.from('2024-10-28');

    const app = createAppWithEvent({
      events: [
        {
          id: 'event-cross-week',
          title: 'Cross Week Event',
          start: crossWeekEventStart,
          end: crossWeekEventEnd,
          allDay: true,
          calendarId: 'blue',
        },
      ],
      initialDate: new Date('2024-10-28T00:00:00'),
    });

    renderWeekView(app);

    const eventLabel = screen.getByText('Cross Week Event');
    const eventNode = eventLabel.closest('.calendar-event') as HTMLElement;

    fireEvent.doubleClick(eventNode);

    await waitFor(() => {
      const [event] = app.getAllEvents();
      expect(event.start.toString()).toBe(crossWeekEventStart.toString());
      expect(event.end.toString()).toBe(crossWeekEventEnd.toString());
    });
  });

  it('hides all-day row when showAllDay is false', () => {
    const app = createAppWithEvent();
    renderWeekView(app, { showAllDay: false });

    expect(screen.queryByText('All day')).not.toBeInTheDocument();
    expect(screen.queryByText('Event A')).not.toBeInTheDocument();
  });
});
