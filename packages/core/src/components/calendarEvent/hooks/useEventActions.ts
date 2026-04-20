import { RefObject } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { getCalendarContentElement } from '@/components/calendarEvent/utils';
import { MultiDayEventSegment } from '@/components/monthView/util';
import { Event, ViewType, ICalendarApp, EventDetailPosition } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils';
import { logger } from '@/utils/logger';

const SINGLE_CLICK_DELAY_MS = 180;

interface UseEventActionsProps {
  event: Event;
  timingEvent?: Event;
  viewType: ViewType;
  isAllDay: boolean;
  isMultiDay: boolean;
  segment?: MultiDayEventSegment;
  multiDaySegmentInfo?: {
    startHour: number;
    endHour: number;
    isFirst: boolean;
    isLast: boolean;
    dayIndex?: number;
  };
  calendarRef: RefObject<HTMLElement>;
  firstHour: number;
  hourHeight: number;
  isMobile: boolean;
  canOpenDetail: boolean;
  detailPanelKey: string;
  app?: ICalendarApp;
  onEventSelect?: (eventId: string | null) => void;
  onDetailPanelToggle?: (key: string | null) => void;
  setIsSelected: (selected: boolean) => void;
  setDetailPanelPosition: (pos: EventDetailPosition | null) => void;
  setContextMenuPosition: (pos: { x: number; y: number } | null) => void;
  setActiveDayIndex: (index: number | null) => void;
  getClickedDayIdx: (clientX: number) => number | null;
  updatePanelPosition: () => void;
  selectedEventElementRef: RefObject<HTMLElement | null>;
}

