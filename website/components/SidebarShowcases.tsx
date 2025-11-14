'use client';

import React, { useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Temporal } from 'temporal-polyfill';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useCalendarApp } from '@dayflow/core';
import { DayFlowCalendar } from '@dayflow/core';
import { createMonthView } from '@dayflow/core';
import { createWeekView } from '@dayflow/core';
import { createDayView } from '@dayflow/core';
import { createDragPlugin } from '@dayflow/core';
import {
  CalendarType,
  CalendarSidebarRenderProps,
  Event,
  SidebarConfig,
  ViewType,
} from '@dayflow/core';
import { temporalToDate } from '@dayflow/core';
import { getWebsiteCalendars } from '@/utils/palette';

const SIDEBAR_CALENDAR_IDS = new Set([
  'team',
  'personal',
  'learning',
  'travel',
  'wellness',
]);

const BASE_CALENDARS: CalendarType[] = getWebsiteCalendars().filter(calendar =>
  SIDEBAR_CALENDAR_IDS.has(calendar.id)
);

const cloneCalendars = (): CalendarType[] =>
  BASE_CALENDARS.map(calendar => ({
    ...calendar,
    colors: { ...calendar.colors },
    darkColors: calendar.darkColors
      ? { ...calendar.darkColors }
      : undefined,
  }));

const createSidebarEvents = (): Event[] => {
  const now = Temporal.Now.zonedDateTimeISO();
  const startOfDay = now.startOfDay();

  return [
    {
      id: 'sidebar-1',
      title: 'Sprint Planning',
      start: startOfDay.add({ hours: 10 }),
      end: startOfDay.add({ hours: 11, minutes: 30 }),
      calendarId: 'team',
      description: 'Outline weekly priorities with the core product pod.',
    },
    {
      id: 'sidebar-2',
      title: 'Customer Journey Workshop',
      start: startOfDay.add({ days: 1, hours: 14 }),
      end: startOfDay.add({ days: 1, hours: 16 }),
      calendarId: 'team',
    },
    {
      id: 'sidebar-3',
      title: 'Pilates Class',
      start: startOfDay.add({ hours: 7, minutes: 30 }),
      end: startOfDay.add({ hours: 8, minutes: 30 }),
      calendarId: 'wellness',
    },
    {
      id: 'sidebar-4',
      title: 'Notion System Review',
      start: startOfDay.add({ days: 2, hours: 18 }),
      end: startOfDay.add({ days: 2, hours: 19 }),
      calendarId: 'personal',
    },
    {
      id: 'sidebar-5',
      title: 'Advanced TypeScript Study',
      start: startOfDay.add({ days: 3, hours: 20 }),
      end: startOfDay.add({ days: 3, hours: 21, minutes: 30 }),
      calendarId: 'learning',
    },
    {
      id: 'sidebar-6',
      title: 'Weekend City Break',
      start: startOfDay.add({ days: 5 }),
      end: startOfDay.add({ days: 7 }),
      calendarId: 'travel',
      allDay: true,
    },
  ];
};

const useSidebarCalendar = (sidebarConfig: boolean | SidebarConfig) => {
  const { resolvedTheme } = useTheme();

  const views = useMemo(
    () => [createMonthView(), createWeekView(), createDayView()],
    []
  );
  const dragPlugin = useMemo(
    () =>
      createDragPlugin({
        enableDrag: true,
        enableResize: true,
        enableCreate: true,
      }),
    []
  );
  const events = useMemo(() => createSidebarEvents(), []);
  const calendars = useMemo(() => cloneCalendars(), []);

  const themeMode = useMemo(() => {
    if (resolvedTheme === 'dark') return 'dark';
    if (resolvedTheme === 'light') return 'light';
    return 'auto';
  }, [resolvedTheme]);

  return useCalendarApp({
    views,
    plugins: [dragPlugin],
    events,
    calendars,
    defaultView: ViewType.WEEK,
    initialDate: new Date(),
    switcherMode: 'buttons',
    useSidebar: sidebarConfig,
    theme: { mode: themeMode }
  });
};

const CustomSidebarPanel: React.FC<CalendarSidebarRenderProps> = ({
  app,
  calendars,
  toggleCalendarVisibility,
  toggleAll,
  isCollapsed,
  setCollapsed,
}) => {
  const upcoming = useMemo(() => {
    const now = Date.now();
    return app
      .getEvents()
      .map(event => {
        const matchingCalendar = calendars.find(
          calendar => calendar.id === event.calendarId
        );
        const startDate = temporalToDate(event.start);
        return {
          event,
          calendar: matchingCalendar,
          startDate,
        };
      })
      .filter(item => item.startDate.getTime() >= now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 4);
  }, [app, calendars]);

  const hiddenCount = calendars.filter(calendar => !calendar.isVisible).length;

  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-4 bg-slate-900 py-4 text-slate-100">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="rounded-full bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <CalendarRange className="h-6 w-6 text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Workspace
          </p>
          <p className="text-base font-semibold text-white">DayFlow Team</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded-full bg-slate-900 p-2 text-slate-400 transition hover:text-white"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>Calendars</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="inline-flex items-center gap-1 text-emerald-400 transition hover:text-emerald-300"
            >
              <Eye className="h-3.5 w-3.5" />
              Show all
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="inline-flex items-center gap-1 text-slate-400 transition hover:text-slate-300"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Hide all
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {calendars.map(calendar => (
            <button
              key={calendar.id}
              type="button"
              onClick={() =>
                toggleCalendarVisibility(calendar.id, !calendar.isVisible)
              }
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm shadow-sm transition ${calendar.isVisible
                ? 'border-slate-700 bg-slate-900/70 hover:border-slate-600'
                : 'border-slate-800 bg-slate-950 hover:border-slate-800/80 text-slate-500'
                }`}
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-lg leading-none">
                  {calendar.icon ?? '📅'}
                </span>
                <span>{calendar.name}</span>
              </span>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: calendar.isVisible
                    ? calendar.colors?.lineColor ?? '#22c55e'
                    : 'rgba(148, 163, 184, 0.45)',
                }}
              />
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Upcoming
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            {upcoming.length ? (
              upcoming.map(item => (
                <li key={item.event.id} className="space-y-1">
                  <p className="font-medium text-white">{item.event.title}</p>
                  <p className="text-xs text-slate-400">
                    {item.startDate.toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {item.calendar && (
                    <p className="text-xs text-slate-500">
                      {item.calendar.icon} {item.calendar.name}
                    </p>
                  )}
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-500">
                No upcoming events scheduled.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-500">
        {hiddenCount
          ? `${hiddenCount} calendar${hiddenCount > 1 ? 's' : ''} hidden`
          : 'All calendars visible'}
      </div>
    </div>
  );
};

const ShowcaseWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="mt-6">
    {children}
  </div>
);

export const SidebarBasicsShowcase: React.FC = () => {
  const calendar = useSidebarCalendar({
    enabled: true,
    width: 280,
  });

  return (
    <ShowcaseWrapper>
      <DayFlowCalendar calendar={calendar} className="h-[620px] w-full" />
    </ShowcaseWrapper>
  );
};

export const SidebarCustomShowcase: React.FC = () => {
  const renderSidebar = useCallback(
    (props: CalendarSidebarRenderProps) => <CustomSidebarPanel {...props} />,
    []
  );

  const calendar = useSidebarCalendar({
    enabled: true,
    width: 320,
    render: renderSidebar,
  });

  return (
    <ShowcaseWrapper>
      <DayFlowCalendar calendar={calendar} className="h-[620px] w-full" />
    </ShowcaseWrapper>
  );
};
