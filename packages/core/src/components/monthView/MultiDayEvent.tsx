import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { Event } from '../../types';
import {
  getLineColor,
  getSelectedBgColor,
  formatDateConsistent,
  getEventBgColor,
  getEventTextColor,
  formatTime,
  extractHourFromDate,
  getEventEndHour,
} from '../../utils';
import { getEventIcon } from '../../components/monthView/util';
import { monthEventColorBar } from '../../styles/classNames';

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
  onMoveStart: (e: any | any, event: Event) => void;
  onResizeStart?: (e: any | any, event: Event, direction: string) => void;
  onEventLongPress?: (eventId: string) => void;
  isMobile?: boolean;
  isDraggable?: boolean;
  isEditable?: boolean;
  viewable?: boolean;
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

    const handleMouseDown = (e: any) => {
      if (!isDraggable && !viewable) return;
      e.preventDefault();
      e.stopPropagation();
      setIsPressed(true);

      const target = e.target as HTMLElement;
      const isResizeHandle = target.closest('.resize-handle');

      if (!isResizeHandle && isDraggable) {
        onMoveStart(e, segment.event);
      }
    };

    const handleMouseUp = () => {
      setIsPressed(false);
    };

    const handleMouseLeave = () => {
      setIsPressed(false);
    };

    // Long press handling
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: any) => {
      if (!onMoveStart || !isMobile || (!isDraggable && !viewable)) return;
      e.stopPropagation();
      setIsPressed(true);

      const touch = e.touches[0];
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      const currentTarget = e.currentTarget;

      touchStartPosRef.current = { x: clientX, y: clientY };

      longPressTimerRef.current = setTimeout(() => {
        if (onEventLongPress) {
          onEventLongPress(segment.event.id);
        }

        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          currentTarget,
          touches: [{ clientX, clientY }],
          cancelable: false,
        } as unknown as any;

        if (isDraggable) {
          onMoveStart(syntheticEvent, segment.event);
        }
        longPressTimerRef.current = null;

        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    };

    const handleTouchMove = (e: any) => {
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
          className={`resize-handle absolute ${isLeft ? 'left-0' : 'right-0'} top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20`}
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
          <div className="flex items-center min-w-0 w-full pointer-events-auto">
            {segment.isFirstSegment && getEventIcon(segment.event) && (
              <div className="shrink-0 mr-1">
                <div
                  className="rounded-full p-0.5 text-white flex items-center justify-center"
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

            <div className="flex-1 min-w-0">
              <div className="truncate text-xs">{getDisplayText()}</div>
            </div>

            {segment.isLastSegment && segment.segmentType !== 'single' && (
              <div className="shrink-0 ml-1 text-white/80 dark:text-white/90">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 dark:bg-white/80"></div>
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
        <div className="relative flex items-center min-w-0 w-full pointer-events-auto">
          <div
            className={monthEventColorBar}
            style={{ backgroundColor: getLineColor(calendarId) }}
          />
          <div className="flex items-center min-w-0 flex-1">
            <span
              className={`whitespace-nowrap overflow-hidden block ${isMobile ? 'mobile-mask-fade' : 'truncate'} font-medium text-xs`}
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
              <span className="text-xs font-medium whitespace-nowrap ml-auto">
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
        className="absolute px-1 text-xs select-none flex items-center transition-all duration-200 hover:shadow-sm dark:hover:shadow-lg dark:hover:shadow-black/20 group"
        style={{
          left: adjustedLeft,
          width: adjustedWidth,
          top: `${topOffset}px`,
          height: `${ROW_HEIGHT}px`,
          borderRadius: getBorderRadius(segment.segmentType),
          pointerEvents: 'auto',
          zIndex: 10,
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
                className="absolute left-5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 rounded-full z-50 pointer-events-none"
                style={{ borderColor: getLineColor(calendarId) }}
              />
            )}
            {segment.isLastSegment && (
              <div
                className="absolute right-5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 rounded-full z-50 pointer-events-none"
                style={{ borderColor: getLineColor(calendarId) }}
              />
            )}
          </>
        )}
        {renderResizeHandle('left')}
        <div
          className="flex-1 min-w-0"
          style={{
            cursor: isResizing ? 'ew-resize' : 'pointer',
          }}
        >
          {renderEventContent()}
        </div>
        {renderResizeHandle('right')}
      </div>
    );
  }
);

(MultiDayEvent as any).displayName = 'MultiDayEvent';

export default MultiDayEvent;
