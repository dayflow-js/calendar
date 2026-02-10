import React from 'react';
import { Event } from '@/types';
import { CalendarApp } from '@/types';
import { getLineColor, extractHourFromDate } from '@/utils';
import {
  monthRegularContent,
  monthEventColorBar,
  textXs,
} from '@/styles/classNames';

interface MonthRegularContentProps {
  event: Event;
  app?: CalendarApp;
  isEventSelected: boolean;
  hideTime?: boolean;
}

const MonthRegularContent: React.FC<MonthRegularContentProps> = ({
  event,
  app,
  isEventSelected,
  hideTime,
}) => {
  const startTime = `${Math.floor(extractHourFromDate(event.start)).toString().padStart(2, '0')}:${Math.round(
    (extractHourFromDate(event.start) % 1) * 60
  )
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className={monthRegularContent}>
      <div className="flex items-center flex-1 min-w-0">
        <div
          style={{
            backgroundColor: getLineColor(event.calendarId || 'blue', app?.getCalendarRegistry()),
          }}
          className={monthEventColorBar}
        />
        <span
          className={`whitespace-nowrap overflow-hidden block md:truncate mobile-mask-fade ${isEventSelected ? 'text-white' : ''}`}
        >
          {event.title}
        </span>
      </div>
      {!hideTime && (
        <span
          className={`${textXs} ml-1 shrink-0 ${isEventSelected ? 'text-white' : ''} hidden md:block`}
          style={!isEventSelected ? { opacity: 0.8 } : undefined}
        >
          {startTime}
        </span>
      )}
    </div>
  );
};

export default MonthRegularContent;
