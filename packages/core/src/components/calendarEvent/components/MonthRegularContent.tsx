import { monthRegularContent, monthEventColorBar } from '@/styles/classNames';
import { Event, ICalendarApp } from '@/types';
import {
  getCalendarLineColors,
  buildColorBarGradient,
  extractHourFromDate,
} from '@/utils';

const mobileFadeStyle = {
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'clip',
  WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
  maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
} as const;

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
  isEventSelected: _isEventSelected,
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
  const hideColorBar = _isEventSelected && lineColors.length > 1;

  return (
    <div className={monthRegularContent} data-mobile={String(!!isMobile)}>
      <div className='df-event-month-main'>
        {!hideColorBar && (
          <div style={colorBarStyle} className={monthEventColorBar} />
        )}
        <span
          className={`df-event-month-title ${isMobile ? 'df-mobile-mask-fade' : ''}`}
          style={isMobile ? mobileFadeStyle : undefined}
        >
          {event.title}
        </span>
      </div>
      {!hideTime && !isMobile && (
        <span className='df-event-month-time'>{startTime}</span>
      )}
    </div>
  );
};

export default MonthRegularContent;
