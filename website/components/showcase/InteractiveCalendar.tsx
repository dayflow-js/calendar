'use client';

import { createDragPlugin } from '@dayflow/plugin-drag';
import { createKeyboardShortcutsPlugin } from '@dayflow/plugin-keyboard-shortcuts';
import {
  createLocalizationPlugin,
  zh,
  ja,
  ko,
  fr,
  de,
  es,
} from '@dayflow/plugin-localization';
import { createSidebarPlugin } from '@dayflow/plugin-sidebar';
import {
  useCalendarApp,
  DayFlowCalendar,
  createDayView,
  createWeekView,
  createMonthView,
  ViewType,
  createYearView,
  UseCalendarAppReturn,
  TimeZone,
  CalendarAppConfig,
} from '@dayflow/react';
import { CircleAlert } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useTransition,
} from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getWebsiteCalendars } from '@/utils/palette';
import { generateSampleEvents } from '@/utils/sampleData';

const calendarTypes = getWebsiteCalendars();

const LOCALES_OPTIONS = [
  { label: 'English', value: 'en', data: null },
  { label: 'Chinese', value: 'zh', data: zh },
  { label: 'Japanese', value: 'ja', data: ja },
  { label: 'Korean', value: 'ko', data: ko },
  { label: 'French', value: 'fr', data: fr },
  { label: 'German', value: 'de', data: de },
  { label: 'Spanish', value: 'es', data: es },
];

const VIEW_OPTIONS = [
  { label: 'Day', value: ViewType.DAY },
  { label: 'Week', value: ViewType.WEEK },
  { label: 'Month', value: ViewType.MONTH },
  { label: 'Year', value: ViewType.YEAR },
];

const TIME_ZONE_OPTIONS = Object.entries(TimeZone);

const formatTimeZoneLabel = (timeZone: string) =>
  timeZone
    .split('/')
    .map(part => part.replaceAll('_', ' '))
    .join(' / ');

interface CalendarViewerProps {
  config: CalendarAppConfig;
  calendarRef: React.MutableRefObject<UseCalendarAppReturn | null>;
  /** Opaque token that forces a new CalendarApp (and Preact re-render) without
   *  unmounting the React component. DayFlowCalendar's useLayoutEffect([app])
   *  swaps the Preact renderer before the browser paints — no blank flash. */
  version: string;
  search?: unknown;
}

/**
 * Sub-component to handle the calendar instance.
 * Defined outside InteractiveCalendar so its identity is stable across re-renders —
 * otherwise React treats it as a new component type on every parent render and
 * unmounts/remounts it (causing flicker in Month View cells).
 *
 * key   → structural changes (locale, views, yearMode) that need a fresh component tree.
 * version → plugin changes (sidebar, drag, shortcuts, eventDots) that only need a new
 *           CalendarApp; the DOM stays alive and DayFlowCalendar hot-swaps the Preact
 *           renderer via useLayoutEffect before the first paint.
 */
function CalendarViewer({
  config,
  calendarRef,
  version,
  search,
}: CalendarViewerProps) {
  const calendar = useCalendarApp(config, version);
  useEffect(() => {
    calendarRef.current = calendar;
  }, [calendar, calendarRef]);

  return <DayFlowCalendar calendar={calendar} search={search} />;
}

