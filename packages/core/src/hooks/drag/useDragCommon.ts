// Shared utility hook providing common utility functions for drag operations
import { useCallback, useMemo } from 'preact/hooks';
import { useDragProps, ViewType, UseDragCommonReturn } from '../../types';
import {
  daysDifference as utilsDaysDifference,
  addDays as utilsAddDays,
} from '../../utils';

export const useDragCommon = (options: useDragProps): UseDragCommonReturn => {
  const {
    calendarRef,
    allDayRowRef,
    viewType,
    HOUR_HEIGHT = 72,
    FIRST_HOUR = 0,
    LAST_HOUR = 24,
    TIME_COLUMN_WIDTH = 80,
    isMobile,
  } = options;

  // View type check
  const isMonthView = viewType === ViewType.MONTH;
  const isWeekView = viewType === ViewType.WEEK;

  // Week/Day view utility functions
  const pixelYToHour = useCallback(
    (y: number) => {
      if (isMonthView || !calendarRef.current) return FIRST_HOUR;
      const calendarContent =
        calendarRef.current.querySelector('.calendar-content');
      if (!calendarContent) return FIRST_HOUR;

      const contentRect = calendarContent.getBoundingClientRect();
      const scrollTop = calendarContent.scrollTop;
      // Measure the actual offset from .calendar-content top to the first time grid row,
      // accounting for any boundary elements (top boundary) above the grid
      const firstGridRow = calendarContent.querySelector('.df-time-grid-row');
      const gridOffset = firstGridRow
        ? firstGridRow.getBoundingClientRect().top - contentRect.top + scrollTop
        : 0;
      const relativeY = y - contentRect.top + scrollTop - gridOffset;
      const hour = relativeY / HOUR_HEIGHT + FIRST_HOUR;
      return Math.max(FIRST_HOUR, Math.min(LAST_HOUR, hour));
    },
    [calendarRef, FIRST_HOUR, HOUR_HEIGHT, LAST_HOUR, isMonthView]
  );

  const getColumnDayIndex = useCallback(
    (x: number) => {
      if (isMonthView || !calendarRef.current) return 0;

      const calendarContent =
        calendarRef.current.querySelector('.calendar-content');
      if (!calendarContent) return 0;

      const contentRect = calendarContent.getBoundingClientRect();
      const scrollLeft = calendarContent.scrollLeft;
      const containerWidth = contentRect.width;

      if (isWeekView) {
        // WeekView on mobile has 175% width
        const totalWidth = isMobile ? containerWidth * 1.75 : containerWidth;
        const dayColumnWidth = totalWidth / 7;

        // Determine relative X including scroll
        const relativeX = x - contentRect.left + scrollLeft;

        const columnIndex = Math.floor(relativeX / dayColumnWidth);
        return Math.max(0, Math.min(6, columnIndex));
      } else {
        // DayView
        return 0;
      }
    },
    [calendarRef, isMonthView, isWeekView, isMobile]
  );

  const handleDirectScroll = useCallback(
    (clientY: number) => {
      if (isMonthView || !calendarRef.current) return;
      const calendarContent =
        calendarRef.current.querySelector('.calendar-content');
      if (!calendarContent) return;

      const rect = calendarContent.getBoundingClientRect();
      if (clientY < rect.top) {
        calendarContent.scrollTop += clientY - rect.top;
      } else if (clientY + 40 > rect.bottom) {
        calendarContent.scrollTop += clientY + 40 - rect.bottom;
      }
    },
    [calendarRef, isMonthView]
  );

  const checkIfInAllDayArea = useCallback(
    (clientY: number): boolean => {
      if (isMonthView || !allDayRowRef?.current) return false;
      const allDayRect = allDayRowRef.current.getBoundingClientRect();
      // Considered in all-day area if within the row or above it (e.g. in header)
      return clientY <= allDayRect.bottom;
    },
    [allDayRowRef, isMonthView]
  );

  // Month view utility functions
  const ONE_DAY_MS = useMemo(() => 24 * 60 * 60 * 1000, []);

  // Use unified functions from utils
  const daysDifference = useCallback((date1: Date, date2: Date): number => {
    return utilsDaysDifference(date1, date2);
  }, []);

  const addDaysToDate = useCallback((date: Date, days: number): Date => {
    return utilsAddDays(date, days);
  }, []);

  const getTargetDateFromPosition = useCallback(
    (clientX: number, clientY: number): Date | null => {
      if (
        (viewType !== ViewType.MONTH && viewType !== ViewType.YEAR) ||
        !calendarRef.current
      )
        return null;

      const element = document.elementFromPoint(clientX, clientY);
      if (!element) return null;

      let dateElement: Element | null = element;
      let searchDepth = 0;
      while (
        dateElement &&
        !dateElement.hasAttribute('data-date') &&
        searchDepth < 10
      ) {
        dateElement = dateElement.parentElement;
        searchDepth++;
      }

      if (dateElement && dateElement.hasAttribute('data-date')) {
        const dateStr = dateElement.getAttribute('data-date');
        if (dateStr) {
          return new Date(dateStr + 'T00:00:00');
        }
      }

      return null;
    },
    [calendarRef, viewType]
  );

  return {
    pixelYToHour,
    getColumnDayIndex,
    checkIfInAllDayArea,
    handleDirectScroll,
    daysDifference,
    addDaysToDate,
    getTargetDateFromPosition,
    ONE_DAY_MS,
  };
};
