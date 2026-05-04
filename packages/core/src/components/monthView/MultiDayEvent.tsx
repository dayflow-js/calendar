import { ComponentChildren } from 'preact';
import { memo } from 'preact/compat';
import { useState, useRef, useMemo } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { getAllDaySegmentShape } from '@/components/calendarEvent/utils';
import {
  MultiDayEventSegment,
  getEventIcon,
} from '@/components/monthView/util';
import {
  monthEventColorBar,
  resizeHandleLeft,
  resizeHandleRight,
} from '@/styles/classNames';
import { Event } from '@/types';
import {
  getLineColor,
  getSelectedBgColor,
  formatDateConsistent,
  getEventBgColor,
  getEventTextColor,
  getPrimaryCalendarId,
  getCalendarLineColors,
  buildColorBarGradient,
  getCalendarEventBgColors,
  buildDiagonalPatternBackground,
  formatTime,
  extractHourFromDate,
  getEventEndHour,
  temporalToVisualTemporal,
} from '@/utils';

interface MultiDayEventProps {
  segment: MultiDayEventSegment;
  segmentIndex: number;
  eventHeight?: number;
  isDragging: boolean;
  isResizing?: boolean;
  isSelected?: boolean;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  onEventLongPress?: (eventId: string) => void;
  isMobile?: boolean;
  isDraggable?: boolean;
  isEditable?: boolean;
  viewable?: boolean;
  isPopping?: boolean;
  /** Optional slot renderer — receives the default visual content and wraps it in a ContentSlot */
  renderSlot?: (defaultContent: ComponentChildren) => ComponentChildren;
  appTimeZone?: string;
}

const DEFAULT_EVENT_HEIGHT = 16;
const POP_TRANSITION = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
const mobileFadeStyle = {
  whiteSpace: 'nowrap',
  textOverflow: 'clip',
  WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
  maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
} as const;

