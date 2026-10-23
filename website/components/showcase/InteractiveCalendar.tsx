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
  CalendarAppConfig,
  createAgendaView,
  createDayView,
  createWeekView,
  createMonthView,
  ViewType,
  createYearView,
  UseCalendarAppReturn,
} from '@dayflow/react';
import { Inbox, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useTransition,
  useCallback,
} from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { getWebsiteCalendars } from '@/utils/palette';
import { generateSampleEvents, generateSampleTasks } from '@/utils/sampleData';

import { CalendarViewer } from './livedemo/CalendarViewer';
import { ControlPanelV2 } from './livedemo/ControlPanelV2';
import {
  CalendarFeatures,
  CalendarSelections,
  DEFAULT_THEME_COLOR,
  YearMode,
} from './livedemo/types';

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

const mergeChangedState = <T extends object>(
  prev: T,
  updates: Partial<T>
): T => {
  const keys = Object.keys(updates) as Array<keyof T>;
  if (keys.every(key => prev[key] === updates[key])) return prev;

  return { ...prev, ...updates };
};

export function InteractiveCalendar() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  const [showControls, setShowControls] = useState(false);
  const calendarRef = useRef<UseCalendarAppReturn | null>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);

  // Consolidated State
  const [features, setFeatures] = useState<CalendarFeatures>({
    showSidebar: false,
    showHeader: true,
    enableDrag: true,
    enableTasks: false,
    enableShortcuts: true,
    showEventDots: true,
    showCalendarGroups: true,
    showMultiCalendar: false,
    readOnly: false,
    collapsedSafeAreaLeft: false,
    showHalfHourLines: false,
    showAllDay: true,
    scrollToCurrentTime: true,
    showWeekends: true,
    showWeekNumbers: false,
    showMonthIndicator: false,
    showTimedEventsInYearView: true,
    showEmptyAgendaDays: true,
    sidebarOrder: ['calendarList', 'miniCalendar'],
  });

  const [selections, setSelections] = useState<CalendarSelections>({
    locale: 'en',
    selectedViews: [
      ViewType.DAY,
      ViewType.WEEK,
      ViewType.MONTH,
      ViewType.YEAR,
      ViewType.AGENDA,
    ],
    activeView: ViewType.MONTH,
    yearMode: 'fixed-week',
    switcherMode: 'buttons',
    timeFormat: '24h',
    firstHour: 0,
    lastHour: 24,
    hourHeight: 72,
    startOfWeek: 1,
    agendaDaysToShow: 14,
  });

  useEffect(() => {
    setMounted(true);
    const isDesktop = window.innerWidth >= 1024;
    // URL parameters open the demo in a given state, e.g. for changelog
    // screenshots: /demo?view=week&enableTasks=1&controls=0
    const params = new URLSearchParams(window.location.search);
    setFeatures(prev => {
      const next = { ...prev, showSidebar: isDesktop };
      for (const key of Object.keys(prev) as Array<keyof CalendarFeatures>) {
        const value = params.get(key);
        if (value !== null && typeof prev[key] === 'boolean') {
          (next as Record<string, unknown>)[key] =
            value === '1' || value === 'true';
        }
      }
      return next;
    });
    setSelections(prev => ({
      ...prev,
      ...(params.get('view') && { activeView: params.get('view') as ViewType }),
      ...(params.get('yearMode') && {
        yearMode: params.get('yearMode') as YearMode,
      }),
      ...(params.get('timeZone') && { timeZone: params.get('timeZone')! }),
      ...(params.get('secondaryTimeZone') && {
        secondaryTimeZone: params.get('secondaryTimeZone')!,
      }),
      ...(params.get('locale') && { locale: params.get('locale')! }),
    }));
    setShowControls(isDesktop && params.get('controls') !== '0');
  }, []);

  const updateFeatures = useCallback(
    (updates: Partial<CalendarFeatures>) => {
      startTransition(() => {
        setFeatures(prev => mergeChangedState(prev, updates));
      });
    },
    [startTransition]
  );

  const updateSelections = useCallback(
    (updates: Partial<CalendarSelections>) => {
      startTransition(() => {
        setSelections(prev => mergeChangedState(prev, updates));
      });
    },
    [startTransition]
  );

  useEffect(() => {
    const color = selections.themeColor || DEFAULT_THEME_COLOR;
    document.documentElement.style.setProperty('--df-color-primary', color);
    document.documentElement.style.setProperty(
      '--df-color-primary-foreground',
      '#ffffff'
    );
  }, [selections.themeColor]);

  const previewThemeColor = useCallback((color: string) => {
    calendarWrapperRef.current?.style.setProperty('--df-color-primary', color);
    document.documentElement.style.setProperty('--df-color-primary', color);
    document.documentElement.style.setProperty(
      '--df-color-primary-foreground',
      '#ffffff'
    );
  }, []);

  const titleBarSlot = useMemo(
    () =>
      features.collapsedSafeAreaLeft && features.showSidebar
        ? ({
            isCollapsed,
            toggleCollapsed,
          }: {
            isCollapsed: boolean;
            toggleCollapsed: () => void;
          }) => (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#ff5f57',
                    border: '0.5px solid rgba(0,0,0,0.12)',
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#febc2e',
                    border: '0.5px solid rgba(0,0,0,0.12)',
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#28c840',
                    border: '0.5px solid rgba(0,0,0,0.12)',
                  }}
                />
              </div>
              <div
                className='calendar-title-bar absolute z-50 flex items-center gap-1'
                style={{ top: '10px', left: '72px' }}
              >
                <button type='button' onClick={toggleCollapsed}>
                  {isCollapsed ? (
                    <PanelRightClose size={16} className='mx-2 text-gray-600' />
                  ) : (
                    <PanelRightOpen size={16} className='mx-2 text-gray-600' />
                  )}
                </button>
                <button type='button' onClick={toggleCollapsed}>
                  <Inbox size={16} className='text-gray-600' />
                </button>
              </div>
            </>
          )
        : undefined,
    [features.collapsedSafeAreaLeft, features.showSidebar]
  );

  const allEvents = useMemo(() => generateSampleEvents(), []);
  const sampleTasks = useMemo(() => generateSampleTasks(), []);
  const events = useMemo(() => {
    const visibleEvents = features.showMultiCalendar
      ? allEvents
      : allEvents.filter(e => !e.calendarIds);
    return features.enableTasks
      ? [...sampleTasks, ...visibleEvents]
      : visibleEvents;
  }, [
    allEvents,
    sampleTasks,
    features.showMultiCalendar,
    features.enableTasks,
  ]);

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
    if (features.enableDrag) p.push(createDragPlugin());
    if (features.showSidebar) {
      p.push(
        createSidebarPlugin({
          createCalendarMode: 'modal',
          showEventDots: features.showEventDots,
          componentsOrder: features.sidebarOrder,
        })
      );
    }
    if (features.enableShortcuts) p.push(createKeyboardShortcutsPlugin());

    const selectedLocaleData = LOCALES_OPTIONS.find(
      l => l.value === selections.locale
    )?.data;
    if (selectedLocaleData) {
      p.push(createLocalizationPlugin({ locales: [selectedLocaleData] }));
    }

    const v = [];
    if (selections.selectedViews.includes(ViewType.DAY)) {
      v.push(
        createDayView({
          secondaryTimeZone: selections.secondaryTimeZone as never,
          scrollToCurrentTime: features.scrollToCurrentTime,
          showAllDay: features.showAllDay,
          timeFormat: selections.timeFormat,
          firstHour: selections.firstHour,
          lastHour: selections.lastHour,
          hourHeight: selections.hourHeight,
          showEventDots: features.showEventDots,
          showHalfHourLines: features.showHalfHourLines,
        } as never)
      );
    }
    if (selections.selectedViews.includes(ViewType.WEEK)) {
      v.push(
        createWeekView({
          secondaryTimeZone: selections.secondaryTimeZone as never,
          scrollToCurrentTime: features.scrollToCurrentTime,
          showAllDay: features.showAllDay,
          showWeekends: features.showWeekends,
          startOfWeek: selections.startOfWeek,
          timeFormat: selections.timeFormat,
          firstHour: selections.firstHour,
          lastHour: selections.lastHour,
          hourHeight: selections.hourHeight,
          showEventDots: features.showEventDots,
          showHalfHourLines: features.showHalfHourLines,
        } as never)
      );
    }
    if (selections.selectedViews.includes(ViewType.MONTH)) {
      v.push(
        createMonthView({
          showWeekNumbers: features.showWeekNumbers,
          showMonthIndicator: features.showMonthIndicator,
          startOfWeek: selections.startOfWeek,
          showEventDots: features.showEventDots,
        })
      );
    }
    if (selections.selectedViews.includes(ViewType.YEAR)) {
      v.push(
        createYearView({
          mode: selections.yearMode as never,
          showTimedEventsInYearView: features.showTimedEventsInYearView,
          showEventDots: features.showEventDots,
        })
      );
    }
    if (selections.selectedViews.includes(ViewType.AGENDA)) {
      v.push(
        createAgendaView({
          daysToShow: selections.agendaDaysToShow,
          showEmptyDays: features.showEmptyAgendaDays,
          timeFormat: selections.timeFormat,
          gridDateDoubleClick: 'day-view',
        })
      );
    }

    const currentView = selections.selectedViews.includes(selections.activeView)
      ? selections.activeView
      : selections.selectedViews.includes(ViewType.MONTH)
        ? ViewType.MONTH
        : (selections.selectedViews[0] as ViewType);

    return {
      views: v,
      plugins: p,
      initialDate: new Date(),
      defaultView: currentView,
      callbacks: {
        onViewChange: (view: string) =>
          updateSelections({ activeView: view as ViewType }),
        onMoreEventsClick: (date: Date) => {
          calendarRef.current?.selectDate(date);
          calendarRef.current?.changeView(ViewType.DAY);
        },
      },
      events,
      timeZone:
        selections.timeZone ||
        (mounted
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined),
      locale: selections.locale,
      calendars: features.showCalendarGroups
        ? calendarsWithGroups
        : calendarTypes,
      enableTasks: features.enableTasks,
      useCalendarHeader: features.showHeader,
      eventDetailTrigger: 'click',
      switcherMode: selections.switcherMode,
      theme: { mode: themeMode as 'light' | 'dark' | 'auto' },
      readOnly: features.readOnly
        ? {
            viewable: true,
            draggable: !features.readOnly,
          }
        : false,
    };
  }, [
    features.enableDrag,
    features.showSidebar,
    features.enableShortcuts,
    features.showCalendarGroups,
    features.showHeader,
    features.readOnly,
    features.showEventDots,
    features.showHalfHourLines,
    features.showAllDay,
    features.scrollToCurrentTime,
    features.showWeekends,
    features.showWeekNumbers,
    features.showMonthIndicator,
    features.showTimedEventsInYearView,
    features.showEmptyAgendaDays,
    features.sidebarOrder,
    selections.selectedViews,
    selections.activeView,
    selections.timeZone,
    selections.locale,
    selections.switcherMode,
    selections.secondaryTimeZone,
    selections.yearMode,
    selections.timeFormat,
    selections.firstHour,
    selections.lastHour,
    selections.hourHeight,
    selections.startOfWeek,
    selections.agendaDaysToShow,
    events,
    mounted,
    calendarsWithGroups,
    themeMode,
    updateSelections,
  ]) as unknown as CalendarAppConfig;

  if (!mounted) {
    return (
      <div className='calendar-wrapper w-full' style={{ minHeight: '600px' }} />
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className='flex w-full flex-col gap-6'>
        <ControlPanelV2
          features={features}
          selections={selections}
          onUpdateFeatures={updateFeatures}
          onUpdateSelections={updateSelections}
          onPreviewThemeColor={previewThemeColor}
          localesOptions={LOCALES_OPTIONS}
          showControls={showControls}
          onConfigureView={view => {
            updateSelections({ activeView: view });
            calendarRef.current?.changeView(view);
          }}
        />

        <div
          ref={calendarWrapperRef}
          className={`calendar-wrapper w-full${features.collapsedSafeAreaLeft && features.showSidebar ? ' mac-title-bar-active' : ''}${features.showHalfHourLines ? ' demo-half-hour-lines' : ''}`}
          style={
            {
              '--df-color-primary':
                selections.themeColor || DEFAULT_THEME_COLOR,
              '--df-color-primary-foreground': '#ffffff',
            } as React.CSSProperties
          }
        >
          <CalendarViewer
            key={`${selections.locale}-${selections.selectedViews.join(',')}-${selections.yearMode}-${selections.switcherMode}`}
            version={JSON.stringify({
              features,
              viewConfig: {
                selectedViews: selections.selectedViews,
                yearMode: selections.yearMode,
                timeFormat: selections.timeFormat,
                firstHour: selections.firstHour,
                lastHour: selections.lastHour,
                hourHeight: selections.hourHeight,
                startOfWeek: selections.startOfWeek,
                agendaDaysToShow: selections.agendaDaysToShow,
              },
            })}
            config={config}
            calendarRef={calendarRef}
            collapsedSafeAreaLeft={
              features.collapsedSafeAreaLeft && features.showSidebar
                ? 130
                : undefined
            }
            titleBarSlot={titleBarSlot}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default InteractiveCalendar;
