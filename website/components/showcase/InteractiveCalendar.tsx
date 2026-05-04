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
import { createPrintPlugin } from '@dayflow/plugin-print';
import { createSidebarPlugin } from '@dayflow/plugin-sidebar';

import '@dayflow/plugin-print/dist/styles.components.css';
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
import { generateSampleEvents } from '@/utils/sampleData';

import { CalendarViewer } from './livedemo/CalendarViewer';
import { ControlPanel } from './livedemo/ControlPanel';
import {
  CalendarFeatures,
  CalendarSelections,
  DEFAULT_THEME_COLOR,
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
    enableShortcuts: true,
    showEventDots: true,
    showCalendarGroups: true,
    showMultiCalendar: false,
    readOnly: false,
    collapsedSafeAreaLeft: false,
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
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setFeatures(prev => ({ ...prev, showSidebar: true }));
      setShowControls(true);
    }
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

  const previewThemeColor = useCallback((color: string) => {
    calendarWrapperRef.current?.style.setProperty('--df-color-primary', color);
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
  const events = useMemo(() => {
    if (features.showMultiCalendar) return allEvents;
    return allEvents.filter(e => !e.calendarIds);
  }, [allEvents, features.showMultiCalendar]);

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
          scrollToCurrentTime: true,
          showEventDots: features.showEventDots,
        })
      );
    }
    if (selections.selectedViews.includes(ViewType.WEEK)) {
      v.push(
        createWeekView({
          secondaryTimeZone: selections.secondaryTimeZone as never,
          scrollToCurrentTime: true,
          showEventDots: features.showEventDots,
        })
      );
    }
    if (selections.selectedViews.includes(ViewType.MONTH)) {
      v.push(
        createMonthView({
          showMonthIndicator: false,
          showEventDots: features.showEventDots,
        })
      );
    }
    if (selections.selectedViews.includes(ViewType.YEAR)) {
      v.push(
        createYearView({
          mode: selections.yearMode as never,
          showTimedEventsInYearView: true,
          showEventDots: features.showEventDots,
        })
      );
    }
    if (selections.selectedViews.includes(ViewType.AGENDA)) {
      v.push(
        createAgendaView({
          daysToShow: 14,
          gridDateDoubleClick: 'day-view',
        })
      );
    }

    p.push(createPrintPlugin());

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
      useCalendarHeader: features.showHeader,
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
    features.sidebarOrder,
    selections.selectedViews,
    selections.activeView,
    selections.timeZone,
    selections.locale,
    selections.switcherMode,
    selections.secondaryTimeZone,
    selections.yearMode,
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
        <ControlPanel
          features={features}
          selections={selections}
          onUpdateFeatures={updateFeatures}
          onUpdateSelections={updateSelections}
          onPreviewThemeColor={previewThemeColor}
          localesOptions={LOCALES_OPTIONS}
          showControls={showControls}
        />

        <div
          ref={calendarWrapperRef}
          className={`calendar-wrapper w-full${features.collapsedSafeAreaLeft && features.showSidebar ? ' mac-title-bar-active' : ''}`}
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
            version={`${features.showSidebar}-${features.enableDrag}-${features.enableShortcuts}-${features.showEventDots}-${features.showMultiCalendar}-${features.sidebarOrder?.join(',')}-${features.collapsedSafeAreaLeft}`}
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
