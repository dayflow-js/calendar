'use client';

import { TitleBarSlotProps } from '@dayflow/core';
import {
  useCalendarApp,
  DayFlowCalendar,
  DayFlowCalendarProps,
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
  collapsedSafeAreaLeft?: number;
  titleBarSlot?: DayFlowCalendarProps['titleBarSlot'];
}

export function CalendarViewer({
  config,
  calendarRef,
  version,
  search,
  collapsedSafeAreaLeft,
  titleBarSlot,
}: CalendarViewerProps) {
  const calendar = useCalendarApp(config, version);
  useEffect(() => {
    calendarRef.current = calendar;
  }, [calendar, calendarRef]);

  return (
    <DayFlowCalendar
      calendar={calendar}
      search={search}
      collapsedSafeAreaLeft={collapsedSafeAreaLeft}
      titleBarSlot={titleBarSlot}
    />
  );
}
