import { Event, EventDetailPosition } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils';
import {
  baseEvent,
  eventShadow,
  allDayRounded,
  regularEventRounded,
} from '@/styles/classNames';
import { CalendarEventProps } from './types';

/**
 * Calculates the horizontal metrics (left and width) for a day column
 */
export const getDayMetrics = (
  dayIndex: number,
  calendarRef: { current: HTMLElement | null },
  isMonthView: boolean,
  isDayView: boolean,
  isMobile: boolean
): { left: number; width: number } | null => {
  if (!calendarRef.current) return null;

  const calendarRect = calendarRef.current.getBoundingClientRect();

  if (isMonthView) {
    const dayColumnWidth = calendarRect.width / 7;
    return {
      left: calendarRect.left + dayIndex * dayColumnWidth,
      width: dayColumnWidth,
    };
  }

  const timeColumnWidth = isMobile ? 48 : 80;
  if (isDayView) {
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
    const suffix = keyParts[keyParts.length - 1];
    if (suffix.startsWith('day-')) {
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
  calendarRef: { current: HTMLElement | null },
  isMonthView: boolean,
  isDayView: boolean,
  isMobile: boolean
): number | null => {
  if (!calendarRef.current) return null;

  const calendarRect = calendarRef.current.getBoundingClientRect();
  if (isMonthView) {
    const dayColumnWidth = calendarRect.width / 7;
    const relativeX = clientX - calendarRect.left;
    const index = Math.floor(relativeX / dayColumnWidth);
    return Number.isFinite(index) ? Math.max(0, Math.min(6, index)) : null;
  }

  const timeColumnWidth = isMobile ? 48 : 80;
  const columnCount = isDayView ? 1 : 7;
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
  isMonthView: boolean,
  isDayView: boolean,
  isAllDay: boolean,
  isMultiDay: boolean,
  segment?: { segmentType: string }
): string => {
  let classes = baseEvent;
  if (isDayView) {
    classes += ' df-day-event flex flex-col';
  } else if (!isMonthView) {
    classes += ' df-week-event flex flex-col';
  }

  const getAllDayClass = () => {
    if (isMultiDay && segment) {
      const { segmentType } = segment;
      if (segmentType === 'single' || segmentType === 'start') {
        return allDayRounded;
      } else if (segmentType === 'start-week-end') {
        return 'rounded-l-xl rounded-r-none my-0.5';
      } else if (segmentType === 'end' || segmentType === 'end-week-start') {
        return 'rounded-r-xl rounded-l-none my-0.5';
      } else if (segmentType === 'middle') {
        return 'rounded-none my-0.5';
      }
    }
    return allDayRounded;
  };

  if (isMonthView) {
    let monthClasses = `
      ${classes}
      ${isAllDay ? getAllDayClass() : regularEventRounded}
      `;
    if (!isMultiDay) {
      monthClasses += ' mb-[2px]';
    }
    return monthClasses;
  }

  return `
    ${classes}
    ${eventShadow}
    ${isAllDay ? getAllDayClass() : regularEventRounded}
  `;
};
