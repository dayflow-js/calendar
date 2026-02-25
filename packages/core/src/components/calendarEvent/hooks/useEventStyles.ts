import { RefObject } from 'preact';

import { getTimeColumnWidth } from '@/components/calendarEvent/utils';
import { MultiDayEventSegment } from '@/components/monthView/WeekComponent';
import { YearMultiDaySegment } from '@/components/yearView/utils';
import { ViewType, Event, EventLayout } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils';

interface UseEventStylesProps {
  event: Event;
  layout?: EventLayout;
  isAllDay: boolean;
  allDayHeight: number;
  viewType: ViewType;
  isMultiDay: boolean;
  segment?: MultiDayEventSegment;
  yearSegment?: YearMultiDaySegment;
  columnsPerRow?: number;
  segmentIndex: number;
  hourHeight: number;
  firstHour: number;
  isEventSelected: boolean;
  showDetailPanel: boolean;
  isPopping: boolean;
  isDraggable: boolean;
  canOpenDetail: boolean;
  eventVisibility: 'visible' | 'sticky-top' | 'sticky-bottom';
  calendarRef: RefObject<HTMLElement>;
  isMobile: boolean;
  eventRef: RefObject<HTMLElement>;
  getActiveDayIdx: () => number;
  getDayMetricsWrapper: (
    dayIndex: number
  ) => { left: number; width: number } | null;
  multiDaySegmentInfo?: {
    startHour: number;
    endHour: number;
    isFirst: boolean;
    isLast: boolean;
    dayIndex?: number;
  };
}

