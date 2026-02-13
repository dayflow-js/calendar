'use client';

import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  useCalendarApp,
  DayFlowCalendar,
  createDayView,
  createWeekView,
  createMonthView,
  createDragPlugin,
  ViewType,
  createYearView,
} from '@dayflow/react';
import { CalendarType } from '@dayflow/core';
import '@dayflow/core/dist/styles.css';

import { getWebsiteCalendars } from '@/utils/palette';
import { generateSampleEvents } from '@/utils/sampleData';

const calendarTypes: CalendarType[] = getWebsiteCalendars();

export function InteractiveCalendar() {
  const { resolvedTheme } = useTheme();
  const currentView = ViewType.MONTH;

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const events = useMemo(() => generateSampleEvents(), []);

  const dragPlugin = createDragPlugin();

  const views = useMemo(
    () => [createDayView(), createWeekView(), createMonthView(), createYearView({ mode: 'fixed-week' })],
    []
  );

  const themeMode = useMemo(() => {
    if (resolvedTheme === 'dark') return 'dark';
    if (resolvedTheme === 'light') return 'light';
    return 'auto';
  }, [resolvedTheme]);

  const calendar = useCalendarApp({
    views,
    plugins: [dragPlugin],
    initialDate: new Date(),
    defaultView: currentView,
    events,
    calendars: calendarTypes,
    switcherMode: 'buttons',
    useSidebar: {
      enabled: !isMobile,
      colorPickerMode: 'blossom',
    },
    callbacks: {
      onMoreEventsClick: (date: Date) => {
        calendar.selectDate(date);
        calendar.changeView(ViewType.DAY);
      },
    },
    theme: { mode: themeMode },
  });

  return (
    <div className="w-full">
      <DayFlowCalendar
        calendar={calendar}
        className="w-full"
        style={{ height: isMobile ? 550 : 760 }}
      />
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Tip:</strong> Try dragging events across weeks, resizing them in
        Week view, or switching to Month view to see all-day scheduling in
        action.
      </div>
    </div>
  );
}

export default InteractiveCalendar;
