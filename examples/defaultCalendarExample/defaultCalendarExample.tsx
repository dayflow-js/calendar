import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { createDragPlugin } from '@dayflow/plugin-drag';
import { createKeyboardShortcutsPlugin } from '@dayflow/plugin-keyboard-shortcuts';
import { createSidebarPlugin } from '@dayflow/plugin-sidebar';
import { Event, CalendarType } from '@dayflow/core';
import { Sun, Moon } from 'lucide-react';
import { generateSampleEvents } from '../utils/sampleData';
import { getWebsiteCalendars } from '../utils/palette';

interface DefaultCalendarExampleProps {}

const DefaultCalendarExample: React.FC<DefaultCalendarExampleProps> = () => {
  const [events] = useState<Event[]>(generateSampleEvents());
  const calendarRef = useRef<UseCalendarAppReturn | null>(null);

  const [isMobile, setIsMobile] = React.useState(true);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const dragPlugin = useMemo(() => createDragPlugin(), []);
  const keyboardPlugin = useMemo(() => createKeyboardShortcutsPlugin(), []);
  const sidebarPlugin = createSidebarPlugin({
    createCalendarMode: 'modal',
    colorPickerMode: 'blossom',
  });

  const calendar = useCalendarApp({
    views: [
      createDayView(),
      createWeekView(),
      createMonthView(),
      createYearView({
        mode: 'fixed-week',
      }),
    ],
    events: events,
    calendars: getWebsiteCalendars(),
    defaultCalendar: 'work',
    plugins: [keyboardPlugin, sidebarPlugin, dragPlugin],
    defaultView: ViewType.MONTH,
    useEventDetailDialog: true,
    theme: { mode: 'auto' as const },
    // switcherMode: 'select' as const,
    // readOnly: true,
    callbacks: {
      onEventCreate: async (event: Event) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('create event:', event);
      },
      onEventClick: async (event: Event) => {
        console.log('click event:', event);
      },
      onEventUpdate: async (event: Event) => {
        console.log('update event:', event);
      },
      onEventDelete: async (eventId: string) => {
        console.log('delete event:', eventId);
      },
      onMoreEventsClick: async (date: Date) => {
        console.log('more events click date:', date);
        calendarRef.current?.selectDate(date);
        calendarRef.current?.changeView(ViewType.DAY);
      },
      onCalendarUpdate: async (calendar: CalendarType) => {
        console.log('update calendar:', calendar);
      },
      onCalendarDelete: async (calendarId: string) => {
        console.log('delete calendar:', calendarId);
      },
      onCalendarCreate: async (calendar: CalendarType) => {
        console.log('create calendar:', calendar);
      },
      onCalendarMerge: async (sourceId: string, targetId: string) => {
        console.log('merge calendar:', sourceId, targetId);
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
    <div className="flex items-center gap-4 shrink-0">
      <button
        onClick={toggleTheme}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        <span className="text-sm font-medium">{isDark ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  );
};

export function CalendarTypesExample() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-2 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="">
        {/* Header */}
        <div className="flex justify-between gap-4 mb-4 px-4 items-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Calendar Example
            </h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Calendar Instance */}
        <div className="px-4 my-4 pb-4 mb-4">
          <DefaultCalendarExample />
        </div>
      </div>
    </div>
  );
}

export default CalendarTypesExample;
