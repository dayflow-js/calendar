import { fireEvent } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { CalendarApp } from '@/core/CalendarApp';
import { createDayView } from '@/factories/createDayView';
import { createMonthView } from '@/factories/createMonthView';
import { createWeekView } from '@/factories/createWeekView';
import { CalendarRenderer } from '@/renderer/CalendarRenderer';
import { Event, ViewType } from '@/types';

const TZ = 'Australia/Sydney';
const at = (time: string) =>
  Temporal.ZonedDateTime.from(`2026-10-14T${time}[${TZ}]`);

const task = (id: string, time: string): Event => ({
  id,
  title: `Task ${id}`,
  kind: 'task',
  calendarId: 'work',
  start: at(time),
  end: at(time),
});

const meeting: Event = {
  id: 'meeting',
  title: 'Meeting',
  calendarId: 'work',
  start: at('10:00'),
  end: at('11:00'),
};

const mountCalendar = (
  viewType: ViewType,
  events: Event[],
  timeFormat: '12h' | '24h' = '24h'
) => {
  const app = new CalendarApp({
    views: [
      viewType === ViewType.DAY
        ? createDayView({ scrollToCurrentTime: false })
        : viewType === ViewType.WEEK
          ? createWeekView({ scrollToCurrentTime: false })
          : createMonthView(),
    ],
    plugins: [],
    events,
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
    defaultView: viewType,
    initialDate: new Date('2026-10-14T12:00:00+11:00'),
    timeZone: TZ,
    timeFormat,
    useCalendarHeader: false,
  });
  const host = document.createElement('div');
  document.body.append(host);
  const renderer = new CalendarRenderer(app);
  renderer.mount(host);
  return {
    app,
    host,
    cleanup: () => {
      renderer.unmount();
      host.remove();
    },
  };
};