export function InteractiveCalendar() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [, startTransition] = useTransition();

  // States for checkboxes
  const [showSidebar, setShowSidebar] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [enableDrag, setEnableDrag] = useState(true);
  const [enableShortcuts, setEnableShortcuts] = useState(true);
  const [showEventDots, setShowEventDots] = useState(false);
  const [showCalendarGroups, setShowCalendarGroups] = useState(false);
  const [showMultiCalendar, setShowMultiCalendar] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const calendarRef = useRef<UseCalendarAppReturn | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setShowSidebar(true);
      setShowControls(true);
    }
  }, []);

  // States for selections
  const [locale, setLocale] = useState('en');
  const [timeZone, setTimeZone] = useState<string | undefined>();
  const [secondaryTimeZone, setSecondaryTimeZone] = useState<
    string | undefined
  >();
  const [searchTimeZone, setSearchTimeZone] = useState('');
  const [searchSecondaryTz, setSearchSecondaryTz] = useState('');
  const [selectedViews, setSelectedViews] = useState<string[]>([
    ViewType.DAY,
    ViewType.WEEK,
    ViewType.MONTH,
    ViewType.YEAR,
  ]);

  const filterTimeZones = (search: string) => {
    if (!search) return TIME_ZONE_OPTIONS;
    const lowerSearch = search.toLowerCase();
    return TIME_ZONE_OPTIONS.filter(
      ([key, value]) =>
        key.toLowerCase().includes(lowerSearch) ||
        value.toLowerCase().includes(lowerSearch) ||
        formatTimeZoneLabel(value).toLowerCase().includes(lowerSearch)
    );
  };

  const filteredPrimaryTimeZones = useMemo(
    () => filterTimeZones(searchTimeZone),
    [searchTimeZone]
  );

  const filteredSecondaryTimeZones = useMemo(
    () => filterTimeZones(searchSecondaryTz),
    [searchSecondaryTz]
  );
  const [activeView, setActiveView] = useState<ViewType>(ViewType.MONTH);
  const [yearMode, setYearMode] = useState<'fixed-week' | 'canvas' | 'grid'>(
    'fixed-week'
  );

  const searchConfig = useMemo(
    () => ({
      onResultClick: ({
        defaultAction,
      }: {
        event: unknown;
        defaultAction: () => void;
      }) => {
        defaultAction();
      },
    }),
    []
  );

  const allEvents = useMemo(() => generateSampleEvents(), []);
  const events = useMemo(() => {
    if (showMultiCalendar) return allEvents;
    return allEvents.filter(e => !e.calendarIds);
  }, [allEvents, showMultiCalendar]);

  const calendarsWithGroups = useMemo(() => {
    const googleIds = new Set(['team', 'personal', 'learning', 'travel']);
    const icloudIds = new Set(['wellness', 'marketing', 'support']);
    return calendarTypes.map(cal => ({
      ...cal,
      source: googleIds.has(cal.id)
        ? 'Google'
        : icloudIds.has(cal.id)
          ? 'iCloud'
          : undefined,
    }));
  }, []);

  const themeMode = useMemo(() => {
    if (resolvedTheme === 'dark') return 'dark';
    if (resolvedTheme === 'light') return 'light';
    return 'auto';
  }, [resolvedTheme]);

  const config = useMemo(() => {
    const p = [];
    if (enableDrag) p.push(createDragPlugin());
    if (showSidebar) {
      p.push(
        createSidebarPlugin({
          createCalendarMode: 'modal',
          showEventDots,
        })
      );
    }
    if (enableShortcuts) p.push(createKeyboardShortcutsPlugin());

    // Localization
    const selectedLocaleData = LOCALES_OPTIONS.find(
      l => l.value === locale
    )?.data;
    if (selectedLocaleData) {
      p.push(createLocalizationPlugin({ locales: [selectedLocaleData] }));
    }

    const v = [];
    if (selectedViews.includes(ViewType.DAY)) {
      v.push(
        createDayView({
          secondaryTimeZone: secondaryTimeZone as never,
          scrollToCurrentTime: true,
          showEventDots,
        })
      );
    }
    if (selectedViews.includes(ViewType.WEEK)) {
      v.push(
        createWeekView({
          secondaryTimeZone: secondaryTimeZone as never,
          scrollToCurrentTime: true,
          showEventDots,
        })
      );
    }
    if (selectedViews.includes(ViewType.MONTH))
      v.push(
        createMonthView({
          showMonthIndicator: false,
          showEventDots,
        })
      );
    if (selectedViews.includes(ViewType.YEAR)) {
      v.push(
        createYearView({
          mode: yearMode as never,
          showTimedEventsInYearView: true,
          showEventDots,
        })
      );
    }

    const currentView = selectedViews.includes(activeView)
      ? activeView
      : selectedViews.includes(ViewType.MONTH)
        ? ViewType.MONTH
        : (selectedViews[0] as ViewType);

    return {
      views: v,
      plugins: p,
      initialDate: new Date(),
      defaultView: currentView,
      callbacks: {
        onViewChange: (view: string) => setActiveView(view as ViewType),
        onMoreEventsClick: (date: Date) => {
          calendarRef.current?.selectDate(date);
          calendarRef.current?.changeView(ViewType.DAY);
        },
      },
      events,
      timeZone:
        timeZone ||
        (mounted
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined),
      locale: locale,
      calendars: showCalendarGroups ? calendarsWithGroups : calendarTypes,
      useCalendarHeader: showHeader,
      switcherMode: 'buttons' as const,
      theme: { mode: themeMode as 'light' | 'dark' | 'auto' },
      readOnly: readOnly
        ? {
            viewable: true,
            draggable: !readOnly,
          }
        : false,
    };
  }, [
    enableDrag,
    showSidebar,
    enableShortcuts,
    selectedViews,
    showEventDots,
    activeView,
    events,
    timeZone,
    mounted,
    locale,
    showCalendarGroups,
    calendarsWithGroups,
    showHeader,
    themeMode,
    readOnly,
    secondaryTimeZone,
    yearMode,
  ]);

  const toggleView = (view: string) => {
    startTransition(() => {
      setSelectedViews(prev => {
        const next = prev.includes(view)
          ? prev.filter(v => v !== view)
          : [...prev, view];
        return next.length === 0 ? [view] : next;
      });
    });
  };

  if (!mounted) {
    return (
      <div className='calendar-wrapper w-full' style={{ minHeight: '600px' }} />
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className='flex w-full flex-col gap-6'>
        {/* Controls Panel */}
        <Card
          className={`hidden border-slate-200 bg-slate-50/50 shadow-none lg:block dark:border-slate-800 dark:bg-gray-900/50 ${showControls ? 'block' : ''}`}
        >
          <CardContent className='flex flex-col gap-3 px-4 py-2'>
            {/* Row 1: Features and Views */}
            <div className='flex items-start justify-between gap-8'>
              {/* Features Column */}
              <div className='flex-1 space-y-3'>
                <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                  Features
                </h3>
                <div className='flex flex-wrap gap-x-4 gap-y-2'>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='sidebar'
                      checked={showSidebar}
                      onCheckedChange={checked =>
                        startTransition(() => setShowSidebar(checked === true))
                      }
                      className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                    />
                    <Label
                      htmlFor='sidebar'
                      className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                    >
                      Sidebar
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='header'
                      checked={showHeader}
                      onCheckedChange={checked =>
                        setShowHeader(checked === true)
                      }
                      className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                    />
                    <Label
                      htmlFor='header'
                      className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                    >
                      Header
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='drag'
                      checked={enableDrag}
                      onCheckedChange={checked =>
                        startTransition(() => setEnableDrag(checked === true))
                      }
                      className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                    />
                    <Label
                      htmlFor='drag'
                      className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                    >
                      Drag
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='shortcuts'
                      checked={enableShortcuts}
                      onCheckedChange={checked =>
                        startTransition(() =>
                          setEnableShortcuts(checked === true)
                        )
                      }
                      className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                    />
                    <div className='flex items-center gap-1'>
                      <Label
                        htmlFor='shortcuts'
                        className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                      >
                        Keys
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='inline-flex cursor-help items-center'>
                            <CircleAlert className='h-3 w-3 text-slate-400' />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side='top' className='w-56 p-3'>
                          <p className='mb-2 text-sm font-semibold'>
                            Shortcuts
                          </p>
                          <ul className='space-y-1.5 text-xs'>
                            <li className='flex justify-between gap-4'>
                              <span>Search</span>{' '}
                              <kbd className='font-sans opacity-70'>⌘F</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>Today</span>{' '}
                              <kbd className='font-sans opacity-70'>⌘T</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>New Event</span>{' '}
                              <kbd className='font-sans opacity-70'>⌘N</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>Undo</span>{' '}
                              <kbd className='font-sans opacity-70'>⌘Z</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>Event Switch</span>{' '}
                              <kbd className='font-sans opacity-70'>⌘Tab</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>Prev/Next</span>{' '}
                              <kbd className='font-sans opacity-70'>← / →</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>Copy Event</span>{' '}
                              <kbd className='font-sans opacity-70'>⌘C</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>Paste Event</span>{' '}
                              <kbd className='font-sans opacity-70'>⌘V</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>Cut Event</span>{' '}
                              <kbd className='font-sans opacity-70'>⌘X</kbd>
                            </li>
                            <li className='flex justify-between gap-4'>
                              <span>Delete</span>{' '}
                              <kbd className='font-sans opacity-70'>⌫</kbd>
                            </li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='event-dots'
                      checked={showEventDots}
                      onCheckedChange={checked =>
                        startTransition(() =>
                          setShowEventDots(checked === true)
                        )
                      }
                      className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                    />
                    <div className='flex items-center gap-1'>
                      <Label
                        htmlFor='event-dots'
                        className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                      >
                        Mini Dots
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='inline-flex cursor-help items-center'>
                            <CircleAlert className='h-3 w-3 text-slate-400' />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side='top' className='w-56 p-3'>
                          <p className='mb-2 text-sm font-semibold'>
                            Mini Calendar Dots
                          </p>
                          <p className='text-xs text-slate-500 dark:text-slate-400'>
                            Shows colored dots below dates in the sidebar mini
                            calendar. Each dot represents a unique calendar
                            color with events on that day (up to 4 dots per
                            day).
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='calendar-groups'
                      checked={showCalendarGroups}
                      onCheckedChange={checked =>
                        setShowCalendarGroups(checked === true)
                      }
                      className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                    />
                    <div className='flex items-center gap-1'>
                      <Label
                        htmlFor='calendar-groups'
                        className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                      >
                        Cal Groups
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='inline-flex cursor-help items-center'>
                            <CircleAlert className='h-3 w-3 text-slate-400' />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side='top' className='w-64 p-3'>
                          <p className='mb-2 text-sm font-semibold'>
                            Calendar Groups
                          </p>
                          <p className='mb-2 text-xs text-slate-500 dark:text-slate-400'>
                            Groups calendars by source in the sidebar. Each
                            source is shown as a collapsible section header.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='read-only'
                      checked={readOnly}
                      onCheckedChange={checked => setReadOnly(checked === true)}
                      className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                    />
                    <Label
                      htmlFor='read-only'
                      className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                    >
                      Read Only
                    </Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Checkbox
                      id='multi-calendar'
                      checked={showMultiCalendar}
                      onCheckedChange={checked =>
                        setShowMultiCalendar(checked === true)
                      }
                      className='data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black'
                    />
                    <div className='flex items-center gap-1'>
                      <Label
                        htmlFor='multi-calendar'
                        className='cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400'
                      >
                        Multi Cal
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='inline-flex cursor-help items-center'>
                            <CircleAlert className='h-3 w-3 text-slate-400' />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side='top'
                          className='w-80 overflow-hidden border-slate-200 p-0 shadow-xl dark:border-slate-800'
                        >
                          <div className='border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900'>
                            <p className='mb-1 text-sm font-semibold'>
                              Multi-calendar Events
                            </p>
                            <p className='text-[11px] leading-relaxed text-slate-500 dark:text-slate-400'>
                              Display a single event across multiple calendars.
                              Perfect for shared team activities or
                              cross-functional blocks.
                            </p>
                          </div>
                          <div className='space-y-4 bg-white p-3 dark:bg-slate-950'>
                            {/* Week View Preview */}
                            <div className='space-y-1.5'>
                              <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                                Week View Preview (Personal, Wellness)
                              </p>
                              <div
                                className='relative flex h-10 w-full flex-col justify-center rounded-md border border-slate-100 bg-slate-50/50 p-1.5 dark:border-slate-800 dark:bg-slate-900/50'
                                style={{
                                  background:
                                    'repeating-linear-gradient(-45deg, rgba(37, 99, 235, 0.08) 0px, rgba(37, 99, 235, 0.08) 6px, rgba(16, 185, 129, 0.08) 6px, rgba(16, 185, 129, 0.08) 12px)',
                                }}
                              >
                                <div className='flex h-full items-center gap-2'>
                                  {/* Color bar with clip-path style */}
                                  <div
                                    className='pointer-events-none absolute inset-0'
                                    style={{
                                      background:
                                        'repeating-linear-gradient(-45deg, #2563eb 0px, #2563eb 6px, #10b981 6px, #10b981 12px)',
                                      clipPath:
                                        'inset(4px calc(100% - 4px - 3px) 4px 4px round 9999px)',
                                    }}
                                  />
                                  <div className='flex min-w-0 flex-col gap-0.5 pl-3'>
                                    <div className='truncate text-[10px] font-bold'>
                                      Team Sync & Wellness
                                    </div>
                                    <div className='text-[8px] text-slate-400'>
                                      10:00 - 11:30
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Month View Preview */}
                            <div className='space-y-1.5'>
                              <p className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                                Month View Preview (Team, Travel, Learning)
                              </p>
                              <div className='relative h-14 w-full rounded-md border border-slate-100 bg-slate-50/50 p-1 dark:border-slate-800 dark:bg-slate-900/50'>
                                <div className='grid h-full grid-cols-3 border border-slate-200/50 dark:border-slate-800/50'>
                                  <div className='border-r border-slate-200/50 p-0.5 dark:border-slate-800/50'>
                                    <span className='text-[8px] opacity-30'>
                                      12
                                    </span>
                                  </div>
                                  <div className='border-r border-slate-200/50 bg-white p-0.5 dark:border-slate-800/50 dark:bg-slate-950'>
                                    <span className='text-[8px] font-bold'>
                                      13
                                    </span>
                                    <div
                                      className='relative mt-0.5 flex h-3 items-center overflow-hidden rounded-[2px] px-1 pl-2'
                                      style={{
                                        background:
                                          'repeating-linear-gradient(-45deg, rgba(37, 99, 235, 0.1) 0px, rgba(37, 99, 235, 0.1) 6px, rgba(236, 72, 153, 0.1) 6px, rgba(236, 72, 153, 0.1) 12px, rgba(20, 184, 166, 0.1) 12px, rgba(20, 184, 166, 0.1) 18px)',
                                      }}
                                    >
                                      {/* Vertical segmented color bar */}
                                      <div
                                        className='absolute top-0 bottom-0 left-0.5 w-[3px] rounded'
                                        style={{
                                          background:
                                            'linear-gradient(to bottom, #2563eb 0%, #2563eb 33.33%, #ec4899 33.33%, #ec4899 66.66%, #14b8a6 66.66%, #14b8a6 100%)',
                                        }}
                                      />
                                      <span className='truncate text-[8px] font-medium'>
                                        Company Off-site
                                      </span>
                                    </div>
                                  </div>
                                  <div className='p-0.5'>
                                    <span className='text-[8px] opacity-30'>
                                      14
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
              {/* Views Column */}
              <div className='space-y-3'>
                <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                  Views
                </h3>
                <div className='flex gap-2'>
                  <div className='flex flex-wrap gap-1.5'>
                    {VIEW_OPTIONS.map(opt => {
                      const isSelected = selectedViews.includes(opt.value);
                      return (
                        <Button
                          key={opt.value}
                          size='sm'
                          variant={isSelected ? 'default' : 'ghost'}
                          className={cn(
                            'h-7 rounded-full px-2.5 text-[11px] transition-all',
                            isSelected
                              ? 'bg-black text-white hover:bg-black/90 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
                              : 'bg-transparent text-black hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                          )}
                          onClick={() => toggleView(opt.value)}
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Year Mode Selection */}
                  {selectedViews.includes(ViewType.YEAR) && (
                    <div className='animate-in fade-in slide-in-from-left-1 flex items-center gap-2'>
                      <span className='text-[9px] font-bold tracking-wider text-slate-500 uppercase'>
                        Year:
                      </span>
                      <Select
                        value={yearMode}
                        onValueChange={val =>
                          startTransition(() => setYearMode(val as never))
                        }
                      >
                        <SelectTrigger className='h-7 w-35 px-2 text-xs'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value='fixed-week'
                            className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                          >
                            Fixed Week
                          </SelectItem>
                          <SelectItem
                            value='canvas'
                            className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                          >
                            Canvas
                          </SelectItem>
                          <SelectItem
                            value='grid'
                            className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                          >
                            Grid Year
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Localization and Timezone */}
            <div className='flex items-start gap-8 border-t border-slate-200 pt-4 dark:border-slate-800'>
              {/* Localization Column */}
              <div className='space-y-1'>
                <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                  Language
                </h3>
                <Select
                  value={locale}
                  onValueChange={val => startTransition(() => setLocale(val))}
                >
                  <SelectTrigger className='h-7 w-35 text-xs'>
                    <SelectValue placeholder='Select Locale' />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES_OPTIONS.map(opt => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone Column */}
              <div className='space-y-1'>
                <div className='flex items-center gap-1'>
                  <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                    Timezone
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className='inline-flex cursor-help items-center'>
                        <CircleAlert className='h-3 w-3 text-slate-400' />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side='top' className='w-60 p-3'>
                      <p className='mb-1 text-sm font-semibold'>
                        Calendar Timezone
                      </p>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>
                        Controls the primary display and editing timezone across
                        Day, Week, Month, and Year views.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={timeZone || 'device-local'}
                  onValueChange={val => {
                    setTimeZone(val === 'device-local' ? undefined : val);
                    setSearchTimeZone('');
                  }}
                  onOpenChange={open => {
                    if (!open) setSearchTimeZone('');
                  }}
                >
                  <SelectTrigger className='h-7 w-35 text-xs'>
                    <SelectValue placeholder='Select TZ' />
                  </SelectTrigger>
                  <SelectContent className='max-h-80 w-56 overflow-hidden p-0'>
                    {/* Search Input */}
                    <div className='flex items-center border-b border-slate-100 px-2 dark:border-slate-800'>
                      <input
                        placeholder='Search timezone...'
                        className='h-9 w-full bg-transparent py-2 text-xs outline-none placeholder:text-slate-400'
                        value={searchTimeZone}
                        onChange={e => setSearchTimeZone(e.target.value)}
                        onKeyDown={e => {
                          // Prevent the space from closing the select
                          if (e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                      />
                    </div>
                    <div className='max-h-60 overflow-x-hidden overflow-y-auto p-1'>
                      <SelectItem
                        value='device-local'
                        className='cursor-pointer text-xs'
                      >
                        Device local
                      </SelectItem>
                      {filteredPrimaryTimeZones.map(([key, value]) => (
                        <SelectItem
                          key={key}
                          value={value}
                          className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                        >
                          <div className='flex max-w-full items-center overflow-hidden'>
                            <span className='truncate font-medium'>
                              {formatTimeZoneLabel(value)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {filteredPrimaryTimeZones.length === 0 && (
                        <div className='py-4 text-center text-xs text-slate-500'>
                          No results found.
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-1'>
                  <h3 className='text-xs font-semibold tracking-tight text-slate-900 uppercase dark:text-slate-100'>
                    Secondary TZ
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className='inline-flex cursor-help items-center'>
                        <CircleAlert className='h-3 w-3 text-slate-400' />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side='top' className='w-60 p-3'>
                      <p className='mb-1 text-sm font-semibold'>
                        Day/Week Secondary Timeline
                      </p>
                      <p className='text-xs text-slate-500 dark:text-slate-400'>
                        Adds a second reference timeline in Day and Week views
                        only. It does not change Month/Year bucketing or event
                        persistence.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={secondaryTimeZone || 'none'}
                  onValueChange={val => {
                    setSecondaryTimeZone(val === 'none' ? undefined : val);
                    setSearchSecondaryTz('');
                  }}
                  onOpenChange={open => {
                    if (!open) setSearchSecondaryTz('');
                  }}
                >
                  <SelectTrigger className='h-7 w-35 text-xs'>
                    <SelectValue placeholder='Select TZ' />
                  </SelectTrigger>
                  <SelectContent className='max-h-80 w-56 overflow-hidden p-0'>
                    <div className='flex items-center border-b border-slate-100 px-2 dark:border-slate-800'>
                      <input
                        placeholder='Search timezone...'
                        className='h-9 w-full bg-transparent py-2 text-xs outline-none placeholder:text-slate-400'
                        value={searchSecondaryTz}
                        onChange={e => setSearchSecondaryTz(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                      />
                    </div>
                    <div className='max-h-60 overflow-x-hidden overflow-y-auto p-1'>
                      <SelectItem
                        value='none'
                        className='cursor-pointer text-xs'
                      >
                        None
                      </SelectItem>
                      {filteredSecondaryTimeZones.map(([key, value]) => (
                        <SelectItem
                          key={key}
                          value={value}
                          className='cursor-pointer text-xs focus:bg-slate-100 dark:focus:bg-slate-800'
                        >
                          <div className='flex max-w-full items-center overflow-hidden'>
                            <span className='truncate font-medium'>
                              {formatTimeZoneLabel(value)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {filteredSecondaryTimeZones.length === 0 && (
                        <div className='py-4 text-center text-xs text-slate-500'>
                          No results found.
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='calendar-wrapper w-full'>
          {/*
          Using locale and features in the key to force a total re-mount of the calendar application.
          This ensures all internal translated strings and plugin states are reset correctly.
          We keep timezone controls out of the key to prevent flickering during timezone switches,
          as the calendar app handles these configuration changes reactively.
        */}
          <CalendarViewer
            key={`${locale}-${selectedViews.join(',')}-${yearMode}`}
            version={`${showSidebar}-${enableDrag}-${enableShortcuts}-${showEventDots}-${showMultiCalendar}`}
            config={config}
            calendarRef={calendarRef}
            search={searchConfig}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default InteractiveCalendar;
