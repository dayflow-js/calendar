import { RangePicker } from '@dayflow/ui-range-picker';
import {
  fireEvent,
  render,
  renderHook,
  waitFor,
} from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { MiniCalendar } from '@/components/common/MiniCalendar';
import {
  buildFixedWeekMonthsData,
  getFixedWeekTotalColumns,
} from '@/components/yearView/utils';
import { CalendarApp } from '@/core/CalendarApp';
import { createMonthView } from '@/factories/createMonthView';
import { createYearView } from '@/factories/createYearView';
import { useVirtualMonthScroll } from '@/hooks/virtualScroll/useVirtualMonthScroll';
import { LocaleProvider } from '@/locale';
import { CalendarRenderer } from '@/renderer/CalendarRenderer';
import {
  createConfigSyncSnapshot,
  getSyncConfigUpdates,
} from '@/utils/calendarApp/configSync';
import { generateWeekData } from '@/utils/calendarDataUtils';
import { buildWeekDates } from '@/views/utils/weekView';

import {
  parseTemporalString,
  buildParseRegExp,
} from '../../../../ui/range-picker/src/utils/rangePicker';
import {
  addCalendarMonths,
  calendarDateToDate,
  dateToCalendarDate,
  calendarLocale,
} from '../calendarSystem';

const makeApp = () =>
  new CalendarApp({
    views: [
      createMonthView({
        startOfWeek: 6,
        scroll: { disabled: true, transition: 'fade' },
      }),
    ],
    initialDate: new Date(2025, 2, 21),
    defaultView: 'month',
    calendarSystem: 'jalali',
    locale: 'en-US',
    timeZone: 'Asia/Tehran',
  });

