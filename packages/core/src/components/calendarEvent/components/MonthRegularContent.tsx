import {
  monthRegularContent,
  monthEventColorBar,
  textXs,
} from '@/styles/classNames';
import { Event, ICalendarApp } from '@/types';
import {
  getCalendarLineColors,
  buildColorBarGradient,
  extractHourFromDate,
} from '@/utils';

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

  const lineColors = getCalendarLineColors(event, app?.getCalendarRegistry());
  const colorBarValue = buildColorBarGradient(lineColors);
  const colorBarStyle =
    lineColors.length > 1
      ? { background: colorBarValue }
      : { backgroundColor: colorBarValue };
  const hideColorBar = isEventSelected && lineColors.length > 1;

  return (
    <div className={monthRegularContent}>
      <div className='flex min-w-0 flex-1 items-center'>
        {!hideColorBar && (
          <div style={colorBarStyle} className={monthEventColorBar} />
        )}
        <span
          className={`block overflow-hidden whitespace-nowrap ${isMobile ? 'df-mobile-mask-fade' : 'truncate'} ${isEventSelected ? 'text-white' : ''}`}
        >
          {event.title}
        </span>
      </div>
      {!hideTime && !isMobile && (
        <span
          className={`${textXs} ml-1 shrink-0 ${isEventSelected ? 'text-white' : ''}`}
          style={isEventSelected ? undefined : { opacity: 0.8 }}
        >
          {startTime}
        </span>
      )}
    </div>
  );
};

export default MonthRegularContent;