export const useEventStyles = ({
  event,
  layout,
  isAllDay,
  allDayHeight,
  viewType,
  isMultiDay,
  segment,
  yearSegment,
  columnsPerRow,
  segmentIndex,
  hourHeight,
  firstHour,
  isEventSelected,
  showDetailPanel,
  isPopping,
  isDraggable,
  canOpenDetail,
  eventVisibility,
  calendarRef,
  isMobile,
  eventRef,
  getActiveDayIdx,
  getDayMetricsWrapper,
  multiDaySegmentInfo,
}: UseEventStylesProps) => {
  const isDayView = viewType === ViewType.DAY;
  const isMonthView = viewType === ViewType.MONTH;
  const isYearView = viewType === ViewType.YEAR;

  const calculateEventStyle = () => {
    if (isYearView && yearSegment && columnsPerRow) {
      const { startCellIndex, endCellIndex, visualRowIndex } = yearSegment;
      const startPercent = (startCellIndex / columnsPerRow) * 100;
      const widthPercent =
        ((endCellIndex - startCellIndex + 1) / columnsPerRow) * 100;
      const TOP_OFFSET = visualRowIndex * 18; // ROW_SPACING
      const HORIZONTAL_MARGIN = 2;
      const EVENT_HEIGHT = 16;

      return {
        position: 'absolute' as const,
        left: `calc(${startPercent}% + ${HORIZONTAL_MARGIN}px)`,
        top: `${TOP_OFFSET}px`,
        width: `calc(${widthPercent}% - ${HORIZONTAL_MARGIN * 2}px)`,
        height: `${EVENT_HEIGHT}px`,
        opacity: 1,
        zIndex: isEventSelected || showDetailPanel ? 1000 : 1,
        transform: isPopping ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: isDraggable ? 'pointer' : canOpenDetail ? 'pointer' : 'default',
      };
    }

    if (isMonthView) {
      if (isMultiDay && segment) {
        return {
          opacity: 1,
          zIndex: isEventSelected || showDetailPanel ? 1000 : 1,
          cursor: isDraggable
            ? 'pointer'
            : canOpenDetail
              ? 'pointer'
              : 'default',
        };
      }
      return {
        opacity: 1,
        zIndex: isEventSelected || showDetailPanel ? 1000 : 1,
        transform: isPopping ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: isDraggable ? 'pointer' : canOpenDetail ? 'pointer' : 'default',
      };
    }

    if (isAllDay) {
      const styles: Record<string, unknown> = {
        height: `${allDayHeight - 4}px`,
        opacity: 1,
        zIndex: isEventSelected || showDetailPanel ? 1000 : 1,
        transform: isPopping ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: isDraggable ? 'pointer' : canOpenDetail ? 'pointer' : 'default',
      };

      const topOffset = segmentIndex * allDayHeight;
      Object.assign(styles, { top: `${topOffset}px` });
      if (isDayView) {
        Object.assign(styles, {
          width: '100%',
          left: '0px',
          right: '2px',
          position: 'absolute',
        });
      } else if (isMultiDay && segment) {
        const cols = columnsPerRow || 7;
        const spanDays = segment.endDayIndex - segment.startDayIndex + 1;
        const widthPercent = (spanDays / cols) * 100;
        const leftPercent = (segment.startDayIndex / cols) * 100;
        const HORIZONTAL_MARGIN = 2;
        const marginLeft = segment.isFirstSegment ? HORIZONTAL_MARGIN : 0;
        const marginRight = segment.isLastSegment ? HORIZONTAL_MARGIN : 0;
        const totalMargin = marginLeft + marginRight;

        Object.assign(styles, {
          width:
            totalMargin > 0
              ? `calc(${widthPercent}% - ${totalMargin}px)`
              : `${widthPercent}%`,
          left:
            marginLeft > 0
              ? `calc(${leftPercent}% + ${marginLeft}px)`
              : `${leftPercent}%`,
          position: 'absolute',
          pointerEvents: 'auto',
        });
      } else {
        Object.assign(styles, {
          width: '100%',
          left: '0px',
          position: 'relative',
        });
      }
      return styles;
    }

    const startHour = multiDaySegmentInfo
      ? multiDaySegmentInfo.startHour
      : extractHourFromDate(event.start);
    const endHour = multiDaySegmentInfo
      ? multiDaySegmentInfo.endHour
      : getEventEndHour(event);

    const top = (startHour - firstHour) * hourHeight;
    const height = Math.max((endHour - startHour) * hourHeight, hourHeight / 4);

    const baseStyle = {
      top: `${top + 3}px`,
      height: `${height - 4}px`,
      position: 'absolute' as const,
      opacity: 1,
      zIndex: isEventSelected || showDetailPanel ? 1000 : (layout?.zIndex ?? 1),
      transform: isPopping ? 'scale(1.05)' : 'scale(1)',
      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      cursor: isDraggable ? 'pointer' : canOpenDetail ? 'pointer' : 'default',
    };

    if (
      isEventSelected &&
      showDetailPanel &&
      (eventVisibility === 'sticky-top' || eventVisibility === 'sticky-bottom')
    ) {
      const calendarRect = calendarRef.current?.getBoundingClientRect();
      if (calendarRect) {
        const activeDayIndex = getActiveDayIdx();
        const timeColumnWidth = getTimeColumnWidth(calendarRef, isMobile);
        const columnCount = isDayView ? 1 : columnsPerRow || 7;
        let dayColumnWidth =
          (calendarRect.width - timeColumnWidth) / columnCount;
        let dayStartX =
          calendarRect.left +
          timeColumnWidth +
          (isDayView ? 0 : activeDayIndex * dayColumnWidth);

        if (isMonthView) {
          dayColumnWidth = calendarRect.width / 7;
          dayStartX = calendarRect.left + activeDayIndex * dayColumnWidth;
        }

        const overrideMetrics = getDayMetricsWrapper(activeDayIndex);
        if (overrideMetrics) {
          dayStartX = overrideMetrics.left;
          dayColumnWidth = overrideMetrics.width;
        }

        let scrollContainer =
          calendarRef.current?.querySelector('.calendar-content');
        if (!scrollContainer) {
          scrollContainer =
            calendarRef.current?.querySelector('.calendar-renderer');
        }
        const contentRect = scrollContainer?.getBoundingClientRect();
        const parentRect =
          eventRef.current?.parentElement?.getBoundingClientRect();
        let stickyLeft: number;
        let stickyWidth: number;

        if (parentRect && parentRect.width > 0) {
          if (layout) {
            stickyLeft =
              parentRect.left + (layout.left / 100) * parentRect.width;
            stickyWidth = isDayView
              ? (layout.width / 100) * parentRect.width
              : ((layout.width - 1) / 100) * parentRect.width;
          } else {
            stickyLeft = parentRect.left;
            stickyWidth = isDayView ? parentRect.width : parentRect.width - 3;
          }
        } else {
          const metrics = getDayMetricsWrapper(activeDayIndex);
          const currentDayStartX = metrics?.left ?? dayStartX;
          const currentDayColumnWidth = metrics?.width ?? dayColumnWidth;

          stickyLeft = currentDayStartX;
          stickyWidth = currentDayColumnWidth - 3;

          if (layout) {
            stickyLeft =
              currentDayStartX + (layout.left / 100) * currentDayColumnWidth;
            stickyWidth = isDayView
              ? (layout.width / 100) * currentDayColumnWidth
              : ((layout.width - 1) / 100) * currentDayColumnWidth;
          }
        }

        if (eventVisibility === 'sticky-top') {
          let topPosition = contentRect ? contentRect.top : calendarRect.top;
          topPosition = Math.max(topPosition, 0);
          topPosition = Math.max(topPosition, calendarRect.top);
          topPosition = Math.min(topPosition, calendarRect.bottom - 6);
          topPosition = Math.min(topPosition, window.innerHeight - 6);

          return {
            position: 'fixed' as const,
            top: `${topPosition}px`,
            left: `${stickyLeft}px`,
            width: `${stickyWidth}px`,
            height: '6px',
            zIndex: 1000,
            overflow: 'hidden',
          };
        }

        let bottomPosition = contentRect
          ? contentRect.bottom
          : calendarRect.bottom;
        bottomPosition = Math.min(bottomPosition, window.innerHeight);
        bottomPosition = Math.min(bottomPosition, calendarRect.bottom);
        bottomPosition = Math.max(bottomPosition, calendarRect.top + 6);
        bottomPosition = Math.max(bottomPosition, 6);

        return {
          position: 'fixed' as const,
          top: `${bottomPosition - 6}px`,
          left: `${stickyLeft}px`,
          width: `${stickyWidth}px`,
          height: '6px',
          zIndex: 1000,
          overflow: 'hidden',
        };
      }
    }

    if (layout && !isAllDay) {
      const widthStyle = isDayView
        ? `${layout.width}%`
        : `${layout.width - 1}%`;

      return {
        ...baseStyle,
        left: `${layout.left}%`,
        width: widthStyle,
        right: 'auto',
      };
    }

    return {
      ...baseStyle,
      left: '0px',
      right: isDayView ? '0px' : '3px',
    };
  };

  return { calculateEventStyle };
};
