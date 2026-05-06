import {
  Event,
  CalendarType,
  EventChange,
  ReadOnlyConfig,
  TimeZone,
  ViewType,
} from '@dayflow/core';
import { createDragPlugin } from '@dayflow/plugin-drag';
import { createLocalizationPlugin, zh } from '@dayflow/plugin-localization';
import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createWeekView,
  createDayView,
  createYearView,
  UseCalendarAppReturn,
} from '@dayflow/react';
import { getWebsiteCalendars } from '@examples/utils/palette';
import { generateSampleEvents } from '@examples/utils/sampleData';
import { createKeyboardShortcutsPlugin } from '@keyboard-shortcuts/plugin';
import { createSidebarPlugin } from '@sidebar/plugin';
import { Sun, Moon, Globe, Clock } from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';

const TZ_OPTIONS = Object.entries(TimeZone).map(([key, value]) => ({
  label: `${key.replaceAll('_', ' ')} (${value})`,
  value,
}));

const hasRedo = (app: object): app is object & { redo: () => void } =>
  'redo' in app && typeof app.redo === 'function';

type ExampleThemeMode = 'light' | 'dark';

const getInitialThemeMode = (): ExampleThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }

  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const DefaultCalendarExample: React.FC<{
  themeMode: ExampleThemeMode;
}> = ({ themeMode }) => {
  const [events] = useState<Event[]>(generateSampleEvents());
  const calendarRef = useRef<UseCalendarAppReturn | null>(null);
  const [readOnly] = useState<boolean | ReadOnlyConfig>(false);
  // Global calendar timezone — affects all views' event bucketing and editing
  const [appTz, setAppTz] = useState<string>('');
  // Secondary timezone — only adds a second timeline label column in Day/Week
  const [secondaryTz, setSecondaryTz] = useState<string>('');

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const plugins = useMemo(
    () =>
      [
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
          // colorPickerMode: 'default',
          showEventDots: true,
        }),
        createLocalizationPlugin({
          locales: [zh],
        }),
        createKeyboardShortcutsPlugin({
          callbacks: {
            redo: app => {
              console.log('Redo triggered via callback!', app);
              // You can add custom redo logic here if app.redo() is not enough
              if (hasRedo(app)) {
                app.redo();
              }
            },
            undo: app => {
              console.log('Undo triggered via callback!');
              app.undo();
            },
            delete: (app, event) => {
              console.log('Delete triggered via callback!', event);
              if (!event) return;
              app.deleteEvent(event.id);
              app.selectEvent(null);
              console.log(`Deleted event without confirmation: ${event.title}`);
            },
          },
        }),
      ].filter(plugin => !(isMobile && plugin.name === 'sidebar')),
    [isMobile]
  );

  const searchConfig = useMemo(
    () => ({
      onResultClick: ({
        event,
        defaultAction,
      }: {
        event: Event;
        defaultAction: () => void;
      }) => {
        console.log('Search result clicked:', event);
        defaultAction();
      },
    }),
    []
  );

  const views = useMemo(
    () => [
      createDayView({
        // timeFormat: '12h',
        secondaryTimeZone: secondaryTz || undefined,
        showEventDots: true,
        scrollToCurrentTime: true,
      }),
      createWeekView({
        // timeFormat: '12h',
        secondaryTimeZone: secondaryTz || undefined,
        // startOfWeek: 2,
        // showAllDay: false,
        showEventDots: true,
        scrollToCurrentTime: true,
      }),
      createMonthView({
        showWeekNumbers: true,
        // showMonthIndicator: false,
        showEventDots: true,
      }),
      createYearView({
        mode: 'fixed-week',
        showTimedEventsInYearView: true,
        startOfWeek: 7,
        showEventDots: true,
      }),
    ],
    [secondaryTz]
  );

  const calendars = useMemo(() => getWebsiteCalendars(), []);

  const callbacks = useMemo(
    () => ({
      onEventCreate: async (event: Event) => {
        await new Promise(resolve => {
          setTimeout(resolve, 500);
        });
        console.log('create event:', event);
      },
      onEventClick: (event: Event) => {
        console.log('click event:', event);
      },
      onEventDoubleClick: (event: Event) => {
        console.log('double click event:', event);
        // You could use the event element as an anchor for a custom popover here
        return true;
      },
      onEventUpdate: async (event: Event) => {
        await new Promise(resolve => {
          setTimeout(resolve, 1500);
        });
        console.log('update event:', event);
      },
      onEventDelete: async (eventId: string) => {
        await new Promise(resolve => {
          setTimeout(resolve, 1500);
        });
        console.log('delete event:', eventId);
      },
      onMoreEventsClick: (date: Date) => {
        console.log('more events click date:', date);
        calendarRef.current?.selectDate(date);
        calendarRef.current?.changeView(ViewType.DAY);
      },
      onCalendarUpdate: async (cal: CalendarType) => {
        await new Promise(resolve => {
          setTimeout(resolve, 1500);
        });
        console.log('update calendar:', cal);
      },
      onCalendarDelete: async (calendarId: string) => {
        await new Promise(resolve => {
          setTimeout(resolve, 1500);
        });
        console.log('delete calendar:', calendarId);
      },
      onCalendarCreate: async (cal: CalendarType) => {
        await new Promise(resolve => {
          setTimeout(resolve, 1500);
        });
        console.log('create calendar: w', cal);
      },
      onCalendarMerge: async (sourceId: string, targetId: string) => {
        await new Promise(resolve => {
          setTimeout(resolve, 1500);
        });
        console.log('merge calendar:', sourceId, targetId);
      },
      onEventBatchChange: (event: EventChange[]) => {
        console.log('batch change events:', event);
      },
    }),
    []
  );

  const calendar = useCalendarApp({
    timeZone: appTz || undefined,
    views,
    theme: { mode: themeMode },
    events: events,
    calendars,
    defaultCalendar: 'work',
    // useEventDetailDialog: true,
    // switcherMode: 'select',
    plugins,
    // locale: zh,
    defaultView: ViewType.MONTH,
    // useEventDetailDialog: true,
    // switcherMode: 'select' as const,
    // readOnly,
    callbacks,
  });

  calendarRef.current = calendar;

  return (
    <div>
      <div className='mb-4 flex flex-wrap items-center gap-3 px-4'>
        {/* Global calendar timezone */}
        <div className='flex min-w-[18rem] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 shadow-sm md:min-w-88 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200'>
          <Globe size={16} className='text-gray-400' />
          <div className='flex min-w-0 flex-1 flex-col'>
            <span className='text-[10px] leading-none text-gray-400 dark:text-gray-500'>
              Calendar Timezone
            </span>
            <select
              value={appTz}
              onChange={e => setAppTz(e.target.value)}
              className='w-full bg-transparent pr-6 text-sm font-medium outline-none'
            >
              <option value=''>Device local</option>
              {TZ_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary timeline for Day/Week */}
        <div className='flex min-w-[18rem] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 shadow-sm md:min-w-88 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200'>
          <Clock size={16} className='text-gray-400' />
          <div className='flex min-w-0 flex-1 flex-col'>
            <span className='text-[10px] leading-none text-gray-400 dark:text-gray-500'>
              Secondary Timeline (Day/Week)
            </span>
            <select
              value={secondaryTz}
              onChange={e => setSecondaryTz(e.target.value)}
              className='w-full bg-transparent pr-6 text-sm font-medium outline-none'
            >
              <option value=''>None</option>
              {TZ_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <DayFlowCalendar
        calendar={calendar}
        search={searchConfig}
        // eventContentDay={({ event, isSelected }) => (
        //   <div
        //     className='flex h-full flex-col justify-start overflow-hidden border-l-4'
        //     style={{
        //       borderTopLeftRadius: '4px',
        //       borderBottomLeftRadius: '4px',
        //       borderColor: getLineColor(event.calendarId || 'blue'),
        //     }}
        //   >
        //     <div className='flex items-center gap-1 px-0.5'>
        //       <span className='shrink-0 text-[10px]'>📅</span>
        //       <span
        //         className={`truncate text-xs font-semibold ${isSelected ? 'text-white' : ''}`}
        //       >
        //         {event.title}
        //       </span>
        //     </div>
        //     <div className='flex flex-col px-1'>
        //       <span
        //         className={`truncate text-[10px] opacity-70 ${isSelected ? 'text-white' : ''}`}
        //       >
        //         📍 {`${event.meta?.location || 'No location'}`}
        //       </span>
        //       <span
        //         className={`text-[10px] opacity-60 ${isSelected ? 'text-white' : ''}`}
        //       >
        //         {event.description}
        //       </span>
        //     </div>
        //   </div>
        // )}
        // eventContentWeek={({ event, isSelected }) => (
        //   <div
        //     className='flex h-full flex-col justify-start overflow-hidden border-l-4 border-black/20 pr-0.5 pl-1'
        //     style={{
        //       borderTopLeftRadius: '4px',
        //       borderBottomLeftRadius: '4px',
        //       borderColor: getLineColor(event.calendarId || 'blue'),
        //     }}
        //   >
        //     <div className='flex items-center gap-1 px-0.5'>
        //       <EventIcon calendarId={event.calendarId} defaultIcon='🗓' />
        //       <span
        //         className={`text-xs font-semibold ${isSelected ? 'text-white' : ''}`}
        //       >
        //         {event.title}
        //       </span>
        //     </div>
        //     <div className='flex flex-col'>
        //       <span
        //         className={`text-[9px] opacity-70 ${isSelected ? 'text-white' : ''}`}
        //       >
        //         📍 {`${event.meta?.location || 'No location'}`}
        //       </span>
        //       <span
        //         className={`text-[9px] opacity-60 ${isSelected ? 'text-white' : ''}`}
        //       >
        //         {event.description}
        //       </span>
        //     </div>
        //   </div>
        // )}
        // eventContentMonth={({ event }) => (
        //   <div className='flex items-center gap-1 overflow-hidden px-0.5'>
        //     <EventIcon calendarId={event.calendarId} defaultIcon='🗃' />
        //     <span className='truncate text-xs font-medium'>{event.title}</span>
        //   </div>
        // )}
        // eventContentYear={({ event }) => (
        //   <div className='flex items-center gap-1 overflow-hidden px-0.5'>
        //     <EventIcon calendarId={event.calendarId} defaultIcon='🗃' />
        //     <span className='truncate text-xs font-medium'>{event.title}</span>
        //   </div>
        // )}
        // eventContentAllDayDay={({ event }) => (
        //   <div className='flex h-full items-center gap-1 overflow-hidden px-0.5'>
        //     <EventIcon calendarId={event.calendarId} defaultIcon='☀️' />
        //     <span className='truncate text-xs font-medium'>{event.title}</span>
        //   </div>
        // )}
        // eventContentAllDayWeek={({ event }) => (
        //   <div className='flex h-full items-center gap-1 overflow-hidden px-0.5'>
        //     <EventIcon calendarId={event.calendarId} defaultIcon='☀️' />
        //     <span className='truncate text-xs font-medium'>{event.title}</span>
        //   </div>
        // )}
        // eventContentAllDayMonth={({ event }) => (
        //   <div className='flex h-full items-center gap-1 overflow-hidden px-0.5'>
        //     <EventIcon calendarId={event.calendarId} defaultIcon='☀️' />
        //     <span className='truncate text-xs font-medium'>{event.title}</span>
        //   </div>
        // )}
        // eventContentAllDayYear={({ event }) => (
        //   <div className='flex h-full items-center gap-1 overflow-hidden px-0.5'>
        //     <EventIcon calendarId={event.calendarId} defaultIcon='☀️' />
        //     <span className='truncate text-xs font-medium'>{event.title}</span>
        //   </div>
        // )}
      />
    </div>
  );
};

const ThemeToggle = ({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) => (
  <div className='flex shrink-0 items-center gap-4'>
    <button
      type='button'
      onClick={onToggle}
      className='flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span className='text-sm font-medium'>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  </div>
);

export function CalendarTypesExample() {
  const [themeMode, setThemeMode] =
    useState<ExampleThemeMode>(getInitialThemeMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', themeMode === 'dark');
    root.classList.toggle('light', themeMode === 'light');
    localStorage.theme = themeMode;
  }, [themeMode]);

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
          <ThemeToggle
            isDark={themeMode === 'dark'}
            onToggle={() =>
              setThemeMode(current => (current === 'dark' ? 'light' : 'dark'))
            }
          />
        </div>

        {/* Calendar Instance */}
        <div>
          <DefaultCalendarExample themeMode={themeMode} />
        </div>
      </div>
    </div>
  );
}

export default CalendarTypesExample;