// Render multi-day event component
export const MultiDayEvent = memo(
  ({
    segment,
    segmentIndex,
    eventHeight = DEFAULT_EVENT_HEIGHT,
    isDragging,
    isResizing = false,
    isSelected = false,
    onMoveStart,
    onResizeStart,
    onEventLongPress,
    isMobile = false,
    isDraggable = true,
    isEditable = true,
    viewable = true,
    isPopping,
    renderSlot,
    appTimeZone,
  }: MultiDayEventProps) => {
    const [isPressed, setIsPressed] = useState(false);
    const HORIZONTAL_MARGIN = 2; // 2px spacing on left and right
    const rowSpacing = eventHeight + 1;

    const visualEvent = useMemo(() => {
      if (!appTimeZone || segment.event.allDay) return segment.event;
      const start = temporalToVisualTemporal(
        segment.event.start as Temporal.PlainDate,
        appTimeZone
      );
      const end = segment.event.end
        ? temporalToVisualTemporal(
            segment.event.end as Temporal.PlainDate,
            appTimeZone
          )
        : undefined;
      return { ...segment.event, start, end } as Event;
    }, [segment.event, appTimeZone]);

    const startPercent = (segment.startDayIndex / 7) * 100;
    const widthPercent =
      ((segment.endDayIndex - segment.startDayIndex + 1) / 7) * 100;
    const topOffset = segmentIndex * rowSpacing;

    // Calculate actual position and width with spacing
    const adjustedLeft = `calc(${startPercent}% + ${HORIZONTAL_MARGIN}px)`;
    const adjustedWidth = `calc(${widthPercent}% - ${HORIZONTAL_MARGIN * 2}px)`;

    const handleMouseDown = (e: MouseEvent) => {
      if (!isDraggable && !viewable) return;
      e.preventDefault();
      e.stopPropagation();
      setIsPressed(true);

      const target = e.target as HTMLElement;
      const isResizeHandle = target.closest('.df-resize-handle');

      if (!isResizeHandle && isDraggable) {
        onMoveStart?.(e, segment.event);
      }
    };

    const handleMouseUp = () => {
      setIsPressed(false);
    };

    const handleMouseLeave = () => {
      setIsPressed(false);
    };

    // Long press handling
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: TouchEvent) => {
      if (!onMoveStart || !isMobile || (!isDraggable && !viewable)) return;
      e.stopPropagation();
      setIsPressed(true);

      const touch = e.touches[0];
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      const currentTarget = e.currentTarget as HTMLElement;

      touchStartPosRef.current = { x: clientX, y: clientY };

      longPressTimerRef.current = setTimeout(() => {
        if (onEventLongPress) {
          onEventLongPress(segment.event.id);
        }

        const syntheticEvent = {
          preventDefault: () => {
            /* noop */
          },
          stopPropagation: () => {
            /* noop */
          },
          currentTarget,
          touches: [{ clientX, clientY }],
          cancelable: false,
        } as unknown as MouseEvent | TouchEvent;

        if (isDraggable) {
          onMoveStart(syntheticEvent, segment.event);
        }
        longPressTimerRef.current = null;

        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (longPressTimerRef.current && touchStartPosRef.current) {
        const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
        const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
        if (dx > 10 || dy > 10) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          touchStartPosRef.current = null;
          setIsPressed(false);
        }
      }
    };

    const handleTouchEnd = () => {
      setIsPressed(false);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartPosRef.current = null;
    };

    const renderResizeHandle = (position: 'left' | 'right') => {
      const isLeft = position === 'left';
      const shouldShow = isLeft
        ? segment.isFirstSegment
        : segment.isLastSegment;

      if (!shouldShow || !onResizeStart || !isEditable) return null;

      return (
        <div
          className={isLeft ? resizeHandleLeft : resizeHandleRight}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(e, segment.event, isLeft ? 'left' : 'right');
          }}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      );
    };

    const calendarId = getPrimaryCalendarId(segment.event);
    const isMultiCalendarEvent =
      !!segment.event.calendarIds && segment.event.calendarIds.length > 1;
    const multiCalendarBgColors = isMultiCalendarEvent
      ? getCalendarEventBgColors(segment.event)
      : null;
    const isActive = isSelected || isDragging || isPressed;

    const renderEventContent = () => {
      const isAllDayEvent = visualEvent.allDay;
      const visualCalendarId = getPrimaryCalendarId(visualEvent);
      const startHour = extractHourFromDate(visualEvent.start);
      const endHour = getEventEndHour(visualEvent);
      const startTimeText = formatTime(startHour);
      const endTimeText = formatTime(endHour);
      const lineColors = getCalendarLineColors(segment.event);
      const hideColorBar = isActive && isMultiCalendarEvent;

      if (isAllDayEvent) {
        const getDisplayText = () => {
          if (segment.isFirstSegment) return visualEvent.title;
          if (segment.segmentType === 'middle') return '···';
          if (segment.isLastSegment && segment.totalDays > 1) return '···';
          return visualEvent.title;
        };

        return (
          <div className='df-month-segment-event-all-day'>
            {segment.isFirstSegment && getEventIcon(visualEvent) && (
              <div className='df-event-icon-slot'>
                <div
                  className='df-event-year-icon-badge'
                  style={{
                    backgroundColor: getLineColor(visualCalendarId),
                  }}
                >
                  {getEventIcon(visualEvent)}
                </div>
              </div>
            )}

            <div className='df-month-segment-event-all-day-main'>
              <div
                className={`df-month-segment-event-all-day-title ${isMobile ? 'df-mobile-mask-fade' : ''}`}
                style={isMobile ? mobileFadeStyle : undefined}
              >
                {getDisplayText()}
              </div>
            </div>

            {segment.isLastSegment && segment.segmentType !== 'single' && (
              <div className='df-month-segment-event-tail'>
                <div className='df-month-segment-event-tail-dot'></div>
              </div>
            )}
          </div>
        );
      }

      const titleText =
        segment.isFirstSegment || segment.isLastSegment
          ? visualEvent.title
          : '···';

      const segmentDays = segment.endDayIndex - segment.startDayIndex + 1;
      const remainingPercent =
        segmentDays > 1 ? ((segmentDays - 1) / segmentDays) * 100 : 0;
      const startTimeStyle =
        segmentDays > 1
          ? {
              right: `calc(${remainingPercent}% + ${HORIZONTAL_MARGIN}px)`,
              top: '50%',
              transform: 'translateY(-50%)',
            }
          : undefined;

      return (
        <div className='df-event-month-main'>
          {!hideColorBar && (
            <div
              className={monthEventColorBar}
              style={
                lineColors.length > 1
                  ? { background: buildColorBarGradient(lineColors) }
                  : { backgroundColor: lineColors[0] }
              }
            />
          )}
          <div className='df-event-month-main'>
            <span
              className={`df-event-month-title ${isMobile ? 'df-mobile-mask-fade' : ''}`}
              style={isMobile ? mobileFadeStyle : undefined}
            >
              {titleText}
            </span>
          </div>
          {segment.isFirstSegment && !isMobile && (
            <span
              className={`df-month-segment-event-time ${segmentDays === 1 ? 'df-month-segment-event-time-spaced' : 'df-month-segment-event-time-overlay'}`}
              style={startTimeStyle}
            >
              {startTimeText}
            </span>
          )}
          {segment.isLastSegment &&
            !visualEvent.allDay &&
            endHour !== 24 &&
            !isMobile && (
              <span className='df-month-segment-event-tail-time'>
                {`ends ${endTimeText}`}
              </span>
            )}
        </div>
      );
    };

    // Calculate the number of days occupied by the current segment
    const segmentDays = segment.endDayIndex - segment.startDayIndex + 1;

    return (
      <div
        className='df-month-segment-event'
        style={{
          left: adjustedLeft,
          width: adjustedWidth,
          top: `${topOffset}px`,
          height: `${eventHeight}px`,
          pointerEvents: 'auto',
          zIndex: 10,
          transform: isPopping ? 'scale(1.02)' : 'scale(1)',
          transition: POP_TRANSITION,
          willChange: 'transform',
          ...(isActive
            ? {
                backgroundColor: getSelectedBgColor(calendarId),
                color: '#fff',
              }
            : isMultiCalendarEvent
              ? {
                  background: buildDiagonalPatternBackground(
                    multiCalendarBgColors!
                  ),
                  color: getEventTextColor(calendarId),
                }
              : {
                  backgroundColor: getEventBgColor(calendarId),
                  color: getEventTextColor(calendarId),
                }),
          cursor: isDraggable ? 'pointer' : viewable ? 'pointer' : 'default',
        }}
        data-all-day={String(!!visualEvent.allDay)}
        data-selected={String(isSelected)}
        data-dragging={String(isDragging)}
        data-resizing={String(isResizing)}
        data-popping={String(!!isPopping)}
        data-segment-shape={getAllDaySegmentShape(segment)}
        data-segment-days={segmentDays}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title={`${visualEvent.title} (${formatDateConsistent(visualEvent.start)} - ${formatDateConsistent(visualEvent.end)})`}
      >
        {isMobile && isSelected && isEditable && (
          <>
            {segment.isFirstSegment && (
              <div
                className='df-event-touch-resize-indicator'
                data-axis='horizontal'
                data-position='left'
                style={{ borderColor: getLineColor(calendarId) }}
                onTouchStart={e => {
                  e.stopPropagation();
                  onResizeStart?.(e, segment.event, 'left');
                }}
              />
            )}
            {segment.isLastSegment && (
              <div
                className='df-event-touch-resize-indicator'
                data-axis='horizontal'
                data-position='right'
                style={{ borderColor: getLineColor(calendarId) }}
                onTouchStart={e => {
                  e.stopPropagation();
                  onResizeStart?.(e, segment.event, 'right');
                }}
              />
            )}
          </>
        )}
        {renderResizeHandle('left')}
        <div
          className='df-month-segment-event-body'
          style={{
            cursor: isResizing ? 'ew-resize' : 'pointer',
          }}
        >
          {renderSlot ? renderSlot(renderEventContent()) : renderEventContent()}
        </div>
        {renderResizeHandle('right')}
      </div>
    );
  }
);

(MultiDayEvent as { displayName?: string }).displayName = 'MultiDayEvent';

export default MultiDayEvent;
