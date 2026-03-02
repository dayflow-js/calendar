import { ComponentChildren } from 'preact';
import { memo } from 'preact/compat';
import { useState, useRef } from 'preact/hooks';

import { getEventIcon } from '@/components/monthView/util';
import { monthEventColorBar } from '@/styles/classNames';
import { Event } from '@/types';
import {
  getLineColor,
  getSelectedBgColor,
  formatDateConsistent,
  getEventBgColor,
  getEventTextColor,
  formatTime,
  extractHourFromDate,
  getEventEndHour,
} from '@/utils';

export interface MultiDayEventSegment {
  id: string;
  originalEventId: string;
  event: Event;
  startDayIndex: number;
  endDayIndex: number;
  segmentType:
    | 'start'
    | 'middle'
    | 'end'
    | 'single'
    | 'start-week-end'
    | 'end-week-start';
  totalDays: number;
  segmentIndex: number;
  isFirstSegment: boolean;
  isLastSegment: boolean;
  yPosition?: number;
}

interface MultiDayEventProps {
  segment: MultiDayEventSegment;
  segmentIndex: number;
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
}

const ROW_HEIGHT = 16;
const ROW_SPACING = 17;

const getBorderRadius = (
  segmentType: MultiDayEventSegment['segmentType']
): string => {
  const radiusMap = {
    single: '0.25rem',
    start: '0.25rem 0 0 0.25rem',
    'start-week-end': '0.25rem 0 0 0.25rem',
    end: '0 0.25rem 0.25rem 0',
    'end-week-start': '0 0.25rem 0.25rem 0',
    middle: '0',
  };
  return radiusMap[segmentType];
};

