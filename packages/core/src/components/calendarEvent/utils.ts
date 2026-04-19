import { RefObject } from 'preact';

import { Event, ViewType } from '@/types';

export type EventSegmentShape = 'full' | 'start' | 'end' | 'middle';
/**
 * Gets the actual width of the time column from the DOM
 */
export const getTimeColumnWidth = (
  calendarRef: RefObject<HTMLElement>,
  isMobile: boolean
): number => {
  if (!calendarRef.current) return isMobile ? 48 : 80;
  const timeColumn = calendarRef.current.querySelector('.df-time-column');
  return timeColumn
    ? timeColumn.getBoundingClientRect().width
    : isMobile
      ? 48
      : 80;
};

export const getCalendarContentElement = (
  calendarRef: RefObject<HTMLElement>
): HTMLElement | null => {
  const element = calendarRef.current;
  if (!element) return null;

  const ownMatch = element.matches('.df-calendar-content') ? element : null;
  const descendantMatch = element.querySelector(
    '.df-calendar-content'
  ) as HTMLElement | null;
  const ancestorMatch = element.closest(
    '.df-calendar-content'
  ) as HTMLElement | null;

  return ownMatch ?? descendantMatch ?? ancestorMatch;
};

/**
 * Calculates the horizontal metrics (left and width) for a day column
 */
export const getDayMetrics = (
  dayIndex: number,
  calendarRef: RefObject<HTMLElement>,
  viewType: ViewType,
  isMobile: boolean
): { left: number; width: number } | null => {
  if (!calendarRef.current) return null;

  const calendarRect = calendarRef.current.getBoundingClientRect();

  if (viewType === ViewType.MONTH) {
    const dayColumnWidth = calendarRect.width / 7;
    return {
      left: calendarRect.left + dayIndex * dayColumnWidth,
      width: dayColumnWidth,
    };
  }

  const timeColumnWidth = getTimeColumnWidth(calendarRef, isMobile);
  if (viewType === ViewType.DAY) {
    const dayColumnWidth = calendarRect.width - timeColumnWidth;
    return {
      left: calendarRect.left + timeColumnWidth,
      width: dayColumnWidth,
    };
  }

  const dayColumnWidth = (calendarRect.width - timeColumnWidth) / 7;
  return {
    left: calendarRect.left + timeColumnWidth + dayIndex * dayColumnWidth,
    width: dayColumnWidth,
  };
};

/**
 * Gets the active day index for multi-day events
 */
export const getActiveDayIndex = (
  event: Event,
  detailPanelEventId: string | undefined,
  detailPanelKey: string,
  selectedDayIndex: number | null,
  multiDaySegmentInfo?: { dayIndex?: number },
  segment?: { startDayIndex: number }
): number => {
  if (selectedDayIndex !== null) {
    return selectedDayIndex;
  }

  if (detailPanelEventId === detailPanelKey) {
    const keyParts = detailPanelKey.split('::');
    const suffix = keyParts.at(-1);
    if (suffix && suffix.startsWith('day-')) {
      const parsed = Number(suffix.replace('day-', ''));
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  if (multiDaySegmentInfo?.dayIndex !== undefined) {
    return multiDaySegmentInfo.dayIndex;
  }
  if (segment) {
    return segment.startDayIndex;
  }
  return event.day ?? 0;
};

/**
 * Gets the clicked day index based on mouse position
 */
export const getClickedDayIndex = (
  clientX: number,
  calendarRef: RefObject<HTMLElement>,
  viewType: ViewType,
  isMobile: boolean
): number | null => {
  if (!calendarRef.current) return null;

  const calendarRect = calendarRef.current.getBoundingClientRect();
  if (viewType === ViewType.MONTH) {
    const dayColumnWidth = calendarRect.width / 7;
    const relativeX = clientX - calendarRect.left;
    const index = Math.floor(relativeX / dayColumnWidth);
    return Number.isFinite(index) ? Math.max(0, Math.min(6, index)) : null;
  }

  const timeColumnWidth = getTimeColumnWidth(calendarRef, isMobile);
  const columnCount = viewType === ViewType.DAY ? 1 : 7;
  const dayColumnWidth = (calendarRect.width - timeColumnWidth) / columnCount;
  const relativeX = clientX - calendarRect.left - timeColumnWidth;
  const index = Math.floor(relativeX / dayColumnWidth);
  return Number.isFinite(index)
    ? Math.max(0, Math.min(columnCount - 1, index))
    : null;
};

/**
 * Gets the CSS classes for the event container
 */
export const getEventClasses = (
  viewType: ViewType,
  isAllDay: boolean,
  isMultiDay: boolean
): string => {
  const classes = ['df-event'];

  if (viewType === ViewType.DAY) {
    classes.push('df-day-event');
  } else if (viewType === ViewType.WEEK) {
    classes.push('df-week-event');
  } else if (viewType === ViewType.MONTH) {
    classes.push('df-month-event');
    if (!isMultiDay) {
      classes.push('df-month-event-stacked');
    }
  } else if (viewType === ViewType.YEAR) {
    classes.push('df-year-event');
  }

  classes.push(isAllDay ? 'df-event-all-day' : 'df-event-timed');

  return classes.join(' ');
};

export const getAllDaySegmentShape = (segment?: {
  segmentType: string;
}): EventSegmentShape => {
  if (!segment) return 'full';

  switch (segment.segmentType) {
    case 'start':
    case 'start-week-end':
      return 'start';
    case 'end':
    case 'end-week-start':
      return 'end';
    case 'middle':
      return 'middle';
    default:
      return 'full';
  }
};

export const getYearSegmentShape = (yearSegment?: {
  isFirstSegment: boolean;
  isLastSegment: boolean;
}): EventSegmentShape => {
  if (!yearSegment) return 'full';
  if (yearSegment.isFirstSegment && yearSegment.isLastSegment) return 'full';
  if (yearSegment.isFirstSegment) return 'start';
  if (yearSegment.isLastSegment) return 'end';
  return 'middle';
};

export const getEventSegmentShape = (
  viewType: ViewType,
  isAllDay: boolean,
  segment?: { segmentType: string },
  yearSegment?: { isFirstSegment: boolean; isLastSegment: boolean }
): EventSegmentShape => {
  if (viewType === ViewType.YEAR) {
    return getYearSegmentShape(yearSegment);
  }

  if (isAllDay) {
    return getAllDaySegmentShape(segment);
  }

  return 'full';
};