const eventElement = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-event-id="${id}"]`)!;

describe('tasks', () => {
  it.each(['24h', '12h'] as const)(
    'shows a timed task deadline in the Day sidebar using %s, with no time for all-day tasks',
    timeFormat => {
      const allDay: Event = {
        ...task('all-day', '00:00'),
        allDay: true,
        start: Temporal.PlainDate.from('2026-10-14'),
        end: Temporal.PlainDate.from('2026-10-14'),
      };
      const { host, app, cleanup } = mountCalendar(
        ViewType.DAY,
        [task('due', '15:30'), allDay, meeting],
        timeFormat
      );
      try {
        const timed = host.querySelector(
          '.df-right-panel-event-card[data-event-id="due"]'
        )!;
        expect(timed.querySelector('.df-event-time')?.textContent).toBe(
          timeFormat === '24h' ? '15:30' : '3:30 pm'
        );
        expect(
          host.querySelector(
            '.df-right-panel-event-card[data-event-id="all-day"] .df-event-time'
          )
        ).toBeNull();
        expect(
          host.querySelector(
            '.df-right-panel-event-card[data-event-id="meeting"] .df-event-time'
          )?.textContent
        ).toBe(timeFormat === '24h' ? '10:00 - 11:00' : '10-11am');
        fireEvent.click(timed.querySelector('[role="checkbox"]')!);
        expect(
          app.getEvents().find(event => event.id === 'due')?.task?.completed
        ).toBe(true);
      } finally {
        cleanup();
      }
    }
  );
  // jsdom has no matchMedia; the renderer's responsive hook polls it on a timer.
  beforeAll(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterAll(() => {
    // @ts-expect-error restore jsdom's missing API
    delete window.matchMedia;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('gives tasks due at the same time their own columns', () => {
    const { host, cleanup } = mountCalendar(ViewType.WEEK, [
      task('a', '10:00'),
      task('b', '10:00'),
      meeting,
    ]);

    const lefts = ['a', 'b', 'meeting'].map(
      id => eventElement(host, id).style.left
    );
    expect(new Set(lefts).size).toBe(3);

    cleanup();
  });

  it('toggles completion from the circle without opening the detail panel', async () => {
    const { app, host, cleanup } = mountCalendar(ViewType.WEEK, [
      task('a', '10:00'),
    ]);

    const element = eventElement(host, 'a');
    expect(element.dataset.kind).toBe('task');
    expect(element.querySelector('.df-event-color-bar')).toBeNull();
    expect(element.querySelector('.df-event-color-bar-overlay')).toBeNull();
    const checkbox = element.querySelector<HTMLElement>('.df-task-checkbox')!;
    expect(checkbox.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(checkbox);
    await vi.waitFor(() =>
      expect(app.getEvents()[0].task?.completed).toBe(true)
    );
    expect(app.getEvents()[0].task?.completedAt).toBeDefined();
    expect(document.querySelector('[data-event-detail-panel]')).toBeNull();

    await vi.waitFor(() =>
      expect(eventElement(host, 'a').dataset.taskCompleted).toBe('true')
    );

    cleanup();
  });

  it.each([ViewType.MONTH, ViewType.WEEK])(
    'updates priority text without changing the calendar circle in %s',
    async view => {
      const { app, host, cleanup } = mountCalendar(view, [
        { ...task('priority', '10:00'), task: { priority: 'low' } },
      ]);
      expect(eventElement(host, 'priority').style.color).toContain(
        '--df-task-text-low'
      );
      const ringColor = eventElement(
        host,
        'priority'
      ).querySelector<HTMLElement>('.df-task-checkbox')!.style.color;
      await app.updateEvent('priority', { task: { priority: 'high' } });
      await vi.waitFor(() =>
        expect(eventElement(host, 'priority').style.color).toContain(
          '--df-task-text-high'
        )
      );
      expect(
        eventElement(host, 'priority').querySelector<HTMLElement>(
          '.df-task-checkbox'
        )!.style.color
      ).toBe(ringColor);
      expect(ringColor).toBe('rgb(37, 99, 235)');
      cleanup();
    }
  );

  it('does not let tasks be resized', () => {
    const { host, cleanup } = mountCalendar(ViewType.WEEK, [
      task('a', '14:00'),
      meeting,
    ]);

    expect(
      eventElement(host, 'meeting').querySelector('.df-event-resize-handle')
    ).not.toBeNull();
    expect(
      eventElement(host, 'a').querySelector('.df-event-resize-handle')
    ).toBeNull();

    cleanup();
  });

  it('renders a date-only task as a task row without a time and with priority stripes', () => {
    const date = Temporal.PlainDate.from('2026-10-14');
    const { host, cleanup } = mountCalendar(ViewType.MONTH, [
      {
        ...task('all-day', '10:00'),
        allDay: true,
        start: date,
        end: date,
        task: { priority: 'high' },
      },
    ]);
    const element = eventElement(host, 'all-day');
    expect(element.querySelector('.df-event-month-regular')).not.toBeNull();
    expect(element.querySelector('.df-task-checkbox')).not.toBeNull();
    expect(element.querySelector('.df-event-month-time')).toBeNull();
    expect(element.style.background).toContain('repeating-linear-gradient');
    expect(element.style.background).toContain('220, 38, 38');
    expect(
      element.querySelector('[aria-label="Priority: High"]')
    ).not.toBeNull();
    cleanup();
  });

  it('shows the circle in place of the color bar in month view', () => {
    const { host, cleanup } = mountCalendar(ViewType.MONTH, [
      task('a', '10:00'),
      meeting,
    ]);

    const taskElement = eventElement(host, 'a');
    expect(taskElement.querySelector('.df-task-checkbox')).not.toBeNull();
    expect(taskElement.querySelector('.df-event-month-color-bar')).toBeNull();
    expect(
      eventElement(host, 'meeting').querySelector('.df-task-checkbox')
    ).toBeNull();

    cleanup();
  });
});
