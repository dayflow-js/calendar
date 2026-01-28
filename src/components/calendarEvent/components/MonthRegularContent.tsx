import React from 'react';
import { Event } from '@/types';
import { CalendarApp } from '@/core';
import { getLineColor, extractHourFromDate } from '@/utils';
import {
  monthRegularContent,
  mr1,
  textXs,
} from '@/styles/classNames';

interface MonthRegularContentProps {
  event: Event;
  app?: CalendarApp;
  isEventSelected: boolean;
}

const MonthRegularContent: React.FC<MonthRegularContentProps> = ({
  event,
  app,
  isEventSelected,
}) => {
  const startTime = `${Math.floor(extractHourFromDate(event.start)).toString().padStart(2, '0')}:${Math.round(
    (extractHourFromDate(event.start) % 1) * 60
  )
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className={monthRegularContent}>
      <div className="flex items-center flex-1 min-w-0">
        <span
          style={{
            backgroundColor: getLineColor(event.calendarId || 'blue', app?.getCalendarRegistry()),
          }}
          className={`inline-block w-0.75 h-3 ${mr1} shrink-0 rounded-full`}
        ></span>
        <span
          className={`whitespace-nowrap overflow-hidden block md:truncate mobile-mask-fade ${isEventSelected ? 'text-white' : ''}`}
        >
          {event.title}
        </span>
      </div>
      <span
        className={`${textXs} ml-1 shrink-0 ${isEventSelected ? 'text-white' : ''} hidden md:block`}
        style={!isEventSelected ? { opacity: 0.8 } : undefined}
      >
        {startTime}
      </span>
    </div>
  );
};

export default MonthRegularContent;
