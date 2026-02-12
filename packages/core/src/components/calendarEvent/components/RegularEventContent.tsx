import { h } from 'preact';
import { Event } from '@/types';
import { ICalendarApp } from '@/types';
import {
  formatEventTimeRange,
  getLineColor,
  extractHourFromDate,
  getEventEndHour,
  formatTime,
} from '@/utils';
import {
  eventColorBar,
  eventTitleSmall,
  eventTime,
  resizeHandleTop,
  resizeHandleBottom,
  resizeHandleRight,
} from '@/styles/classNames';

interface RegularEventContentProps {
  event: Event;
  app?: ICalendarApp;
  multiDaySegmentInfo?: { startHour: number; endHour: number; isFirst: boolean; isLast: boolean; dayIndex?: number };
  isEditable: boolean;
  isTouchEnabled: boolean;
  isEventSelected: boolean;
  onResizeStart?: (
    e: any | any,
    event: Event,
    direction: string
  ) => void;
}

const RegularEventContent = ({
  event,
  app,
  multiDaySegmentInfo,
  isEditable,
  isTouchEnabled,
  isEventSelected,
  onResizeStart,
}: RegularEventContentProps) => {
  const startHour = multiDaySegmentInfo
    ? multiDaySegmentInfo.startHour
    : extractHourFromDate(event.start);
  const endHour = multiDaySegmentInfo
    ? multiDaySegmentInfo.endHour
    : getEventEndHour(event);
  const duration = endHour - startHour;
  const isFirstSegment = multiDaySegmentInfo ? multiDaySegmentInfo.isFirst : true;
  const isLastSegment = multiDaySegmentInfo ? multiDaySegmentInfo.isLast : true;
  const calendarId = event.calendarId || 'blue';

  const getDynamicPadding = () => {
    const d = getEventEndHour(event) - extractHourFromDate(event.start);
    return d <= 0.25 ? 'px-1 py-0' : 'p-1';
  };

  return (
    <>
      <div
        className={eventColorBar}
        style={{ backgroundColor: getLineColor(event.calendarId || 'blue', app?.getCalendarRegistry()) }}
      />
      <div
        className={`h-full flex flex-col overflow-hidden pl-3 ${getDynamicPadding()}`}
      >
        <div
          className={`${eventTitleSmall} pr-1`}
          style={{
            lineHeight: duration <= 0.25 ? '1.2' : 'normal',
          }}
        >
          {event.title}
        </div>
        {duration > 0.5 && (
          <div className={eventTime}>
            {multiDaySegmentInfo
              ? `${formatTime(startHour)} - ${formatTime(endHour)}`
              : formatEventTimeRange(event)}
          </div>
        )}
      </div>

      {onResizeStart && isEditable && (
        <>
          {/* Only show top resize handle on the first segment */}
          {isFirstSegment && (
            <div
              className={resizeHandleTop}
              onMouseDown={e => onResizeStart(e, event, 'top')}
            />
          )}
          {/* Only show bottom resize handle on the last segment */}
          {isLastSegment && (
            <div
              className={resizeHandleBottom}
              onMouseDown={e => onResizeStart(e, event, 'bottom')}
            />
          )}
          {/* Right resize handle for multi-day events (only on the last segment) */}
          {!isFirstSegment && isLastSegment && multiDaySegmentInfo && (
            <div
              className={resizeHandleRight}
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
                onResizeStart(e, event, 'right');
              }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          )}
        </>
      )}

      {isTouchEnabled && isEventSelected && onResizeStart && isEditable && (
        <>
          {/* Top-Right Indicator (Start Time) */}
          <div
            className="absolute -top-1.5 right-5 w-2.5 h-2.5 bg-white border-2 rounded-full z-50"
            style={{ borderColor: getLineColor(calendarId, app?.getCalendarRegistry()) }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onResizeStart(e, event, 'top');
            }}
          />
          {/* Bottom-Left Indicator (End Time) */}
          <div
            className="absolute -bottom-1.5 left-5 w-2.5 h-2.5 bg-white border-2 rounded-full z-50"
            style={{ borderColor: getLineColor(calendarId, app?.getCalendarRegistry()) }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onResizeStart(e, event, 'bottom');
            }}
          />
        </>
      )}
    </>
  );
};

export default RegularEventContent;
