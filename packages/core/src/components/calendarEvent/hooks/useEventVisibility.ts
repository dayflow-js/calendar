import { useState, useEffect, useCallback } from 'preact/hooks';
import { Event, ViewType } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils';

interface UseEventVisibilityProps {
  event: Event;
  isEventSelected: boolean;
  showDetailPanel: boolean;
  eventRef: { current: HTMLElement | null };
  calendarRef: { current: HTMLElement | null };
  isAllDay: boolean;
  viewType: ViewType;
  multiDaySegmentInfo?: any;
  firstHour: number;
  hourHeight: number;
  updatePanelPosition: () => void;
  setEventVisibility: (
    visibility: 'visible' | 'sticky-top' | 'sticky-bottom'
  ) => void;
}

export const useEventVisibility = ({
  event,
  isEventSelected,
  showDetailPanel,
  eventRef,
  calendarRef,
  isAllDay,
  viewType,
  multiDaySegmentInfo,
  firstHour,
  hourHeight,
  updatePanelPosition,
  setEventVisibility,
}: UseEventVisibilityProps) => {
  const isMonthView = viewType === ViewType.MONTH;
  const isYearView = viewType === ViewType.YEAR;

  const checkEventVisibility = useCallback(() => {
    if (
      !isEventSelected ||
      !showDetailPanel ||
      !eventRef.current ||
      !calendarRef.current ||
      isAllDay ||
      isMonthView ||
      isYearView
    )
      return;

    const calendarContent =
      calendarRef.current.querySelector('.calendar-content');
    if (!calendarContent) return;

    const segmentStartHour = multiDaySegmentInfo
      ? multiDaySegmentInfo.startHour
      : extractHourFromDate(event.start);
    const segmentEndHour = multiDaySegmentInfo
      ? multiDaySegmentInfo.endHour
      : getEventEndHour(event);

    const originalTop = (segmentStartHour - firstHour) * hourHeight;
    const originalHeight = Math.max(
      (segmentEndHour - segmentStartHour) * hourHeight,
      hourHeight / 4
    );
    const originalBottom = originalTop + originalHeight;

    const contentRect = calendarContent.getBoundingClientRect();
    const scrollTop = calendarContent.scrollTop;
    const viewportHeight = contentRect.height;
    const scrollBottom = scrollTop + viewportHeight;

    let isTopInvisible = originalBottom < scrollTop + 6;
    let isBottomInvisible = originalTop > scrollBottom - 6;

    const isContentAboveViewport = contentRect.bottom < 0;
    const isContentBelowViewport = contentRect.top > window.innerHeight;

    if (isContentAboveViewport) {
      isTopInvisible = true;
    } else if (isContentBelowViewport) {
      isBottomInvisible = true;
    }

    if (isTopInvisible) {
      setEventVisibility('sticky-top');
    } else if (isBottomInvisible) {
      setEventVisibility('sticky-bottom');
    } else {
      setEventVisibility('visible');
    }

    updatePanelPosition();
  }, [
    isEventSelected,
    showDetailPanel,
    calendarRef,
    isAllDay,
    isMonthView,
    event.start,
    event.end,
    firstHour,
    hourHeight,
    updatePanelPosition,
    multiDaySegmentInfo,
  ]);

  useEffect(() => {
    if (!isEventSelected || !showDetailPanel || isAllDay) return;

    const calendarContent =
      calendarRef.current?.querySelector('.calendar-content');
    if (!calendarContent) return;

    const handleScroll = () => checkEventVisibility();
    const handleResize = () => {
      checkEventVisibility();
      updatePanelPosition();
    };

    const scrollContainers: Element[] = [calendarContent];
    let parent = calendarRef.current?.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (
        style.overflowY === 'auto' ||
        style.overflowY === 'scroll' ||
        style.overflowX === 'auto' ||
        style.overflowX === 'scroll'
      ) {
        scrollContainers.push(parent);
      }
      parent = parent.parentElement;
    }

    scrollContainers.forEach(container => {
      container.addEventListener('scroll', handleScroll);
    });

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (calendarRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(calendarRef.current);
    }

    checkEventVisibility();

    return () => {
      scrollContainers.forEach(container => {
        container.removeEventListener('scroll', handleScroll);
      });
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [
    isEventSelected,
    showDetailPanel,
    isAllDay,
    checkEventVisibility,
    updatePanelPosition,
    calendarRef,
  ]);
};
