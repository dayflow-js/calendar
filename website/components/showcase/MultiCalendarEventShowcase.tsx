'use client';

import '@dayflow/core/dist/styles.components.css';
import {
  useCalendarApp,
  DayFlowCalendar,
  createMonthView,
  createWeekView,
  ViewType,
} from '@dayflow/react';
import { useTheme } from 'next-themes';
import React, { useMemo } from 'react';

import { getWebsiteCalendars } from '@/utils/palette';
import { generateMultiCalendarEvents } from '@/utils/sampleData';

export const MultiCalendarEventShowcase: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const events = useMemo(() => generateMultiCalendarEvents(), []);

  const themeMode = useMemo(() => {
    if (resolvedTheme === 'dark') return 'dark';
    if (resolvedTheme === 'light') return 'light';
    return 'auto';
  }, [resolvedTheme]);

  const calendar = useCalendarApp({
    views: [
      createWeekView(),
      createMonthView({
        showWeekNumbers: true,
        showMonthIndicator: false,
      }),
    ],
    events: events,
    calendars: getWebsiteCalendars(),
    defaultCalendar: 'team',
    defaultView: ViewType.WEEK,
    theme: { mode: themeMode },
  });

  return (
    <div className='not-prose p-1'>
      <div className='mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'>
        <strong>Multi-calendar events</strong> are rendered with a diagonal
        stripe pattern background (one stripe per calendar color) and a
        multi-color gradient left-side bar.
      </div>
      <DayFlowCalendar calendar={calendar} />
    </div>
  );
};
