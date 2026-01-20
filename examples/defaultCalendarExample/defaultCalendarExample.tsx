import React, { useState, useRef, useEffect } from 'react';
import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createWeekView,
  createDayView,
  CalendarType,
  Event,
  createDragPlugin,
  createYearView,
  CalendarApp,
  ja,
  ko,
  zh,
  fr
} from '../../src';
import { Sun, Moon } from 'lucide-react';
import { generateSampleEvents } from '../../website/utils/sampleData';
import { getWebsiteCalendars } from '../../website/utils/palette';

const DefaultCalendarExample: React.FC = () => {
  const [events] = useState<Event[]>(generateSampleEvents());

  const dragPlugin = createDragPlugin({
    enableDrag: true,
    enableResize: true,
    enableCreate: true,
  });

  const calendar = useCalendarApp({
    views: [createDayView(), createWeekView(), createMonthView()],
    events: events,
    calendars: getWebsiteCalendars(),
    defaultCalendar: 'work',
    plugins: [dragPlugin],
    // locale: zh, // ja | ko | fr
    theme: { mode: 'auto' },
    useSidebar: {
      createCalendarMode: 'modal'
    },
    callbacks: {
      onCalendarUpdate: async (calendar) => {
        console.log('update calendar:', calendar);
      },
      onCalendarDelete: async (calendar) => {
        console.log('delete calendar:', calendar);
      },
      onCalendarCreate: async (calendar) => {
        console.log('create calendar:', calendar);
      },
      onCalendarMerge: async (sourceId, targetId) => {
        console.log('merge calendar:', sourceId, targetId);
      },
    }
  });

  return (
    <div>
      <DayFlowCalendar calendar={calendar} />
    </div>
  );
};

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark') ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors shadow-sm shrink-0"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span className="text-sm font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
};

export function CalendarTypesExample() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Calendar Example</h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Calendar Instance */}
        <div className='px-8 my-4 pb-4 mb-4'>
          <DefaultCalendarExample />
        </div>
      </div>
    </div>
  );
}


export default CalendarTypesExample;