describe('Jalali calendar behavior', () => {
  it('replaces cached scrolling metadata when the calendar changes', async () => {
    const date = new Date(2025, 2, 21);
    const { result, rerender } = renderHook(
      ({ system }: { system: 'gregorian' | 'jalali' }) =>
        useVirtualMonthScroll({
          currentDate: date,
          calendarSystem: system,
          locale: calendarLocale('en-US', system),
          weekHeight: 120,
          initialWeeksToLoad: 8,
          startOfWeek: 6,
          isEnabled: false,
        }),
      { initialProps: { system: 'jalali' } }
    );
    expect(result.current.currentYear).toBe(1404);
    expect(result.current.currentMonth).toBe('Farvardin');
    rerender({ system: 'gregorian' });
    await waitFor(() => expect(result.current.currentYear).toBe(2025));
    const day = result.current.weeksData
      .flatMap(week => week.days)
      .find(item => item.date.getTime() === date.getTime());
    expect(day).toMatchObject({ day: 21, month: 2, year: 2025 });
    rerender({ system: 'jalali' });
    await waitFor(() => expect(result.current.currentYear).toBe(1404));
    const restoredDay = result.current.weeksData
      .flatMap(week => week.days)
      .find(item => item.date.getTime() === date.getTime());
    expect(restoredDay).toMatchObject({ day: 1, month: 0, year: 1404 });
  });

  it.each(['grid', 'year-canvas', 'fixed-week'] as const)(
    'renders a Persian year in %s mode',
    mode => {
      const app = new CalendarApp({
        views: [createYearView({ mode, startOfWeek: 6 })],
        initialDate: new Date(2025, 2, 21),
        defaultView: 'year',
        calendarSystem: 'jalali',
        locale: 'en-US',
      });
      const host = document.createElement('div');
      const renderer = new CalendarRenderer(app);
      document.body.append(host);
      try {
        renderer.mount(host);
        expect(host.textContent).toContain('1404');
        expect(host.textContent).toMatch(/Farvardin|FARVARDIN|Far/);
        expect(host.textContent).not.toContain('January');
      } finally {
        renderer.unmount();
        host.remove();
      }
    }
  );

  it('buckets a fixed-week year event into the Persian month and leap year', () => {
    const months = buildFixedWeekMonthsData({
      currentYear: 1403,
      locale: 'en-US-u-ca-persian',
      startOfWeek: 6,
      calendarSystem: 'jalali',
      totalColumns: getFixedWeekTotalColumns(1403, 6, 'jalali'),
      yearEvents: [
        {
          id: 'leap',
          title: 'Leap day',
          start: Temporal.PlainDate.from('2025-03-20'),
          end: Temporal.PlainDate.from('2025-03-20'),
          allDay: true,
        },
      ],
    });
    expect(months).toHaveLength(12);
    expect(months[11]?.days.filter(Boolean)).toHaveLength(30);
    expect(months[11]?.monthEvents.map(event => event.id)).toEqual(['leap']);
    expect(months[11]?.eventSegments[0]?.endCellIndex).toBe(
      months[11]?.days.findIndex(
        day => day?.getTime() === new Date(2025, 2, 20).getTime()
      )
    );
    expect(months[0]?.monthEvents).toEqual([]);
  });

  it('constrains month-end navigation and crosses the Persian year boundary', () => {
    const shahrivar31 = calendarDateToDate(
      { year: 1404, month: 6, day: 31 },
      'jalali'
    );
    expect(
      dateToCalendarDate(addCalendarMonths(shahrivar31, 1, 'jalali'), 'jalali')
    ).toEqual({ year: 1404, month: 7, day: 30 });
    const esfand30 = calendarDateToDate(
      { year: 1403, month: 12, day: 30 },
      'jalali'
    );
    expect(
      dateToCalendarDate(addCalendarMonths(esfand30, 12, 'jalali'), 'jalali')
    ).toEqual({ year: 1404, month: 12, day: 29 });
    expect(() =>
      calendarDateToDate({ year: 1404, month: 12, day: 30 }, 'jalali')
    ).toThrow(RangeError);
  });

  it('round-trips complete leap and common years using local date fields', () => {
    for (let year = 1403; year <= 1404; year++) {
      const start = calendarDateToDate({ year, month: 1, day: 1 }, 'jalali');
      const end = calendarDateToDate(
        { year: year + 1, month: 1, day: 1 },
        'jalali'
      );
      for (
        let day = new Date(start);
        day < end;
        day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
      ) {
        expect(
          calendarDateToDate(dateToCalendarDate(day, 'jalali'), 'jalali')
        ).toEqual(day);
      }
    }
  });

  it('navigates months without changing event identities or firing event callbacks', () => {
    const app = makeApp();
    const onEventUpdate = vi.fn();
    app.updateConfig({ callbacks: { onEventUpdate } });
    app.addEvent({
      id: 'nowruz',
      title: 'Nowruz',
      start: Temporal.PlainDate.from('2025-03-21'),
      end: Temporal.PlainDate.from('2025-03-21'),
      allDay: true,
    });
    const before = app.getAllEvents()[0];
    app.goToPrevious();
    expect(dateToCalendarDate(app.getCurrentDate(), 'jalali')).toEqual({
      year: 1403,
      month: 12,
      day: 1,
    });
    app.goToNext();
    expect(app.getCurrentDate()).toEqual(new Date(2025, 2, 21));
    app.updateConfig({ calendarSystem: 'gregorian' });
    expect(app.getVisibleMonth()).toEqual(new Date(2025, 2, 1));
    expect(app.getAllEvents()[0]).toBe(before);
    expect(onEventUpdate).not.toHaveBeenCalled();
  });

  it('syncs changes through framework adapters', () => {
    const config = { views: [] };
    const before = createConfigSyncSnapshot(config);
    const after = createConfigSyncSnapshot({
      ...config,
      calendarSystem: 'jalali',
    });
    expect(
      getSyncConfigUpdates(before.syncableConfig, after.syncableConfig)
    ).toEqual({ calendarSystem: 'jalali' });
  });

  it('generates leap-day and Nowruz metadata while retaining ISO Date objects', () => {
    const week = generateWeekData(new Date(2025, 2, 15), 'jalali');
    expect(week.days.map(day => day.day)).toEqual([25, 26, 27, 28, 29, 30, 1]);
    expect(week.days.at(-1)?.date).toEqual(new Date(2025, 2, 21));
    expect(week.days.at(-1)?.year).toBe(1404);
    expect(week.days.at(-1)?.monthName).toBe('Farvardin');
    const labels = buildWeekDates(
      new Date(2025, 2, 15),
      Array.from({ length: 7 }, () => ''),
      calendarLocale('en-US', 'jalali'),
      'Asia/Tehran'
    );
    expect(labels.map(day => day.date)).toEqual([25, 26, 27, 28, 29, 30, 1]);
  });

  it('renders a Farvardin grid with ISO event placement', () => {
    const app = makeApp();
    app.addEvent({
      id: 'nowruz',
      title: 'Nowruz fixture',
      start: Temporal.PlainDate.from('2025-03-21'),
      end: Temporal.PlainDate.from('2025-03-21'),
      allDay: true,
    });
    const host = document.createElement('div');
    const renderer = new CalendarRenderer(app);
    document.body.append(host);
    try {
      renderer.mount(host);
      expect(host.textContent).toContain('Farvardin 1404');
      expect(host.textContent).toContain('Nowruz fixture');
      expect(host.querySelectorAll('.df-month-date-number')).toHaveLength(42);
    } finally {
      renderer.unmount();
      host.remove();
    }
  });

  it('selects a Jalali mini-calendar day as the corresponding ISO date', () => {
    const onDateSelect = vi.fn();
    const { container } = render(
      <LocaleProvider locale='en-US' calendarSystem='jalali'>
        <MiniCalendar
          showHeader
          visibleMonth={new Date(2025, 2, 21)}
          currentDate={new Date(2025, 2, 21)}
          onMonthChange={vi.fn()}
          onDateSelect={onDateSelect}
        />
      </LocaleProvider>
    );
    expect(
      container.querySelector('.df-mini-calendar-month-label')?.textContent
    ).toBe('Farvardin 1404');
    const first = Array.from(container.querySelectorAll('button')).find(
      button =>
        button.textContent === '1' && button.dataset.otherMonth === undefined
    );
    expect(first).toBeDefined();
    fireEvent.click(first!);
    expect(onDateSelect).toHaveBeenCalledWith(new Date(2025, 2, 21));
  });

  it('parses Persian year fields using the reference calendar', () => {
    const reference = Temporal.ZonedDateTime.from(
      '2025-03-21T10:00:00+03:30[Asia/Tehran]'
    ).withCalendar('persian');
    const value = parseTemporalString(
      '1404-01-03',
      buildParseRegExp('YYYY-MM-DD'),
      reference,
      'Asia/Tehran'
    );
    expect(value?.withCalendar('iso8601').toPlainDate().toString()).toBe(
      '2025-03-23'
    );
    expect(value?.hour).toBe(10);
    expect(
      parseTemporalString(
        '۱۴۰۴-۰۱-۰۳',
        buildParseRegExp('YYYY-MM-DD'),
        reference,
        'Asia/Tehran'
      )?.epochMilliseconds
    ).toBe(value?.epochMilliseconds);
    expect(
      parseTemporalString(
        '04-01-03',
        buildParseRegExp('YY-MM-DD'),
        reference,
        'Asia/Tehran'
      )?.epochMilliseconds
    ).toBe(value?.epochMilliseconds);
    expect(
      parseTemporalString(
        '1404-12-30',
        buildParseRegExp('YYYY-MM-DD'),
        reference,
        'Asia/Tehran'
      )
    ).toBeNull();
  });

  it('edits Jalali picker dates and returns ISO values with the original timezone', async () => {
    const onOk = vi.fn();
    const start = Temporal.ZonedDateTime.from(
      '2025-03-21T10:00:00+03:30[Asia/Tehran]'
    );
    const { container, getByText } = render(
      <RangePicker
        value={[start, start.add({ hours: 1 })]}
        calendarSystem='jalali'
        locale='en-US'
        timeZone='Asia/Tehran'
        onOk={onOk}
      />
    );
    const input = container.querySelector('input');
    expect(input?.value).toContain('1404');
    fireEvent.click(input!);
    await waitFor(() =>
      expect(
        document.querySelector('.df-range-picker-calendar-title')?.textContent
      ).toContain('Farvardin')
    );
    const third = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.df-range-picker-day-cell')
    ).find(
      button => button.textContent === '3' && button.dataset.outside === 'false'
    );
    fireEvent.click(third!);
    fireEvent.click(getByText('OK'));
    expect(onOk.mock.calls[0][0][0].calendarId).toBe('iso8601');
    expect(onOk.mock.calls[0][0][0].toPlainDate().toString()).toBe(
      '2025-03-23'
    );
    expect(onOk.mock.calls[0][0][0].hour).toBe(10);
  });
});
