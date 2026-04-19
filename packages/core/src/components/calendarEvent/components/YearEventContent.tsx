import { ComponentChildren } from 'preact';

import { getEventIcon } from '@/components/monthView/util';
import { YearMultiDaySegment } from '@/components/yearView/utils';
import { resizeHandleLeft, resizeHandleRight } from '@/styles/classNames';
import { Event } from '@/types';
import {
  getLineColor,
  getPrimaryCalendarId,
  getCalendarLineColors,
  buildColorBarGradient,
} from '@/utils';

interface YearEventContentProps {
  event: Event;
  segment: YearMultiDaySegment;
  isEditable: boolean;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  /** Optional slot renderer — receives the default visual content and wraps it in a ContentSlot */
  renderSlot?: (defaultContent: ComponentChildren) => ComponentChildren;
}

const YearEventContent = ({
  event,
  segment,
  isEditable,
  onMoveStart,
  onResizeStart,
  renderSlot,
}: YearEventContentProps) => {
  const isAllDay = !!event.allDay;
  const calendarId = getPrimaryCalendarId(event);
  const lineColors = getCalendarLineColors(event);
  const indicatorColorBarValue = buildColorBarGradient(lineColors);
  const indicatorColorBarStyle =
    lineColors.length > 1
      ? { background: indicatorColorBarValue }
      : { backgroundColor: indicatorColorBarValue };
  const { isFirstSegment, isLastSegment } = segment;

  const renderResizeHandle = (position: 'left' | 'right') => {
    const isLeft = position === 'left';
    const shouldShow = isLeft ? isFirstSegment : isLastSegment;

    // Only allow resizing for all-day events in Year View
    if (!event.allDay || !shouldShow || !onResizeStart || !isEditable)
      return null;

    return (
      <div
        className={isLeft ? resizeHandleLeft : resizeHandleRight}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e as MouseEvent, event, isLeft ? 'left' : 'right');
        }}
        onTouchStart={e => {
          e.stopPropagation();
          onResizeStart(e as TouchEvent, event, isLeft ? 'left' : 'right');
        }}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    );
  };

  const renderContent = () => {
    if (isAllDay) {
      const getDisplayText = () => {
        if (segment.isFirstSegment) return event.title;
        return '···';
      };

      return (
        <div
          className='df-event-year-content'
          onMouseDown={e => {
            if (onMoveStart) {
              e.stopPropagation();
              onMoveStart(e as MouseEvent, event);
            }
          }}
        >
          {segment.isFirstSegment && getEventIcon(event) && (
            <div className='df-event-icon-slot'>
              <div
                className='df-event-year-icon-badge'
                style={{
                  backgroundColor: getLineColor(calendarId),
                }}
              >
                {getEventIcon(event)}
              </div>
            </div>
          )}

          <div className='df-event-year-main'>
            <div className='df-event-year-title'>{getDisplayText()}</div>
          </div>

          {/* Add small indicator for continuation if needed, similar to MultiDayEvent */}
          {segment.isLastSegment && !segment.isFirstSegment && (
            <div className='df-event-year-tail'>
              <div className='df-event-year-tail-dot'></div>
            </div>
          )}
        </div>
      );
    }

    // For non-all-day events treated as bars in Year View
    const titleText = segment.isFirstSegment ? event.title : '';

    return (
      <div
        className='df-event-year-content df-event-year-content-timed'
        onMouseDown={e => {
          if (onMoveStart) {
            e.stopPropagation();
            onMoveStart(e as MouseEvent, event);
          }
        }}
      >
        {!isAllDay && (
          <span
            style={indicatorColorBarStyle}
            className='df-event-year-indicator'
          ></span>
        )}
        <span className='df-event-year-title df-event-year-title-strong'>
          {titleText}
        </span>
      </div>
    );
  };

  return (
    <>
      {renderResizeHandle('left')}
      {renderSlot ? renderSlot(renderContent()) : renderContent()}
      {renderResizeHandle('right')}
    </>
  );
};

export default YearEventContent;
