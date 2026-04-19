import { ComponentChildren } from 'preact';

import {
  eventColorBar,
  eventTitleSmall,
  eventTime,
  resizeHandleLeft,
  resizeHandleTop,
  resizeHandleBottom,
  resizeHandleRight,
} from '@/styles/classNames';
import { Event, ICalendarApp } from '@/types';
import {
  formatEventTimeRange,
  getLineColor,
  getCalendarLineColors,
  buildDiagonalColorBarGradient,
  getPrimaryCalendarId,
  extractHourFromDate,
  getEventEndHour,
  formatTime,
} from '@/utils';

interface RegularEventContentProps {
  event: Event;
  app?: ICalendarApp;
  multiDaySegmentInfo?: {
    startHour: number;
    endHour: number;
    isFirst: boolean;
    isLast: boolean;
    dayIndex?: number;
  };
  isEditable: boolean;
  isTouchEnabled: boolean;
  isEventSelected: boolean;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  timeFormat?: '12h' | '24h';
  resizeHandleOrientation?: 'vertical' | 'horizontal';
  /** Optional slot renderer — receives the default visual content and wraps it in a ContentSlot */
  renderSlot?: (defaultContent: ComponentChildren) => ComponentChildren;
}

const colorBarClipPath =
  'inset(0.25rem calc(100% - 0.25rem - 3px) 0.25rem 0.25rem round 9999px)';

const RegularEventContent = ({
  event,
  app,
  multiDaySegmentInfo,
  isEditable,
  isTouchEnabled,
  isEventSelected,
  onResizeStart,
  timeFormat = '24h',
  resizeHandleOrientation = 'vertical',
  renderSlot,
}: RegularEventContentProps) => {
  const startHour = multiDaySegmentInfo
    ? multiDaySegmentInfo.startHour
    : extractHourFromDate(event.start);
  const endHour = multiDaySegmentInfo
    ? multiDaySegmentInfo.endHour
    : getEventEndHour(event);
  const duration = endHour - startHour;
  const isFirstSegment = multiDaySegmentInfo
    ? multiDaySegmentInfo.isFirst
    : true;
  const isLastSegment = multiDaySegmentInfo ? multiDaySegmentInfo.isLast : true;
  const calendarId = getPrimaryCalendarId(event);
  const contentPaddingClass =
    !multiDaySegmentInfo && duration <= 0.25 ? 'compact' : 'default';

  const lineColors = getCalendarLineColors(event, app?.getCalendarRegistry());
  const colorBarValue = buildDiagonalColorBarGradient(lineColors);
  const hideColorBar = isEventSelected && lineColors.length > 1;
  const colorBarContent = hideColorBar ? null : lineColors.length > 1 ? (
    <div
      className='df-event-color-bar-overlay'
      style={{
        background: colorBarValue,
        clipPath: colorBarClipPath,
      }}
    />
  ) : (
    <div className={eventColorBar} style={{ backgroundColor: colorBarValue }} />
  );

  const visualContent = (
    <>
      {colorBarContent}
      <div
        className='df-event-timed-content'
        data-density={contentPaddingClass}
      >
        <div
          className={`${eventTitleSmall} ${duration <= 0.25 ? 'df-event-title-tight' : ''}`}
        >
          {event.title}
        </div>
        {duration > 0.5 && (
          <div className={eventTime}>
            {multiDaySegmentInfo
              ? `${formatTime(startHour, 0, timeFormat)} - ${formatTime(endHour, 0, timeFormat)}`
              : formatEventTimeRange(event, timeFormat)}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {renderSlot ? renderSlot(visualContent) : visualContent}

      {onResizeStart &&
        isEditable &&
        resizeHandleOrientation === 'vertical' && (
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

      {isTouchEnabled &&
        isEventSelected &&
        onResizeStart &&
        isEditable &&
        resizeHandleOrientation === 'vertical' && (
          <>
            {/* Top-Right Indicator (Start Time) */}
            <div
              className='df-event-touch-resize-indicator'
              data-axis='vertical'
              data-position='top'
              style={{
                borderColor: getLineColor(
                  calendarId,
                  app?.getCalendarRegistry()
                ),
              }}
              onTouchStart={e => {
                e.stopPropagation();
                onResizeStart(e, event, 'top');
              }}
            />
            {/* Bottom-Left Indicator (End Time) */}
            <div
              className='df-event-touch-resize-indicator'
              data-axis='vertical'
              data-position='bottom'
              style={{
                borderColor: getLineColor(
                  calendarId,
                  app?.getCalendarRegistry()
                ),
              }}
              onTouchStart={e => {
                e.stopPropagation();
                onResizeStart(e, event, 'bottom');
              }}
            />
          </>
        )}

      {onResizeStart &&
        isEditable &&
        resizeHandleOrientation === 'horizontal' && (
          <>
            <div
              className={resizeHandleLeft}
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
                onResizeStart(e, event, 'left');
              }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
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
          </>
        )}
    </>
  );
};

export default RegularEventContent;
