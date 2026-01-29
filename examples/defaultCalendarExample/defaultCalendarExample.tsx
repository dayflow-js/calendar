import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  fr,
  ViewType,
  MobileEventProps,
  t
} from '../../src';
import { Sun, Moon, X } from 'lucide-react';
import { generateSampleEvents } from '../utils/sampleData';
import { getWebsiteCalendars } from '../utils/palette';


interface DefaultCalendarExampleProps {
  useCustomMobileEditor: boolean;
}

const DefaultCalendarExample: React.FC<DefaultCalendarExampleProps> = ({ useCustomMobileEditor }) => {
  const [events] = useState<Event[]>(generateSampleEvents());
  const calendarRef = useRef<any>(null);

  const [isMobile, setIsMobile] = React.useState(true);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const dragPlugin = useMemo(() => createDragPlugin(), []);

  const config = useMemo(() => ({
    views: [
      createDayView(),
      createWeekView(),
      createMonthView(),
      createYearView(),
    ],
    events: events,
    calendars: getWebsiteCalendars(),
    defaultCalendar: 'work',
    plugins: [dragPlugin],
    defaultView: ViewType.MONTH,
    theme: { mode: 'auto' as const },
    // switcherMode: 'select' as const,
    useSidebar: window.innerWidth < 768 ? false : true,
    // readOnly: true,
    callbacks: {
      onEventCreate: async (event: any) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('create event:', event);
      },
      onEventClick: async (event: any) => {
        console.log('click event:', event);
      },
      onEventUpdate: async (event: any) => {
        console.log('update event:', event);
      },
      onMoreEventsClick: async (date: any) => {
        console.log('more events click date:', date);
        calendarRef.current?.selectDate(date);
        calendarRef.current?.changeView(ViewType.DAY);
      },
      onCalendarUpdate: async (calendar: any) => {
        console.log('update calendar:', calendar);
      },
      onCalendarDelete: async (calendar: any) => {
        console.log('delete calendar:', calendar);
      },
      onCalendarCreate: async (calendar: any) => {
        console.log('create calendar:', calendar);
      },
      onCalendarMerge: async (sourceId: any, targetId: any) => {
        console.log('merge calendar:', sourceId, targetId);
      },
    }
  }), [events, dragPlugin, useCustomMobileEditor, isMobile]);

  const calendar = useCalendarApp(config);

  calendarRef.current = calendar;

  return (
    <div>
      <DayFlowCalendar calendar={calendar} />
    </div>
  );
};

const ThemeToggle = ({ }: {}) => {
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
  const [useCustomMobileEditor, setUseCustomMobileEditor] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-2 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Calendar Example</h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Calendar Instance */}
        <div className='px-0.5 my-4 pb-4 mb-4'>
          <DefaultCalendarExample useCustomMobileEditor={useCustomMobileEditor} />
        </div>
      </div>
    </div>
  );
}


export default CalendarTypesExample;