// Render multi-day event component
export const MultiDayEvent = memo(
  ({
    segment,
    segmentIndex,
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
  }: MultiDayEventProps) => {
    const [isPressed, setIsPressed] = useState(false);
    const HORIZONTAL_MARGIN = 2; // 2px spacing on left and right

    const startPercent = (segment.startDayIndex / 7) * 100;
    const widthPercent =
      ((segment.endDayIndex - segment.startDayIndex + 1) / 7) * 100;
    const topOffset = segmentIndex * ROW_SPACING;

    // Calculate actual position and width with spacing
    const adjustedLeft = `calc(${startPercent}% + ${HORIZONTAL_MARGIN}px)`;
    const adjustedWidth = `calc(${widthPercent}% - ${HORIZONTAL_MARGIN * 2}px)`;

    const handleMouseDown = (e: MouseEvent) => {
      if (!isDraggable && !viewable) return;
      e.preventDefault();
      e.stopPropagation();
      setIsPressed(true);

      const target = e.target as HTMLElement;
      const isResizeHandle = target.closest('.resize-handle');

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
          className={`resize-handle absolute ${isLeft ? 'left-0' : 'right-0'} top-0 bottom-0 z-20 w-1 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100`}
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

    const renderEventContent = () => {
      const isAllDayEvent = segment.event.allDay;
      const calendarId = segment.event.calendarId || 'blue';
      const startHour = extractHourFromDate(segment.event.start);
      const endHour = getEventEndHour(segment.event);
      const startTimeText = formatTime(startHour);
      const endTimeText = formatTime(endHour);

      if (isAllDayEvent) {
        const getDisplayText = () => {
          if (segment.isFirstSegment) return segment.event.title;
          if (segment.segmentType === 'middle') return '···';
          if (segment.isLastSegment && segment.totalDays > 1) return '···';
          return segment.event.title;
        };

        return (
          <div className='pointer-events-auto flex w-full min-w-0 items-center'>
            {segment.isFirstSegment && getEventIcon(segment.event) && (
              <div className='mr-1 shrink-0'>
                <div
                  className='flex items-center justify-center rounded-full p-0.5 text-white'
                  style={{
                    backgroundColor: getLineColor(calendarId),
                    width: '12px',
                    height: '12px',
                  }}
                >
                  {getEventIcon(segment.event)}
                </div>
              </div>
            )}

            <div className='min-w-0 flex-1'>
              <div className='truncate text-xs'>{getDisplayText()}</div>
            </div>

            {segment.isLastSegment && segment.segmentType !== 'single' && (
              <div className='ml-1 shrink-0 text-white/80 dark:text-white/90'>
                <div className='h-1.5 w-1.5 rounded-full bg-white/60 dark:bg-white/80'></div>
              </div>
            )}
          </div>
        );
      }

      const titleText =
        segment.isFirstSegment || segment.isLastSegment
          ? segment.event.title
          : '···';

      const segmentDays = segment.endDayIndex - segment.startDayIndex + 1;
      const remainingPercent =
        segmentDays > 1 ? ((segmentDays - 1) / segmentDays) * 100 : 0;
      const startTimeClass = 'text-xs font-medium whitespace-nowrap';
      const startTimeStyle =
        segmentDays > 1
          ? {
              position: 'absolute' as const,
              right: `calc(${remainingPercent}% + ${HORIZONTAL_MARGIN}px)`,
              top: '50%',
              transform: 'translateY(-50%)',
            }
          : undefined;

      return (
        <div className='pointer-events-auto relative flex w-full min-w-0 items-center'>
          <div
            className={monthEventColorBar}
            style={{ backgroundColor: getLineColor(calendarId) }}
          />
          <div className='flex min-w-0 flex-1 items-center'>
            <span
              className={`block overflow-hidden whitespace-nowrap ${isMobile ? 'mobile-mask-fade' : 'truncate'} text-xs font-medium`}
            >
              {titleText}
            </span>
          </div>
          {segment.isFirstSegment && !isMobile && (
            <span
              className={`${startTimeClass} ${segmentDays === 1 ? 'ml-2' : ''}`}
              style={startTimeStyle}
            >
              {startTimeText}
            </span>
          )}
          {segment.isLastSegment &&
            !segment.event.allDay &&
            endHour !== 24 &&
            !isMobile && (
              <span className='ml-auto text-xs font-medium whitespace-nowrap'>
                {`ends ${endTimeText}`}
              </span>
            )}
        </div>
      );
    };

    const calendarId = segment.event.calendarId || 'blue';

    // Calculate the number of days occupied by the current segment
    const segmentDays = segment.endDayIndex - segment.startDayIndex + 1;

    return (
      <div
        className='group absolute flex items-center px-1 text-xs transition-all duration-200 select-none hover:shadow-sm dark:hover:shadow-lg dark:hover:shadow-black/20'
        style={{
          left: adjustedLeft,
          width: adjustedWidth,
          top: `${topOffset}px`,
          height: `${ROW_HEIGHT}px`,
          borderRadius: getBorderRadius(segment.segmentType),
          pointerEvents: 'auto',
          zIndex: 10,
          transform: isPopping ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform',
          ...(isSelected || isDragging || isPressed
            ? {
                backgroundColor: getSelectedBgColor(calendarId),
                color: '#fff',
              }
            : {
                backgroundColor: getEventBgColor(calendarId),
                color: getEventTextColor(calendarId),
              }),
          cursor: isDraggable ? 'pointer' : viewable ? 'pointer' : 'default',
        }}
        data-segment-days={segmentDays}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title={`${segment.event.title} (${formatDateConsistent(segment.event.start)} - ${formatDateConsistent(segment.event.end)})`}
      >
        {isMobile && isSelected && isEditable && (
          <>
            {segment.isFirstSegment && (
              <div
                className='pointer-events-auto absolute top-1/2 left-5 z-50 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 bg-white'
                style={{ borderColor: getLineColor(calendarId) }}
                onTouchStart={e => {
                  e.stopPropagation();
                  onResizeStart?.(e, segment.event, 'left');
                }}
              />
            )}
            {segment.isLastSegment && (
              <div
                className='pointer-events-auto absolute top-1/2 right-5 z-50 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 bg-white'
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
          className='min-w-0 flex-1'
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
