import { fireEvent } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { CalendarApp } from '@/core/CalendarApp';
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

const mountCalendar = (viewType: ViewType, events: Event[]) => {
  const app = new CalendarApp({
    views: [
      viewType === ViewType.WEEK
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
