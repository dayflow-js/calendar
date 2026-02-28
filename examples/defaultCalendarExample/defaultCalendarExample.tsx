import { Event, CalendarType, EventChange } from '@dayflow/core';
import { createDragPlugin } from '@dayflow/plugin-drag';
import { createLocalizationPlugin, zh } from '@dayflow/plugin-localization';
import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createWeekView,
  createDayView,
  createYearView,
  ViewType,
  UseCalendarAppReturn,
} from '@dayflow/react';
import { getWebsiteCalendars } from '@examples/utils/palette';
import { generateSampleEvents } from '@examples/utils/sampleData';
import { createSidebarPlugin } from '@sidebar/plugin';
import { Sun, Moon } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

const DefaultCalendarExample: React.FC = () => {
  const [events] = useState<Event[]>(generateSampleEvents());
  const calendarRef = useRef<UseCalendarAppReturn | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const plugins = [
    createDragPlugin({
      onEventDrop: (updatedEvent, _) => {
        console.log('onEventDrop:', updatedEvent);
      },
      onEventResize: (updatedEvent, _) => {
        console.log('onEventResize:', updatedEvent);
      },
    }),
    createSidebarPlugin({
      createCalendarMode: 'modal',
      colorPickerMode: 'default',
    }),
    createLocalizationPlugin({
      locales: [zh],
    }),
  ].filter(plugin => !(isMobile && plugin.name === 'sidebar'));

  const calendar = useCalendarApp({
    views: [
      createDayView({
        // timeFormat: '12h',
        // secondaryTimeZone: TimeZone.SYDNEY,
      }),
      createWeekView({
        // mode: 'compact',
        // timeFormat: '12h',
        // secondaryTimeZone: TimeZone.SHANGHAI,
        // startOfWeek: 2,
        // showAllDay: false,
      }),
      createMonthView({
        showWeekNumbers: true,
        // showMonthIndicator: false,
      }),
      createYearView({
        // mode: 'fixed-week',
        showTimedEventsInYearView: true,
        startOfWeek: 7,
      }),
    ],
    events: events,
    calendars: getWebsiteCalendars(),
    defaultCalendar: 'work',
    // useEventDetailDialog: true,
    // switcherMode: 'select',
    plugins: plugins,
    // locale: zh,
    defaultView: ViewType.MONTH,
    // useEventDetailDialog: true,
    theme: { mode: 'auto' as const },
    // switcherMode: 'select' as const,
    // readOnly: {
    //   viewable: true,
    // },
    callbacks: {
      onEventCreate: async (event: Event) => {
        await new Promise(resolve => {
          setTimeout(resolve, 500);
        });
        console.log('create event:', event);
      },
      onEventClick: (event: Event) => {
        console.log('click event:', event);
      },
      onEventUpdate: (event: Event) => {
        console.log('update event:', event);
      },
      onEventDelete: (eventId: string) => {
        console.log('delete event:', eventId);
      },
      onMoreEventsClick: (date: Date) => {
        console.log('more events click date:', date);
        calendarRef.current?.selectDate(date);
        calendarRef.current?.changeView(ViewType.DAY);
      },
      onCalendarUpdate: (cal: CalendarType) => {
        console.log('update calendar:', cal);
      },
      onCalendarDelete: (calendarId: string) => {
        console.log('delete calendar:', calendarId);
      },
      onCalendarCreate: (cal: CalendarType) => {
        console.log('create calendar:', cal);
      },
      onCalendarMerge: (sourceId: string, targetId: string) => {
        console.log('merge calendar:', sourceId, targetId);
      },
      onEventBatchChange: (event: EventChange[]) => {
        console.log('batch change events:', event);
      },
    },
  });

  calendarRef.current = calendar;

  return (
    <div>
      <DayFlowCalendar calendar={calendar} />
    </div>
  );
};

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (
      document.documentElement.classList.contains('dark') ||
      (!('theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  };

  return (
    <div className='flex shrink-0 items-center gap-4'>
      <button
        type='button'
        onClick={toggleTheme}
        className='flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        <span className='text-sm font-medium'>{isDark ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  );
};

export function CalendarTypesExample() {
  return (
    <div className='min-h-screen bg-gray-50 p-2 text-gray-900 transition-colors duration-200 dark:bg-slate-950 dark:text-gray-100'>
      <div className=''>
        {/* Header */}
        <div className='mb-4 flex items-center justify-between gap-4 px-4'>
          <div className='space-y-4'>
            <h1 className='text-3xl font-bold tracking-tight'>
              Calendar Example
            </h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Calendar Instance */}
        <div>
          <DefaultCalendarExample />
        </div>
      </div>
    </div>
  );
}

export default CalendarTypesExample;
