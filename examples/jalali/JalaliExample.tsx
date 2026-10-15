import { CalendarSystem, Event } from '@dayflow/core';
import { createDragPlugin } from '@dayflow/plugin-drag';
import { createLocalizationPlugin, fa } from '@dayflow/plugin-localization';
import {
  DayFlowCalendar,
  createAgendaView,
  createDayView,
  createMonthView,
  createWeekView,
  createYearView,
  useCalendarApp,
} from '@dayflow/react';
import { useMemo, useState } from 'react';
import { Temporal } from 'temporal-polyfill';

/** Standalone Persian calendar example; events keep their original ISO dates. */
export default function JalaliExample() {
  const [system, setSystem] = useState<CalendarSystem>('jalali');
  const [language, setLanguage] = useState('fa-IR');
  const [scrolling, setScrolling] = useState(false);
  const views = useMemo(
    () => [
      createMonthView({
        startOfWeek: 6,
        scroll: { disabled: !scrolling, transition: 'fade' },
      }),
      createWeekView({ startOfWeek: 6 }),
      createDayView(),
      createAgendaView(),
      createYearView({ mode: 'grid', startOfWeek: 6 }),
    ],
    [scrolling]
  );
  const plugins = useMemo(
    () => [createDragPlugin(), createLocalizationPlugin({ locales: [fa] })],
    []
  );
  const [events, setEvents] = useState<Event[]>([
    {
      id: 'nowruz',
      title: 'نوروز · Nowruz',
      allDay: true,
      start: Temporal.PlainDate.from('2025-03-21'),
      end: Temporal.PlainDate.from('2025-03-21'),
    },
    {
      id: 'meeting',
      title: 'جلسه پروژه · Project meeting',
      start: Temporal.ZonedDateTime.from(
        '2025-03-23T10:00:00+03:30[Asia/Tehran]'
      ),
      end: Temporal.ZonedDateTime.from(
        '2025-03-23T11:00:00+03:30[Asia/Tehran]'
      ),
    },
  ]);
  const calendar = useCalendarApp({
    views,
    plugins,
    events,
    initialDate: new Date(2025, 2, 21),
    defaultView: 'month',
    calendarSystem: system,
    locale: language,
    timeZone: 'Asia/Tehran',
    callbacks: {
      onEventUpdate: event =>
        setEvents(previous =>
          previous.map(item => (item.id === event.id ? event : item))
        ),
      onEventCreate: event => setEvents(previous => [...previous, event]),
      onEventDelete: id =>
        setEvents(previous => previous.filter(event => event.id !== id)),
    },
  });

  return (
    <main
      style={{
        padding: 24,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ fontSize: 22 }}>DayFlow · تقویم جلالی</h1>
        <button
          type='button'
          onClick={() =>
            setSystem(value => (value === 'jalali' ? 'gregorian' : 'jalali'))
          }
        >
          {system === 'jalali' ? 'Switch to Gregorian' : 'Switch to Jalali'}
        </button>
        <button
          type='button'
          onClick={() =>
            setLanguage(value => (value === 'fa-IR' ? 'en-US' : 'fa-IR'))
          }
        >
          {language === 'fa-IR' ? 'English labels' : 'برچسب‌های فارسی'}
        </button>
        <button type='button' onClick={() => setScrolling(value => !value)}>
          {scrolling ? 'Paged months' : 'Scrolling months'}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DayFlowCalendar calendar={calendar} />
      </div>
    </main>
  );
}
