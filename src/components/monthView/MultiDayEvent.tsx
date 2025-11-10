import React from 'react';
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
import { getEventIcon } from '@/components/monthView/util';

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
  onMoveStart: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    event: Event
  ) => void;
  onResizeStart?: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    event: Event,
    direction: string
  ) => void;
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
export const MultiDayEvent = React.memo<MultiDayEventProps>(
  ({
    segment,
    segmentIndex,
    isDragging,
    isResizing = false,
    isSelected = false,
    onMoveStart,
    onResizeStart,
  }) => {
    const HORIZONTAL_MARGIN = 2; // 2px spacing on left and right

    const startPercent = (segment.startDayIndex / 7) * 100;
    const widthPercent =
      ((segment.endDayIndex - segment.startDayIndex + 1) / 7) * 100;
    const topOffset = segmentIndex * ROW_SPACING;

    // Calculate actual position and width with spacing
    const adjustedLeft = `calc(${startPercent}% + ${HORIZONTAL_MARGIN}px)`;
    const adjustedWidth = `calc(${widthPercent}% - ${HORIZONTAL_MARGIN * 2}px)`;

    const handleMouseDown = (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      const isResizeHandle = target.closest('.resize-handle');

      if (!isResizeHandle) {
        onMoveStart(e, segment.event);
      }
    };

    const renderResizeHandle = (position: 'left' | 'right') => {
      const isLeft = position === 'left';
      const shouldShow = isLeft
        ? segment.isFirstSegment
        : segment.isLastSegment;

      if (!shouldShow || !onResizeStart) return null;

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
          if (segment.isLastSegment && segment.totalDays > 1)
            return '···';
          return segment.event.title;
        };

        return (
          <div className="flex items-center min-w-0 w-full pointer-events-auto">
            {segment.isFirstSegment && (
              <div className="flex-shrink-0 mr-1">
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
              <div className="truncate font-medium text-xs">
                {getDisplayText()}
              </div>
            </div>

            {segment.isLastSegment &&
              segment.segmentType !== 'single' && (
                <div className="flex-shrink-0 ml-1 text-white/80 dark:text-white/90">
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
          <span
            className="inline-block w-[3px] h-3 rounded-full flex-shrink-0 mr-1"
            style={{ backgroundColor: getLineColor(calendarId) }}
          />
          <div className="flex items-center min-w-0 flex-1">
            <span className="truncate font-medium text-xs">{titleText}</span>
          </div>
          {segment.isFirstSegment && (
            <span
              className={`${startTimeClass} ${segmentDays === 1 ? 'ml-2' : ''
                }`}
              style={startTimeStyle}
            >
              {startTimeText}
            </span>
          )}
          {segment.isLastSegment && !segment.event.allDay && endHour !== 24 && (
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
          top: `${topOffset - 2}px`,
          height: `${ROW_HEIGHT}px`,
          borderRadius: getBorderRadius(segment.segmentType),
          pointerEvents: 'auto',
          zIndex: 10,
          ...(isSelected || isDragging
            ? {
              backgroundColor: getSelectedBgColor(calendarId),
              color: '#fff',
            }
            : {
              backgroundColor: getEventBgColor(calendarId),
              color: getEventTextColor(calendarId),
            }),
        }}
        data-segment-days={segmentDays}
        onMouseDown={handleMouseDown}
        title={`${segment.event.title} (${formatDateConsistent(segment.event.start)} - ${formatDateConsistent(segment.event.end)})`}
      >
        {renderResizeHandle('left')}
        <div
          className="flex-1 min-w-0"
          style={{
            cursor: isResizing ? 'ew-resize' : 'pointer'
          }}
        >
          {renderEventContent()}
        </div>
        {renderResizeHandle('right')}
      </div>
    );
  }
);

MultiDayEvent.displayName = 'MultiDayEvent';

export default MultiDayEvent;