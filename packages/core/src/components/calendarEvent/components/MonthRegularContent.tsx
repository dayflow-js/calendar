import { Event } from '@/types';
import { ICalendarApp } from '@/types';
import { getLineColor, extractHourFromDate } from '@/utils';
import {
  monthRegularContent,
  monthEventColorBar,
  textXs,
} from '@/styles/classNames';

interface MonthRegularContentProps {
  event: Event;
  app?: ICalendarApp;
  isEventSelected: boolean;
  hideTime?: boolean;
  isMobile?: boolean;
}

const MonthRegularContent = ({
  event,
  app,
  isEventSelected,
  hideTime,
  isMobile,
}: MonthRegularContentProps) => {
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
            backgroundColor: getLineColor(
              event.calendarId || 'blue',
              app?.getCalendarRegistry()
            ),
          }}
          className={monthEventColorBar}
        />
        <span
          className={`whitespace-nowrap overflow-hidden block ${isMobile ? 'mobile-mask-fade' : 'truncate'} ${isEventSelected ? 'text-white' : ''}`}
        >
          {event.title}
        </span>
      </div>
      {!hideTime && !isMobile && (
        <span
          className={`${textXs} ml-1 shrink-0 ${isEventSelected ? 'text-white' : ''}`}
          style={!isEventSelected ? { opacity: 0.8 } : undefined}
        >
          {startTime}
        </span>
      )}
    </div>
  );
};

export default MonthRegularContent;
