'use client';

import {
  useCalendarApp,
  DayFlowCalendar,
  UseCalendarAppReturn,
  CalendarAppConfig,
  CalendarSearchProps,
} from '@dayflow/react';
import React, { useEffect } from 'react';

interface CalendarViewerProps {
  config: CalendarAppConfig;
  calendarRef: React.MutableRefObject<UseCalendarAppReturn | null>;
  version: string;
  search?: CalendarSearchProps;
}

export function CalendarViewer({
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
