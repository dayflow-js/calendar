import { RefObject } from 'preact';
import { useCallback } from 'preact/hooks';

import { MultiDayEventSegment } from '@/components/monthView/WeekComponent';
import { Event, ViewType, ICalendarApp, EventDetailPosition } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils';

interface UseEventActionsProps {
  event: Event;
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

  const scrollEventToCenter = useCallback(
    (): Promise<void> =>
      new Promise(resolve => {
        if (!calendarRef.current || isAllDay || isMonthView || isYearView) {
          resolve();
          return;
        }
        const calendarContent =
          calendarRef.current.querySelector('.calendar-content');
        if (!calendarContent) {
          resolve();
          return;
        }

        const segmentStartHour = multiDaySegmentInfo
          ? multiDaySegmentInfo.startHour
          : extractHourFromDate(event.start);
        const segmentEndHour = multiDaySegmentInfo
          ? multiDaySegmentInfo.endHour
          : getEventEndHour(event);

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

        calendarContent.scrollTo({
          top: Math.max(0, Math.min(maxScrollTop, targetScrollTop)),
          behavior: 'smooth',
        });

        setTimeout(() => resolve(), 300);
      }),
    [
      calendarRef,
      isAllDay,
      isMonthView,
      isYearView,
      multiDaySegmentInfo,
      event.start,
      event.end,
      firstHour,
      hourHeight,
    ]
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onEventSelect) onEventSelect(event.id);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
    },
    [event.id, onEventSelect, setContextMenuPosition]
  );

  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!canOpenDetail) return;
      e.preventDefault();
      e.stopPropagation();

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

      scrollEventToCenter().then(() => {
        setIsSelected(true);
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
    },
    [
      canOpenDetail,
      isMultiDay,
      selectedEventElementRef,
      getClickedDayIdx,
      setActiveDayIndex,
      segment?.startDayIndex,
      segment?.endDayIndex,
      event.day,
      scrollEventToCenter,
      setIsSelected,
      isMobile,
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
      if (isMultiDay) {
        const clickedDay = getClickedDayIdx(e.clientX);
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

      if (app) app.onEventClick(event);

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
      segment,
      multiDaySegmentInfo?.dayIndex,
      event,
      app,
      onEventSelect,
      canOpenDetail,
      setIsSelected,
      onDetailPanelToggle,
      setDetailPanelPosition,
    ]
  );

  return {
    handleClick,
    handleDoubleClick,
    handleContextMenu,
    scrollEventToCenter,
  };
};
