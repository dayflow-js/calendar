import { monthRegularContent, monthEventColorBar } from '@/styles/classNames';
import { Event, ICalendarApp } from '@/types';
import {
  getCalendarLineColors,
  buildColorBarGradient,
  extractHourFromDate,
  formatTime,
} from '@/utils';
import { getTaskPriorityMark, isTask } from '@/utils/taskUtils';

import { TaskCheckbox } from './TaskCheckbox';

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
  isEditable?: boolean;
  hideTime?: boolean;
  isMobile?: boolean;
  timeFormat?: '12h' | '24h';
}

const MonthRegularContent = ({
  event,
  app,
  isEventSelected: _isEventSelected,
  isEditable = false,
  hideTime,
  isMobile,
  timeFormat = '24h',
}: MonthRegularContentProps) => {
  const startDecimalHour = extractHourFromDate(event.start);
  const startTime = formatTime(
    Math.floor(startDecimalHour),
    Math.round((startDecimalHour % 1) * 60),
    timeFormat
  );

  const lineColors = getCalendarLineColors(event, app?.getCalendarRegistry());
  const colorBarValue = buildColorBarGradient(lineColors);
  const colorBarStyle =
    lineColors.length > 1
      ? { background: colorBarValue }
      : { backgroundColor: colorBarValue };
  const hideColorBar = _isEventSelected && lineColors.length > 1;
  const priorityMark = getTaskPriorityMark(event);

  return (
    <div className={monthRegularContent} data-mobile={String(!!isMobile)}>
      <div className='df-event-month-main'>
        {isTask(event) ? (
          <TaskCheckbox
            event={event}
            app={app}
            isEditable={isEditable}
            color={lineColors[0]}
          />
        ) : (
          !hideColorBar && (
            <div style={colorBarStyle} className={monthEventColorBar} />
          )
        )}
        <span
          className={`df-event-month-title ${isMobile ? 'df-mobile-mask-fade' : ''}`}
          style={isMobile ? mobileFadeStyle : undefined}
        >
          {priorityMark && (
            <span className='df-task-priority-mark'>{priorityMark}</span>
          )}
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
