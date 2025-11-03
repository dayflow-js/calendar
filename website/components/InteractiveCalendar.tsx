'use client';

import React, { useMemo, useState } from 'react';
// Import directly from source files to avoid CSS import in index.ts
import { useCalendarApp } from '@dayflow/core';
import { DayFlowCalendar } from '@dayflow/core';
import { createMonthView } from '@dayflow/core';
import { createWeekView } from '@dayflow/core';
import { createDayView } from '@dayflow/core';
import { createDragPlugin } from '@dayflow/core';
import { CalendarType, ViewType } from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';
import { generateSampleEvents } from '../utils/sampleData';
import { CALENDAR_SIDE_PANEL } from '../utils/palette';

const calendarTypes: CalendarType[] = CALENDAR_SIDE_PANEL.map(item => ({
  id: item.id,
  name: item.name,
  icon: item.icon,
  colors: {
    eventColor: `${item.color}20`,
    eventSelectedColor: `${item.color}40`,
    lineColor: item.color,
    textColor: item.color,
  },
  isVisible: true,
}));

export function InteractiveCalendar() {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.WEEK);

  const events = useMemo(() => generateSampleEvents(), []);

  const dragPlugin = useMemo(
    () =>
      createDragPlugin({
        enableDrag: true,
        enableResize: true,
        enableCreate: true,
      }),
    []
  );

  const views = useMemo(
    () => [createDayView(), createWeekView(), createMonthView()],
    []
  );

  const calendar = useCalendarApp({
    views,
    plugins: [dragPlugin],
    initialDate: new Date(),
    defaultView: currentView,
    events,
    calendars: calendarTypes,
    switcherMode: 'buttons',
    useSidebar: {
      enabled: true,
    },
  });

  return (
    <div className="w-full">
      <div className="rounded-lg border border-gray-200 shadow-sm">
        <DayFlowCalendar
          calendar={calendar}
          className="w-full h-[780px]"
        />
      </div>
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Tip:</strong> Try dragging events across weeks, resizing them in
        Week view, or switching to Month view to see all-day scheduling in
        action.
      </div>
    </div>
  );
}

export default InteractiveCalendar;