export const useEventActions = ({
  event,
  timingEvent,
  viewType,
  isAllDay,
  isMultiDay,
  segment,
  multiDaySegmentInfo,
  calendarRef,
  firstHour,
  hourHeight,
  isMobile,
  canOpenDetail,
  detailPanelKey,
  app,
  onEventSelect,
  onDetailPanelToggle,
  setIsSelected,
  setDetailPanelPosition,
  setContextMenuPosition,
  setActiveDayIndex,
  getClickedDayIdx,
  updatePanelPosition,
  selectedEventElementRef,
}: UseEventActionsProps) => {
  const isMonthView = viewType === ViewType.MONTH;
  const isYearView = viewType === ViewType.YEAR;
  const isResourceView = viewType === ViewType.RESOURCE;
  const eventForTiming = timingEvent ?? event;
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasPendingSelection, setHasPendingSelection] = useState(false);

  const clearPendingClick = useCallback(() => {
    if (!clickTimeoutRef.current) return;
    clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = null;
    setHasPendingSelection(false);
  }, []);

  useEffect(() => () => clearPendingClick(), [clearPendingClick]);

  const waitForScrollSettled = useCallback(
    (
      scrollContainer: HTMLElement,
      initialScrollLeft: number,
      initialScrollTop: number
    ): Promise<void> =>
      new Promise(resolve => {
        const sampleIntervalMs = 40;
        const quietWindowMs = 120;
        const timeoutMs = 600;
        let quietForMs = 0;
        let elapsedMs = 0;
        let lastScrollLeft = initialScrollLeft;
        let lastScrollTop = initialScrollTop;

        const checkScrollState = () => {
          const nextScrollLeft = scrollContainer.scrollLeft;
          const nextScrollTop = scrollContainer.scrollTop;
          const didMove =
            Math.abs(nextScrollLeft - lastScrollLeft) > 1 ||
            Math.abs(nextScrollTop - lastScrollTop) > 1;

          quietForMs = didMove ? 0 : quietForMs + sampleIntervalMs;
          elapsedMs += sampleIntervalMs;
          lastScrollLeft = nextScrollLeft;
          lastScrollTop = nextScrollTop;

          if (quietForMs >= quietWindowMs || elapsedMs >= timeoutMs) {
            resolve();
            return;
          }

          setTimeout(checkScrollState, sampleIntervalMs);
        };

        setTimeout(checkScrollState, sampleIntervalMs);
      }),
    []
  );

  const scrollEventToCenter = useCallback(
    (): Promise<void> =>
      new Promise(resolve => {
        if (
          !calendarRef.current ||
          isAllDay ||
          isMonthView ||
          isYearView ||
          hourHeight <= 0
        ) {
          resolve();
          return;
        }
        const calendarContent = getCalendarContentElement(calendarRef);
        if (!calendarContent) {
          resolve();
          return;
        }

        if (isResourceView && selectedEventElementRef.current) {
          const eventRect =
            selectedEventElementRef.current.getBoundingClientRect();
          const contentRect = calendarContent.getBoundingClientRect();
          const isFullyVisibleInViewport =
            eventRect.left >= contentRect.left &&
            eventRect.right <= contentRect.right &&
            eventRect.top >= contentRect.top &&
            eventRect.bottom <= contentRect.bottom;

          if (isFullyVisibleInViewport) {
            resolve();
            return;
          }

          const initialScrollLeft = calendarContent.scrollLeft;
          const initialScrollTop = calendarContent.scrollTop;
          const targetScrollLeft =
            initialScrollLeft +
            (eventRect.left - contentRect.left) -
            (calendarContent.clientWidth - eventRect.width) / 2;
          const targetScrollTop =
            initialScrollTop +
            (eventRect.top - contentRect.top) -
            (calendarContent.clientHeight - eventRect.height) / 2;
          const maxScrollLeft = Math.max(
            0,
            calendarContent.scrollWidth - calendarContent.clientWidth
          );
          const maxScrollTop = Math.max(
            0,
            calendarContent.scrollHeight - calendarContent.clientHeight
          );
          const nextScrollLeft = Math.max(
            0,
            Math.min(maxScrollLeft, targetScrollLeft)
          );
          const nextScrollTop = Math.max(
            0,
            Math.min(maxScrollTop, targetScrollTop)
          );
          const needsScroll =
            Math.abs(nextScrollLeft - initialScrollLeft) > 1 ||
            Math.abs(nextScrollTop - initialScrollTop) > 1;

          if (!needsScroll) {
            resolve();
            return;
          }

          calendarContent.scrollTo({
            left: nextScrollLeft,
            top: nextScrollTop,
            behavior: 'smooth',
          });

          waitForScrollSettled(
            calendarContent,
            initialScrollLeft,
            initialScrollTop
          ).then(resolve);
          return;
        }

        const segmentStartHour = multiDaySegmentInfo
          ? multiDaySegmentInfo.startHour
          : extractHourFromDate(eventForTiming.start);
        const segmentEndHour = multiDaySegmentInfo
          ? multiDaySegmentInfo.endHour
          : getEventEndHour(eventForTiming);

        const eventTop = (segmentStartHour - firstHour) * hourHeight;
        const eventHeight = Math.max(
          (segmentEndHour - segmentStartHour) * hourHeight,
          hourHeight / 4
        );
        const eventBottom = eventTop + eventHeight;

        const scrollTop = calendarContent.scrollTop;
        const viewportHeight = calendarContent.clientHeight;
        const scrollBottom = scrollTop + viewportHeight;

        if (eventTop >= scrollTop && eventBottom <= scrollBottom) {
          resolve();
          return;
        }

        const eventMiddleHour = (segmentStartHour + segmentEndHour) / 2;
        const targetScrollTop =
          (eventMiddleHour - firstHour) * hourHeight - viewportHeight / 2;
        const maxScrollTop = calendarContent.scrollHeight - viewportHeight;
        const nextScrollTop = Math.max(
          0,
          Math.min(maxScrollTop, targetScrollTop)
        );

        if (Math.abs(nextScrollTop - scrollTop) <= 1) {
          resolve();
          return;
        }

        calendarContent.scrollTo({
          top: nextScrollTop,
          behavior: 'smooth',
        });

        waitForScrollSettled(
          calendarContent,
          calendarContent.scrollLeft,
          scrollTop
        ).then(resolve);
      }),
    [
      calendarRef,
      isAllDay,
      isMonthView,
      isYearView,
      isResourceView,
      multiDaySegmentInfo,
      eventForTiming.start,
      eventForTiming.end,
      firstHour,
      hourHeight,
      selectedEventElementRef,
      waitForScrollSettled,
    ]
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      clearPendingClick();
      e.preventDefault();
      e.stopPropagation();
      if (app && !app.canMutateFromUI(event.id)) return;
      if (onEventSelect) onEventSelect(event.id);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
    },
    [app, clearPendingClick, event.id, onEventSelect, setContextMenuPosition]
  );

  const applySingleClickSelection = useCallback(
    (clientX: number) => {
      if (isMultiDay) {
        const clickedDay = getClickedDayIdx(clientX);
        setActiveDayIndex(
          clickedDay === null
            ? (multiDaySegmentInfo?.dayIndex ?? event.day ?? null)
            : segment
              ? Math.min(
                  Math.max(clickedDay, segment.startDayIndex),
                  segment.endDayIndex
                )
              : clickedDay
        );
      } else {
        setActiveDayIndex(event.day ?? null);
      }

      if (onEventSelect) {
        onEventSelect(event.id);
      } else if (canOpenDetail) {
        setIsSelected(true);
      }
      onDetailPanelToggle?.(null);
      setDetailPanelPosition(null);
    },
    [
      isMultiDay,
      getClickedDayIdx,
      setActiveDayIndex,
      multiDaySegmentInfo?.dayIndex,
      event,
      segment,
      onEventSelect,
      canOpenDetail,
      setIsSelected,
      onDetailPanelToggle,
      setDetailPanelPosition,
    ]
  );

  const emitSingleClick = useCallback(() => {
    app?.onEventClick(event);
  }, [app, event]);

  const performSingleClick = useCallback(
    (clientX: number) => {
      applySingleClickSelection(clientX);
      emitSingleClick();
    },
    [applySingleClickSelection, emitSingleClick]
  );

  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      clearPendingClick();
      e.preventDefault();
      e.stopPropagation();
      if (!canOpenDetail) return;

      let targetElement = e.currentTarget as HTMLDivElement;
      if (isMultiDay) {
        const multiDayElement = targetElement.querySelector(
          'div'
        ) as HTMLDivElement;
        if (multiDayElement) targetElement = multiDayElement;
      }

      selectedEventElementRef.current = targetElement;

      if (isMultiDay) {
        const clickedDay = getClickedDayIdx(e.clientX);
        setActiveDayIndex(
          clickedDay === null
            ? (segment?.startDayIndex ?? event.day ?? 0)
            : Math.min(
                Math.max(clickedDay, segment?.startDayIndex ?? 0),
                segment?.endDayIndex ?? 6
              )
        );
      } else {
        setActiveDayIndex(event.day ?? null);
      }

      setIsSelected(true);
      onEventSelect?.(event.id);

      const openDetailPanel = () => {
        scrollEventToCenter().then(() => {
          if (!isMobile) {
            onDetailPanelToggle?.(detailPanelKey);
            setDetailPanelPosition({
              top: -9999,
              left: -9999,
              eventHeight: 0,
              eventMiddleY: 0,
              isSunday: false,
            });
            requestAnimationFrame(() => updatePanelPosition());
          }
        });
      };

      if (!app) {
        openDetailPanel();
        return;
      }

      Promise.resolve(app.onEventDoubleClick?.(event, e))
        .then(result => {
          if (result === false) return;
          openDetailPanel();
        })
        .catch(error => {
          logger.error('Failed to handle event double click callback', error);
          openDetailPanel();
        });
    },
    [
      clearPendingClick,
      canOpenDetail,
      isMultiDay,
      selectedEventElementRef,
      getClickedDayIdx,
      setActiveDayIndex,
      segment?.startDayIndex,
      segment?.endDayIndex,
      event.day,
      app,
      event,
      scrollEventToCenter,
      setIsSelected,
      isYearView,
      isMobile,
      onEventSelect,
      onDetailPanelToggle,
      detailPanelKey,
      setDetailPanelPosition,
      updatePanelPosition,
    ]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const clientX = e.clientX;
      if (!isMobile && canOpenDetail) {
        clearPendingClick();
        if (!isYearView && !isResourceView) {
          applySingleClickSelection(clientX);
        }
        setHasPendingSelection(true);
        clickTimeoutRef.current = setTimeout(() => {
          if (isYearView || isResourceView) {
            applySingleClickSelection(clientX);
          }
          emitSingleClick();
          clickTimeoutRef.current = null;
          setHasPendingSelection(false);
        }, SINGLE_CLICK_DELAY_MS);
        return;
      }

      performSingleClick(clientX);
    },
    [
      clearPendingClick,
      canOpenDetail,
      applySingleClickSelection,
      emitSingleClick,
      isYearView,
      isResourceView,
      isMobile,
      performSingleClick,
    ]
  );

  return {
    handleClick,
    handleDoubleClick,
    handleContextMenu,
    hasPendingSelection,
    scrollEventToCenter,
  };
};
