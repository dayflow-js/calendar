import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import ReactDOM from 'react-dom';
import {
  getSelectedBgColor,
  getEventBgColor,
  getEventTextColor,
  extractHourFromDate,
  getEventEndHour,
} from '@/utils';
import {
  Event,
  EventDetailPosition,
} from '@/types';
import MultiDayEvent from '../monthView/MultiDayEvent';
import DefaultEventDetailPanel from '../common/DefaultEventDetailPanel';
import EventDetailPanelWithContent from '../common/EventDetailPanelWithContent';
import {
  baseEvent,
  eventShadow,
  allDayRounded,
  regularEventRounded,
} from '@/styles/classNames';
import { CalendarEventProps } from './types';
import MonthRegularContent from './components/MonthRegularContent';
import MonthAllDayContent from './components/MonthAllDayContent';
import AllDayContent from './components/AllDayContent';
import RegularEventContent from './components/RegularEventContent';

const CalendarEvent: React.FC<CalendarEventProps> = ({
  event,
  layout,
  isAllDay = false,
  allDayHeight = 28,
  calendarRef,
  isBeingDragged = false,
  isBeingResized = false,
  isDayView = false,
  isMonthView = false,
  isMultiDay = false,
  segment,
  segmentIndex = 0,
  hourHeight,
  firstHour,
  selectedEventId,
  detailPanelEventId,
  onMoveStart,
  onResizeStart,
  onEventUpdate,
  onEventDelete,
  newlyCreatedEventId,
  onDetailPanelOpen,
  onEventSelect,
  onEventLongPress,
  onDetailPanelToggle,
  customDetailPanelContent,
  customEventDetailDialog,
  multiDaySegmentInfo,
  app,
  isMobile = false,
  enableTouch,
  hideTime,
}) => {
  const isTouchEnabled = enableTouch ?? isMobile;
  const [isSelected, setIsSelected] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const detailPanelKey =
    isMultiDay && segment
      ? `${event.id}::${segment.id}`
      : multiDaySegmentInfo?.dayIndex !== undefined
        ? `${event.id}::day-${multiDaySegmentInfo.dayIndex}`
        : event.id;
  const showDetailPanel = detailPanelEventId === detailPanelKey;
  const [detailPanelPosition, setDetailPanelPosition] =
    useState<EventDetailPosition | null>(null);
  const [eventVisibility, setEventVisibility] = useState<
    'visible' | 'sticky-top' | 'sticky-bottom'
  >('visible');

  const eventRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const selectedEventElementRef = useRef<HTMLDivElement | null>(null);
  const selectedDayIndexRef = useRef<number | null>(null);

  // Long press handling for mobile drag
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onMoveStart || !isTouchEnabled) return;
    e.stopPropagation();

    // Store initial position to detect movement
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const currentTarget = e.currentTarget;

    touchStartPosRef.current = { x: clientX, y: clientY };

    longPressTimerRef.current = setTimeout(() => {
      if (onEventLongPress) {
        onEventLongPress(event.id);
      } else {
        setIsSelected(true);
      }

      // Create a compatible event object
      const syntheticEvent = {
        preventDefault: () => { },
        stopPropagation: () => { },
        currentTarget: currentTarget,
        touches: [{ clientX, clientY }],
        cancelable: false,
      } as unknown as React.TouchEvent<HTMLDivElement>;

      if (multiDaySegmentInfo) {
        const adjustedEvent = {
          ...event,
          day: multiDaySegmentInfo.dayIndex ?? event.day,
          _segmentInfo: multiDaySegmentInfo
        };
        onMoveStart(syntheticEvent, adjustedEvent as Event);
      } else if (isMultiDay && segment) {
        const adjustedEvent = {
          ...event,
          day: segment.startDayIndex,
          _segmentInfo: {
            dayIndex: segment.startDayIndex,
            isFirst: segment.isFirstSegment,
            isLast: segment.isLastSegment
          }
        };
        onMoveStart(syntheticEvent, adjustedEvent as Event);
      } else {
        onMoveStart(syntheticEvent, event);
      }
      longPressTimerRef.current = null;
      touchStartPosRef.current = null; // Clear pos so touchend doesn't trigger tap

      // Provide haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current && touchStartPosRef.current) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      // Cancel if moved more than 10px
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        touchStartPosRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isTouchEnabled && touchStartPosRef.current) {
      e.preventDefault();
      e.stopPropagation();

      if (onEventSelect) {
        onEventSelect(event.id);
      } else if (canOpenDetail) {
        setIsSelected(true);
      }

      if (app) {
        app.onEventClick(event);
      }

      onDetailPanelToggle?.(null);
      setDetailPanelPosition(null);
    }

    touchStartPosRef.current = null;
  };

  const isEventSelected =
    selectedEventId !== undefined ? selectedEventId === event.id : isSelected;

  const readOnlyConfig = app?.getReadOnlyConfig();
  const isEditable = !app?.state.readOnly;
  const canOpenDetail = readOnlyConfig?.viewable !== false;
  const isDraggable = readOnlyConfig?.draggable !== false;

  const getDayMetrics = (
    dayIndex: number
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

  const setActiveDayIndex = (dayIndex: number | null) => {
    selectedDayIndexRef.current = dayIndex;
  };

  const getActiveDayIndex = () => {
    if (selectedDayIndexRef.current !== null) {
      return selectedDayIndexRef.current;
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

  const calculateEventStyle = () => {
    if (isMonthView) {
      return {
        opacity: isBeingDragged ? 0.3 : 1,
        zIndex: isEventSelected || showDetailPanel ? 1000 : 1,
        transform: isPopping ? 'scale(1.15)' : undefined,
        transition: 'transform 0.1s ease-in-out',
        cursor: isDraggable ? 'pointer' : (canOpenDetail ? 'pointer' : 'default'),
      };
    }

    if (isAllDay) {
      const styles: any = {
        height: `${allDayHeight - 4}px`,
        opacity: isBeingDragged ? 0.3 : 1,
        zIndex: isEventSelected || showDetailPanel ? 1000 : 1,
        transform: isPopping ? 'scale(1.12)' : undefined,
        transition: 'transform 0.1s ease-in-out',
        cursor: isDraggable ? 'pointer' : (canOpenDetail ? 'pointer' : 'default'),
      };

      // Calculate vertical offset (for multi-row all-day events)
      const topOffset = segmentIndex * allDayHeight;
      Object.assign(styles, { top: `${topOffset}px` });
      if (isDayView) {
        Object.assign(styles, { width: '100%', left: '0px', right: '2px', position: 'absolute' });
      } else if (isMultiDay && segment) {
        const spanDays = segment.endDayIndex - segment.startDayIndex + 1;
        const widthPercent = (spanDays / 7) * 100;
        const leftPercent = (segment.startDayIndex / 7) * 100;
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
          width: 'calc(100% - 3px)',
          left: '0px',
          position: 'relative',
        });
      }
      return styles;
    }

    // Use segment information or extract time from event
    const startHour = multiDaySegmentInfo
      ? multiDaySegmentInfo.startHour
      : extractHourFromDate(event.start);
    const endHour = multiDaySegmentInfo
      ? multiDaySegmentInfo.endHour
      : getEventEndHour(event);

    const top = (startHour - firstHour) * hourHeight;
    const height = Math.max(
      (endHour - startHour) * hourHeight,
      hourHeight / 4
    );

    const baseStyle = {
      top: `${top + 3}px`,
      height: `${height - 4}px`,
      position: 'absolute' as const,
      opacity: isBeingDragged ? 0.3 : 1,
      zIndex: isEventSelected || showDetailPanel ? 1000 : (layout?.zIndex ?? 1),
      transform: isPopping ? 'scale(1.12)' : undefined,
      transition: 'transform 0.1s ease-in-out',
      cursor: isDraggable ? 'pointer' : (canOpenDetail ? 'pointer' : 'default'),
    };

    if (isEventSelected && showDetailPanel) {
      if (
        eventVisibility === 'sticky-top' ||
        eventVisibility === 'sticky-bottom'
      ) {
        const calendarRect = calendarRef.current?.getBoundingClientRect();
        if (calendarRect) {
          const activeDayIndex = multiDaySegmentInfo?.dayIndex ?? getActiveDayIndex();
          const timeColumnWidth = isMobile ? 48 : 80;
          const columnCount = isDayView ? 1 : 7;
          let dayColumnWidth = (calendarRect.width - timeColumnWidth) / columnCount;
          let dayStartX = calendarRect.left + timeColumnWidth + activeDayIndex * dayColumnWidth;

          if (isMonthView) {
            dayColumnWidth = calendarRect.width / 7;
            dayStartX = calendarRect.left + activeDayIndex * dayColumnWidth;
          }

          const overrideMetrics = getDayMetrics(activeDayIndex);
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
          const eventRect = eventRef.current?.getBoundingClientRect();
          const eventLeft = eventRect?.left;
          const eventWidth = eventRect?.width;

          if (eventVisibility === 'sticky-top') {
            const contentTop = contentRect ? contentRect.top : calendarRect.top;
            let topPosition = contentTop;
            topPosition = Math.max(topPosition, 0);
            topPosition = Math.max(topPosition, calendarRect.top);
            topPosition = Math.min(topPosition, calendarRect.bottom - 6);
            topPosition = Math.min(topPosition, window.innerHeight - 6);

            return {
              position: 'fixed' as const,
              top: `${topPosition}px`,
              left: `${isDayView ? eventLeft : dayStartX}px`,
              width: `${isDayView ? eventWidth : dayColumnWidth - 3}px`,
              height: '6px',
              zIndex: 1000,
              overflow: 'hidden',
            };
          }

          const contentBottom = contentRect
            ? contentRect.bottom
            : calendarRect.bottom;
          let bottomPosition = contentBottom;
          bottomPosition = Math.min(bottomPosition, window.innerHeight);
          bottomPosition = Math.min(bottomPosition, calendarRect.bottom);
          bottomPosition = Math.max(bottomPosition, calendarRect.top + 6);
          bottomPosition = Math.max(bottomPosition, 6);

          return {
            position: 'fixed' as const,
            top: `${bottomPosition - 6}px`,
            left: `${isDayView ? eventLeft : dayStartX}px`,
            width: `${isDayView ? eventWidth : dayColumnWidth - 3}px`,
            height: '6px',
            zIndex: 1000,
            overflow: 'hidden',
          };
        }
      }
    }

    if (layout && !isAllDay) {
      const widthStyle = isDayView
        ? `calc(${layout.width}% - 3px)`
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
      right: '3px',
    };
  };

  const getClickedDayIndex = (clientX: number): number | null => {
    if (!calendarRef.current) return null;

    const calendarRect = calendarRef.current.getBoundingClientRect();
    if (isMonthView) {
      const dayColumnWidth = calendarRect.width / 7;
      const relativeX = clientX - calendarRect.left;
      const index = Math.floor(relativeX / dayColumnWidth);
      return Number.isFinite(index)
        ? Math.max(0, Math.min(6, index))
        : null;
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMultiDay) {
      if (segment) {
        const clickedDay = getClickedDayIndex(e.clientX);
        if (clickedDay !== null) {
          const clampedDay = Math.min(
            Math.max(clickedDay, segment.startDayIndex),
            segment.endDayIndex
          );
          setActiveDayIndex(clampedDay);
        } else {
          setActiveDayIndex(segment.startDayIndex);
        }
      } else if (multiDaySegmentInfo?.dayIndex !== undefined) {
        setActiveDayIndex(multiDaySegmentInfo.dayIndex);
      } else {
        setActiveDayIndex(event.day ?? null);
      }
    } else {
      setActiveDayIndex(event.day ?? null);
    }

    if (app) {
      app.onEventClick(event);
    }

    const handleSelect = () => {
      if (onEventSelect) {
        onEventSelect(event.id);
      } else if (canOpenDetail) {
        setIsSelected(true);
      }
      onDetailPanelToggle?.(null);
      setDetailPanelPosition(null);
    };

    handleSelect();
  };

  const scrollEventToCenter = (): Promise<void> => {
    return new Promise(resolve => {
      if (!calendarRef.current || isAllDay || isMonthView) {
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

      const isFullyVisible =
        eventTop >= scrollTop && eventBottom <= scrollBottom;

      if (isFullyVisible) {
        resolve();
        return;
      }

      const eventMiddleHour = (segmentStartHour + segmentEndHour) / 2;
      const eventMiddleY = (eventMiddleHour - firstHour) * hourHeight;

      const targetScrollTop = eventMiddleY - viewportHeight / 2;

      const maxScrollTop = calendarContent.scrollHeight - viewportHeight;

      const finalScrollTop = Math.max(
        0,
        Math.min(maxScrollTop, targetScrollTop)
      );

      calendarContent.scrollTo({
        top: finalScrollTop,
        behavior: 'smooth',
      });

      setTimeout(() => {
        resolve();
      }, 300);
    });
  };

  const updatePanelPosition = useCallback(() => {
    if (
      !selectedEventElementRef.current ||
      !calendarRef.current ||
      !detailPanelRef.current
    )
      return;

    const calendarRect = calendarRef.current.getBoundingClientRect();

    const positionDayIndex = getActiveDayIndex();

    const metricsForPosition = getDayMetrics(positionDayIndex);

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

      // In sticky state, mix virtual and actual positions
      // Use virtual position for vertical (to avoid jumping), actual position for horizontal (to avoid overlap)
      if (
        eventVisibility === 'sticky-top' ||
        eventVisibility === 'sticky-bottom'
      ) {
        const calendarContent =
          calendarRef.current?.querySelector('.calendar-content');
        if (!calendarContent) return;

        // Calculate the logical position of the event in the calendar
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

        // Calculate the virtual screen position of the event (if it's at the original position)
        const virtualTop = contentRect.top + eventLogicalTop - scrollTop;

        // Get the actual horizontal position of the event (from the actual eventRef)
        const actualEventRect = eventRef.current?.getBoundingClientRect();
        if (!actualEventRect) return;

        // Mix: use virtual position for vertical, actual position for horizontal
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
        // Non-sticky state, use actual position
        eventRect = selectedEventElementRef!.current!.getBoundingClientRect();
      }

      if (isMonthView && isMultiDay && segment) {
        const metrics = getDayMetrics(positionDayIndex);
        const dayColumnWidth = metrics?.width ?? calendarRect.width / 7;
        const selectedDayLeft = metrics?.left ??
          calendarRect.left + positionDayIndex * dayColumnWidth;
        const selectedDayRight = selectedDayLeft + dayColumnWidth;
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
        (eventVisibility === 'sticky-top' || eventVisibility === 'sticky-bottom') &&
        !isMonthView
      ) {
        const activeDayIndex = multiDaySegmentInfo?.dayIndex ?? getActiveDayIndex();
        const timeColumnWidth = isMobile ? 48 : 80;
        const columnCount = isDayView ? 1 : 7;
        const defaultColumnWidth = (calendarRect.width - timeColumnWidth) / columnCount;
        const metrics = getDayMetrics(activeDayIndex);
        const baseLeft = metrics ? metrics.left : calendarRect.left + timeColumnWidth + activeDayIndex * defaultColumnWidth;
        const baseWidth = metrics ? metrics.width : defaultColumnWidth;
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
        if (spaceOnRight > spaceOnLeft) {
          left = Math.max(
            calendarRect.left + 10,
            boundaryWidth - panelWidth - 10
          );
        } else {
          left = calendarRect.left + 10;
        }
      }

      const idealTop = eventRect.top - panelHeight / 2 + eventRect.height / 2;
      const topBoundary = Math.max(10, calendarRect.top + 10);
      const bottomBoundary = boundaryHeight - 10;

      if (idealTop < topBoundary) {
        top = topBoundary;
      } else if (idealTop + panelHeight > bottomBoundary) {
        top = bottomBoundary - panelHeight;
      } else {
        top = idealTop;
      }

      setDetailPanelPosition(prev => {
        if (!prev) return null;
        return {
          ...prev,
          top,
          left,
          isSunday: left < dayStartX,
        };
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
    segment?.startDayIndex,
    segment?.endDayIndex,
    multiDaySegmentInfo?.dayIndex,
    detailPanelEventId,
    detailPanelKey,
  ]);

  const handleDoubleClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (!canOpenDetail) return;
    e.preventDefault();
    e.stopPropagation();

    // For MultiDayEvent, find the actual event element
    let targetElement = e.currentTarget as HTMLDivElement;
    if (isMultiDay) {
      // Find the actual DOM element of MultiDayEvent (it's a direct child element)
      const multiDayElement = targetElement.querySelector(
        'div'
      ) as HTMLDivElement;
      if (multiDayElement) {
        targetElement = multiDayElement;
      }
    }

    selectedEventElementRef.current = targetElement;

    if (isMultiDay) {
      if (segment) {
        const clickedDay = getClickedDayIndex(e.clientX);
        if (clickedDay !== null) {
          const clampedDay = Math.min(
            Math.max(clickedDay, segment.startDayIndex),
            segment.endDayIndex
          );
          setActiveDayIndex(clampedDay);
        } else {
          setActiveDayIndex(segment.startDayIndex);
        }
      } else if (multiDaySegmentInfo?.dayIndex !== undefined) {
        setActiveDayIndex(multiDaySegmentInfo.dayIndex);
      } else {
        setActiveDayIndex(event.day ?? null);
      }
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
        requestAnimationFrame(() => {
          updatePanelPosition();
        });
      }
    });
  };

  const checkEventVisibility = useCallback(() => {
    if (
      !isEventSelected ||
      !showDetailPanel ||
      !eventRef.current ||
      !calendarRef.current ||
      isAllDay ||
      isMonthView
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
    isSelected,
    showDetailPanel,
    calendarRef,
    isAllDay,
    isMonthView,
    extractHourFromDate(event.start),
    getEventEndHour(event),
    firstHour,
    hourHeight,
    updatePanelPosition,
    multiDaySegmentInfo?.startHour,
    multiDaySegmentInfo?.endHour,
    multiDaySegmentInfo?.dayIndex,
    detailPanelEventId,
    detailPanelKey,
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
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;

      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowX === 'auto' ||
        overflowX === 'scroll'
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

    // Add ResizeObserver to monitor calendar container size changes (e.g. Search Drawer toggle)
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
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [
    isEventSelected,
    showDetailPanel,
    isAllDay,
    checkEventVisibility,
    updatePanelPosition,
    calendarRef,
    eventVisibility,
  ]);

  useEffect(() => {
    if (!isEventSelected && !showDetailPanel) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedInsideEvent = eventRef.current?.contains(target);
      const clickedOnSameEvent = target.closest(`[data-event-id="${event.id}"]`) !== null;
      const clickedInsidePanel = detailPanelRef.current?.contains(target);
      const clickedInsideDetailDialog = target.closest(
        '[data-event-detail-dialog]'
      );

      // Check if clicked inside RangePicker popup or ColorPicker dropdown
      const clickedInsideRangePickerPopup = target.closest('[data-range-picker-popup]');
      const clickedInsideColorPickerDropdown = target.closest('[data-color-picker-dropdown]');

      if (showDetailPanel) {
        if (
          !clickedInsideEvent &&
          !clickedOnSameEvent &&
          !clickedInsidePanel &&
          !clickedInsideDetailDialog &&
          !clickedInsideRangePickerPopup &&
          !clickedInsideColorPickerDropdown
        ) {
          if (onEventSelect) {
            onEventSelect(null);
          }
          setActiveDayIndex(null);
          setIsSelected(false);
          onDetailPanelToggle?.(null);
        }
      } else if (isEventSelected && !clickedInsideEvent && !clickedOnSameEvent && !clickedInsideColorPickerDropdown) {
        if (onEventSelect) {
          onEventSelect(null);
        }
        setActiveDayIndex(null);
        setIsSelected(false);
        onDetailPanelToggle?.(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEventSelected, showDetailPanel, onEventSelect, onDetailPanelToggle, event.id]);

  useEffect(() => {
    if (isMultiDay && segment && !segment.isFirstSegment) {
      return;
    }

    if (newlyCreatedEventId === event.id && !showDetailPanel) {
      setTimeout(() => {
        if (eventRef.current) {
          let targetElement = eventRef.current;
          if (isMultiDay) {
            const multiDayElement = eventRef.current.querySelector(
              'div'
            ) as HTMLDivElement;
            if (multiDayElement) {
              targetElement = multiDayElement;
            }
          }

          if (isMultiDay) {
            if (segment) {
              setActiveDayIndex(segment.startDayIndex);
            } else if (multiDaySegmentInfo?.dayIndex !== undefined) {
              setActiveDayIndex(multiDaySegmentInfo.dayIndex);
            } else {
              setActiveDayIndex(event.day ?? null);
            }
          } else {
            setActiveDayIndex(event.day ?? null);
          }

          selectedEventElementRef.current = targetElement;
          setIsSelected(true);
          onDetailPanelToggle?.(detailPanelKey);
          setDetailPanelPosition({
            top: -9999,
            left: -9999,
            eventHeight: 0,
            eventMiddleY: 0,
            isSunday: false,
          });
          requestAnimationFrame(() => {
            updatePanelPosition();
          });
        }
        onDetailPanelOpen?.();
      }, 150);
    }
  }, [
    newlyCreatedEventId,
    event.id,
    showDetailPanel,
    onDetailPanelOpen,
    updatePanelPosition,
    isMultiDay,
    segment,
    onDetailPanelToggle,
    detailPanelKey,
  ]);

  const lastPoppedHighlightId = useRef<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let isActive = true;

    const currentHighlightId = app?.state.highlightedEventId;
    const shouldPop = isEventSelected && currentHighlightId === event.id;

    if (shouldPop) {
      if (lastPoppedHighlightId.current !== currentHighlightId) {
        lastPoppedHighlightId.current = currentHighlightId;
        scrollEventToCenter().then(() => {
          if (!isActive) return;
          setIsPopping(true);
          timer = setTimeout(() => {
            if (isActive) setIsPopping(false);
          }, 150);
        });
      }
    } else {
      setIsPopping(false);
    }

    if (currentHighlightId !== event.id) {
      lastPoppedHighlightId.current = null;
    }

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
    };
  }, [isEventSelected, app?.state.highlightedEventId, event.id]);

  const renderDetailPanel = () => {
    if (!showDetailPanel) return null;

    const handleClose = () => {
      if (onEventSelect) {
        onEventSelect(null);
      }
      setActiveDayIndex(null);
      setIsSelected(false);
      onDetailPanelToggle?.(null);
    };

    if (customEventDetailDialog) {
      const DialogComponent = customEventDetailDialog;
      const dialogProps = {
        event,
        isOpen: showDetailPanel,
        isAllDay,
        onEventUpdate,
        onEventDelete,
        onClose: handleClose,
        app,
      };

      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return null;
      }

      const portalTarget = document.body;
      if (!portalTarget) return null;

      return ReactDOM.createPortal(
        <DialogComponent {...dialogProps} />,
        portalTarget
      );
    }

    if (!detailPanelPosition) return null;

    if (customDetailPanelContent) {
      return (
        <EventDetailPanelWithContent
          event={event}
          position={detailPanelPosition}
          panelRef={detailPanelRef}
          isAllDay={isAllDay}
          eventVisibility={eventVisibility}
          calendarRef={calendarRef}
          selectedEventElementRef={selectedEventElementRef}
          onEventUpdate={onEventUpdate}
          onEventDelete={onEventDelete}
          onClose={handleClose}
          contentRenderer={customDetailPanelContent}
        />
      );
    }

    return (
      <DefaultEventDetailPanel
        event={event}
        position={detailPanelPosition}
        panelRef={detailPanelRef}
        isAllDay={isAllDay}
        eventVisibility={eventVisibility}
        calendarRef={calendarRef}
        selectedEventElementRef={selectedEventElementRef}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        onClose={handleClose}
        app={app}
      />
    );
  };

  const renderMonthMultiDayContent = () => {
    if (!segment) return null;

    return (
      <MultiDayEvent
        segment={segment}
        segmentIndex={segmentIndex ?? 0}
        isDragging={isBeingDragged || isEventSelected}
        isResizing={isBeingResized}
        isSelected={isEventSelected}
        onMoveStart={onMoveStart || (() => { })}
        onResizeStart={onResizeStart}
        isMobile={isMobile}
        isDraggable={isDraggable}
        isEditable={isEditable}
        viewable={canOpenDetail}
      />
    );
  };

  const renderMonthAllDayContent = () => {
    if (isMultiDay) {
      return renderMonthMultiDayContent();
    }

    return <MonthAllDayContent event={event} isEventSelected={isEventSelected} />;
  };

  const renderMonthRegularContent = () => {
    return <MonthRegularContent event={event} app={app} isEventSelected={isEventSelected} hideTime={hideTime} />;
  };

  const renderAllDayContent = () => {
    return (
      <AllDayContent
        event={event}
        isEditable={!!isEditable}
        onResizeStart={onResizeStart}
      />
    );
  };

  const renderRegularEventContent = () => {
    return (
      <RegularEventContent
        event={event}
        app={app}
        multiDaySegmentInfo={multiDaySegmentInfo}
        isEditable={!!isEditable}
        isTouchEnabled={!!isTouchEnabled}
        isEventSelected={isEventSelected}
        onResizeStart={onResizeStart}
      />
    );
  };

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

  const getDefaultEventClass = () => {
    return regularEventRounded;
  };

  const getRenderClass = () => {
    if (isMonthView) {
      return `
        ${baseEvent}
        ${isAllDay ? getAllDayClass() : getDefaultEventClass()}
        `;
    }
    return `
          ${baseEvent}
          ${eventShadow}
          ${isAllDay ? getAllDayClass() : getDefaultEventClass()}
        `;
  };

  const renderEvent = () => {
    if (isMonthView) {
      if (isMultiDay && segment) {
        return renderMonthMultiDayContent();
      }
      return event.allDay
        ? renderMonthAllDayContent()
        : renderMonthRegularContent();
    } else {
      return event.allDay ? renderAllDayContent() : renderRegularEventContent();
    }
  };

  const calendarId = event.calendarId || 'blue';

  return (
    <>
      <div
        ref={eventRef}
        data-event-id={event.id}
        className={getRenderClass()}
        style={{
          ...calculateEventStyle(),
          ...(isEventSelected
            ? {
              backgroundColor: getSelectedBgColor(calendarId, app?.getCalendarRegistry()),
              color: '#fff',
            }
            : {
              backgroundColor: getEventBgColor(calendarId, app?.getCalendarRegistry()),
              color: getEventTextColor(calendarId, app?.getCalendarRegistry()),
            }),
        }}
        onClick={isTouchEnabled ? undefined : handleClick}
        onDoubleClick={isTouchEnabled ? undefined : handleDoubleClick}
        onMouseDown={onMoveStart ? (e) => {
          // If it's a multi-day event segment, special handling is needed
          if (multiDaySegmentInfo) {
            // Temporarily modify the event object to make it appear to start on the current segment's day
            const adjustedEvent = {
              ...event,
              day: multiDaySegmentInfo.dayIndex ?? event.day,
              // To calculate dragging, we need to store segment information
              _segmentInfo: multiDaySegmentInfo
            };
            onMoveStart(e, adjustedEvent as Event);
          } else if (isMultiDay && segment) {
            // Handle MultiDayEventSegment (e.g. WeekView all-day events)
            const adjustedEvent = {
              ...event,
              day: segment.startDayIndex,
              _segmentInfo: {
                dayIndex: segment.startDayIndex,
                isFirst: segment.isFirstSegment,
                isLast: segment.isLastSegment
              }
            };
            onMoveStart(e, adjustedEvent as Event);
          } else {
            onMoveStart(e, event);
          }
        } : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {renderEvent()}
      </div>

      {showDetailPanel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998,
            pointerEvents: 'none',
          }}
        />
      )}
      {renderDetailPanel()}
    </>
  );
};

export default CalendarEvent;
