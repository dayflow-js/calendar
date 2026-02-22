import { useState, useCallback, useEffect } from 'preact/hooks';
import { Event, ViewType, EventDetailPosition } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils';
import { MultiDayEventSegment } from '../../monthView/WeekComponent';
import { YearMultiDaySegment } from '../../yearView/utils';

interface UseDetailPanelPositionProps {
  event: Event;
  viewType: ViewType;
  isMultiDay: boolean;
  segment?: MultiDayEventSegment;
  yearSegment?: YearMultiDaySegment;
  multiDaySegmentInfo?: any;
  calendarRef: { current: HTMLElement | null };
  eventRef: { current: HTMLElement | null };
  detailPanelRef: { current: HTMLElement | null };
  selectedEventElementRef: { current: HTMLElement | null };
  isMobile: boolean;
  eventVisibility: 'visible' | 'sticky-top' | 'sticky-bottom';
  firstHour: number;
  hourHeight: number;
  columnsPerRow?: number;
  showDetailPanel: boolean;
  detailPanelEventId?: string | null;
  detailPanelKey: string;
  getActiveDayIdx: () => number;
  getDayMetricsWrapper: (dayIndex: number) => { left: number; width: number } | null;
}

export const useDetailPanelPosition = ({
  event,
  viewType,
  isMultiDay,
  segment,
  yearSegment,
  multiDaySegmentInfo,
  calendarRef,
  eventRef,
  detailPanelRef,
  selectedEventElementRef,
  isMobile,
  eventVisibility,
  firstHour,
  hourHeight,
  columnsPerRow,
  showDetailPanel,
  detailPanelEventId,
  detailPanelKey,
  getActiveDayIdx,
  getDayMetricsWrapper,
}: UseDetailPanelPositionProps) => {
  const [detailPanelPosition, setDetailPanelPosition] =
    useState<EventDetailPosition | null>(null);

  const isDayView = viewType === ViewType.DAY;
  const isMonthView = viewType === ViewType.MONTH;
  const isYearView = viewType === ViewType.YEAR;

  const updatePanelPosition = useCallback(() => {
    if (
      !selectedEventElementRef.current ||
      !calendarRef.current ||
      !detailPanelRef.current
    )
      return;

    const calendarRect = calendarRef.current.getBoundingClientRect();
    const positionDayIndex = getActiveDayIdx();
    const metricsForPosition = getDayMetricsWrapper(positionDayIndex);

    let dayStartX: number;
    let dayColumnWidth: number;

    if (metricsForPosition) {
      dayStartX = metricsForPosition.left;
      dayColumnWidth = metricsForPosition.width;
    } else if (isMonthView) {
      dayColumnWidth = calendarRect.width / 7;
      dayStartX = calendarRect.left + positionDayIndex * dayColumnWidth;
    } else {
      const timeColumnWidth = isMobile ? 48 : 80;
      dayColumnWidth = (calendarRect.width - timeColumnWidth) / 7;
      dayStartX =
        calendarRect.left + timeColumnWidth + positionDayIndex * dayColumnWidth;
    }

    const boundaryWidth = Math.min(window.innerWidth, calendarRect.right);
    const boundaryHeight = Math.min(window.innerHeight, calendarRect.bottom);

    requestAnimationFrame(() => {
      if (!detailPanelRef.current) return;
      const eventElement = selectedEventElementRef.current;
      if (!eventElement) return;

      const panelRect = detailPanelRef.current.getBoundingClientRect();
      const panelWidth = panelRect.width;
      const panelHeight = panelRect.height;

      let left: number, top: number;
      let eventRect: DOMRect;

      if (
        eventVisibility === 'sticky-top' ||
        eventVisibility === 'sticky-bottom'
      ) {
        const calendarContent =
          calendarRef.current?.querySelector('.calendar-content');
        if (!calendarContent) return;

        const segmentStartHour = multiDaySegmentInfo
          ? multiDaySegmentInfo.startHour
          : extractHourFromDate(event.start);
        const segmentEndHour = multiDaySegmentInfo
          ? multiDaySegmentInfo.endHour
          : getEventEndHour(event);
        const eventLogicalTop = (segmentStartHour - firstHour) * hourHeight;
        const eventLogicalHeight = Math.max(
          (segmentEndHour - segmentStartHour) * hourHeight,
          hourHeight / 4
        );

        const contentRect = calendarContent.getBoundingClientRect();
        const scrollTop = calendarContent.scrollTop;
        const virtualTop = contentRect.top + eventLogicalTop - scrollTop;

        const actualEventRect = eventRef.current?.getBoundingClientRect();
        if (!actualEventRect) return;

        eventRect = {
          top: virtualTop,
          bottom: virtualTop + eventLogicalHeight,
          left: actualEventRect.left,
          right: actualEventRect.right,
          width: actualEventRect.width,
          height: eventLogicalHeight,
          x: actualEventRect.x,
          y: virtualTop,
          toJSON: () => ({}),
        } as DOMRect;
      } else {
        eventRect = selectedEventElementRef!.current!.getBoundingClientRect();
      }

      if (isMonthView && isMultiDay && segment) {
        const metrics = getDayMetricsWrapper(positionDayIndex);
        const currentDayColumnWidth = metrics?.width ?? calendarRect.width / 7;
        const selectedDayLeft =
          metrics?.left ??
          calendarRect.left + positionDayIndex * currentDayColumnWidth;
        const selectedDayRight = selectedDayLeft + currentDayColumnWidth;
        eventRect = {
          top: eventRect.top,
          bottom: eventRect.bottom,
          left: selectedDayLeft,
          right: selectedDayRight,
          width: selectedDayRight - selectedDayLeft,
          height: eventRect.height,
          x: selectedDayLeft,
          y: eventRect.top,
          toJSON: () => ({}),
        } as DOMRect;
      }

      if (
        (eventVisibility === 'sticky-top' ||
          eventVisibility === 'sticky-bottom') &&
        !isMonthView
      ) {
        const activeDayIndex = getActiveDayIdx();
        const metrics = getDayMetricsWrapper(activeDayIndex);
        const timeColumnWidth = isMobile ? 48 : 80;
        const baseLeft = metrics
          ? metrics.left
          : calendarRect.left +
            timeColumnWidth +
            (activeDayIndex * (calendarRect.width - timeColumnWidth)) /
              (isDayView ? 1 : 7);
        const baseWidth = metrics
          ? metrics.width
          : (calendarRect.width - timeColumnWidth) / (isDayView ? 1 : 7);
        const segmentWidth = Math.max(
          0,
          isDayView ? eventRect.width : baseWidth - 3
        );
        const segmentLeft = isDayView ? eventRect.left : baseLeft;

        eventRect = {
          ...eventRect,
          left: segmentLeft,
          right: segmentLeft + segmentWidth,
          width: segmentWidth,
        } as DOMRect;
      }

      const spaceOnRight = boundaryWidth - eventRect.right;
      const spaceOnLeft = eventRect.left - calendarRect.left;

      if (spaceOnRight >= panelWidth + 20) {
        left = eventRect.right + 10;
      } else if (spaceOnLeft >= panelWidth + 20) {
        left = eventRect.left - panelWidth - 10;
      } else {
        left =
          spaceOnRight > spaceOnLeft
            ? Math.max(calendarRect.left + 10, boundaryWidth - panelWidth - 10)
            : calendarRect.left + 10;
      }

      const idealTop = eventRect.top - panelHeight / 2 + eventRect.height / 2;
      const topBoundary = Math.max(10, calendarRect.top + 10);
      const bottomBoundary = boundaryHeight - 10;
      top =
        idealTop < topBoundary
          ? topBoundary
          : idealTop + panelHeight > bottomBoundary
            ? bottomBoundary - panelHeight
            : idealTop;

      setDetailPanelPosition(prev => {
        if (!prev) return null;
        let isSunday = left < dayStartX;
        if (isYearView) {
          isSunday = left < eventRect.left;
        }
        return { ...prev, top, left, isSunday };
      });
    });
  }, [
    calendarRef,
    event.day,
    event.start,
    event.end,
    eventVisibility,
    isMonthView,
    firstHour,
    hourHeight,
    isMultiDay,
    segment,
    multiDaySegmentInfo,
    detailPanelEventId,
    detailPanelKey,
    isMobile,
    isDayView,
    isYearView,
    yearSegment,
    columnsPerRow,
    getActiveDayIdx,
    getDayMetricsWrapper,
    selectedEventElementRef,
    detailPanelRef,
    eventRef
  ]);

  useEffect(() => {
    if (showDetailPanel && !detailPanelPosition && !isMobile) {
      setDetailPanelPosition({
        top: -9999,
        left: -9999,
        eventHeight: 0,
        eventMiddleY: 0,
        isSunday: false,
      });
      requestAnimationFrame(() => updatePanelPosition());
    }
  }, [showDetailPanel, detailPanelPosition, updatePanelPosition, isMobile]);

  return {
    detailPanelPosition,
    setDetailPanelPosition,
    updatePanelPosition,
  };
};
