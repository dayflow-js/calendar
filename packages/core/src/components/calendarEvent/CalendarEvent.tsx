import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from 'preact/hooks';
import {
  getSelectedBgColor,
  getEventBgColor,
  getEventTextColor,
  extractHourFromDate,
  getEventEndHour,
} from '@/utils';
import { Event, EventDetailPosition } from '@/types';
import MultiDayEvent from '../monthView/MultiDayEvent';
import DefaultEventDetailPanel from '../common/DefaultEventDetailPanel';
import { EventDetailPanelWithContent } from '../common/EventDetailPanelWithContent';
import { CalendarEventProps } from './types';
import MonthRegularContent from './components/MonthRegularContent';
import MonthAllDayContent from './components/MonthAllDayContent';
import AllDayContent from './components/AllDayContent';
import RegularEventContent from './components/RegularEventContent';
import { EventContextMenu } from '@/components/contextMenu';
import { ContentSlot } from '../../renderer/ContentSlot';
import { CustomRenderingContext } from '../../renderer/CustomRenderingContext';

// Import extracted utils and hooks
import {
  getDayMetrics,
  getActiveDayIndex,
  getClickedDayIndex,
  getEventClasses,
} from './utils';
import { useEventInteraction } from './hooks/useEventInteraction';
import { useEventVisibility } from './hooks/useEventVisibility';
import { useClickOutside } from './hooks/useClickOutside';

const CalendarEvent = ({
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
}: CalendarEventProps) => {
  const customRenderingStore = useContext(CustomRenderingContext);
  const isTouchEnabled = enableTouch ?? isMobile;
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isPopping, setIsPopping] = useState(false);
  const [detailPanelPosition, setDetailPanelPosition] =
    useState<EventDetailPosition | null>(null);

  const eventRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const selectedEventElementRef = useRef<HTMLDivElement | null>(null);
  const selectedDayIndexRef = useRef<number | null>(null);

  const detailPanelKey =
    isMultiDay && segment
      ? `${event.id}::${segment.id}`
      : multiDaySegmentInfo?.dayIndex !== undefined
        ? `${event.id}::day-${multiDaySegmentInfo.dayIndex}`
        : event.id;

  const showDetailPanel = detailPanelEventId === detailPanelKey;
  // When a custom dialog is provided, CalendarRoot handles it — disable click-outside
  // in CalendarEvent so clicks inside the dialog don't accidentally close it.
  const showDetailPanelForClickOutside = showDetailPanel && !customEventDetailDialog;

  const readOnlyConfig = app?.getReadOnlyConfig();
  const isEditable = !app?.state.readOnly;
  const canOpenDetail = readOnlyConfig?.viewable !== false;
  const isDraggable = readOnlyConfig?.draggable !== false;

  // Interaction Hook
  const {
    isSelected,
    setIsSelected,
    isPressed,
    setIsPressed,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useEventInteraction({
    event,
    isTouchEnabled,
    onMoveStart,
    onEventLongPress,
    onEventSelect,
    onDetailPanelToggle,
    canOpenDetail,
    app,
    multiDaySegmentInfo,
    isMultiDay,
    segment,
    detailPanelKey,
  });

  const isEventSelected =
    (selectedEventId !== undefined
      ? selectedEventId === event.id
      : isSelected) ||
    isPressed ||
    isBeingDragged;

  const [eventVisibility, setEventVisibility] = useState<
    'visible' | 'sticky-top' | 'sticky-bottom'
  >('visible');

  // Utility Wrappers
  const setActiveDayIndex = (dayIndex: number | null) => {
    selectedDayIndexRef.current = dayIndex;
  };

  const getActiveDayIdx = () =>
    getActiveDayIndex(
      event,
      detailPanelEventId || undefined,
      detailPanelKey,
      selectedDayIndexRef.current,
      multiDaySegmentInfo,
      segment
    );

  const getClickedDayIdx = (clientX: number) =>
    getClickedDayIndex(clientX, calendarRef, isMonthView, isDayView, isMobile);

  const getDayMetricsWrapper = (dayIndex: number) =>
    getDayMetrics(dayIndex, calendarRef, isMonthView, isDayView, isMobile);

  // Style Calculation (Internal due to state dependencies)
  const calculateEventStyle = () => {
    if (isMonthView) {
      if (isMultiDay && segment) {
        // MultiDayEvent handles its own scaling and positioning.
        // Applying transform here would create a containing block, breaking absolute positioning.
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
      const styles: any = {
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

    if (isEventSelected && showDetailPanel) {
      if (
        eventVisibility === 'sticky-top' ||
        eventVisibility === 'sticky-bottom'
      ) {
        const calendarRect = calendarRef.current?.getBoundingClientRect();
        if (calendarRect) {
          const activeDayIndex = getActiveDayIdx();
          const timeColumnWidth = isMobile ? 48 : 80;
          const columnCount = isDayView ? 1 : 7;
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

  // Panel Position logic (internal due to refs/state)
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
        const dayColumnWidth = metrics?.width ?? calendarRect.width / 7;
        const selectedDayLeft =
          metrics?.left ??
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
        return { ...prev, top, left, isSunday: left < dayStartX };
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
  ]);

  // Visibility Hook
  useEventVisibility({
    event,
    isEventSelected,
    showDetailPanel,
    eventRef,
    calendarRef,
    isAllDay,
    isMonthView,
    multiDaySegmentInfo,
    firstHour,
    hourHeight,
    updatePanelPosition,
    setEventVisibility,
  });

  // When a custom dialog is open, disable ALL click-outside handling so that
  // clicks inside the dialog don't accidentally close it. The dialog closes
  // itself via its own onClose callback.
  const isDialogOpen = showDetailPanel && !!customEventDetailDialog;

  // Click Outside Hook
  useClickOutside({
    eventRef,
    detailPanelRef,
    eventId: event.id,
    isEventSelected: isDialogOpen ? false : isEventSelected,
    showDetailPanel: showDetailPanelForClickOutside,
    onEventSelect,
    onDetailPanelToggle,
    setIsSelected,
    setActiveDayIndex,
  });

  // Stable panel close handler
  // Extracted to component scope so it can be used as a stable dep for
  // panelSlotArgs and contentSlotRenderer (avoids inline arrow churn).
  const handlePanelClose = useCallback(() => {
    if (onEventSelect) onEventSelect(null);
    selectedDayIndexRef.current = null;
    setIsSelected(false);
    onDetailPanelToggle?.(null);
  }, [onEventSelect, onDetailPanelToggle]);

  // Memoized args for the eventDetailContent ContentSlot
  // Object identity must be stable across scroll-triggered re-renders so
  // ContentSlot's update effect does not fire on every scroll tick.
  const panelSlotArgs = useMemo(
    () => ({
      event,
      isAllDay,
      onEventUpdate,
      onEventDelete,
      onClose: handlePanelClose,
    }),
    [event, isAllDay, onEventUpdate, onEventDelete, handlePanelClose]
  );

  // Memoized args for the eventContent ContentSlot
  // One ContentSlot per visible event; during scroll dozens fire every frame.
  // Keeping the object identity stable prevents store.notify() on every tick.
  const eventContentSlotArgs = useMemo(
    () => ({ event, isAllDay, isMobile, isMonthView, segment, layout }),
    [event, isAllDay, isMobile, isMonthView, segment, layout]
  );

  // Stable contentRenderer for EventDetailPanelWithContent
  // Must be a stable function reference so Preact does not see a new
  // component type each render and unmount/remount the ContentSlot tree.
  const contentSlotRenderer = useCallback(
    () => (
      <ContentSlot
        store={customRenderingStore}
        generatorName="eventDetailContent"
        generatorArgs={panelSlotArgs}
      />
    ),
    [customRenderingStore, panelSlotArgs]
  );

  // Visibility Sync
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

  // Highlight effect
  useEffect(() => {
    if (app?.state.highlightedEventId === event.id) {
      setIsPopping(true);
      const timer = setTimeout(() => {
        setIsPopping(false);
      }, 300);
      return () => {
        clearTimeout(timer);
        setIsPopping(false);
      };
    }
  }, [app?.state.highlightedEventId, event.id]);

  // Helpers
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
    });
  };

  const handleContextMenu = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEventSelect) onEventSelect(event.id);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = (e: any) => {
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
        clickedDay !== null
          ? Math.min(
              Math.max(clickedDay, segment?.startDayIndex ?? 0),
              segment?.endDayIndex ?? 6
            )
          : (segment?.startDayIndex ?? event.day ?? 0)
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
  };

  const handleClick = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMultiDay) {
      const clickedDay = getClickedDayIdx(e.clientX);
      setActiveDayIndex(
        clickedDay !== null
          ? segment
            ? Math.min(
                Math.max(clickedDay, segment.startDayIndex),
                segment.endDayIndex
              )
            : clickedDay
          : (multiDaySegmentInfo?.dayIndex ?? event.day ?? null)
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
  };

  // Rendering Functions
  const renderDetailPanel = () => {
    if (!showDetailPanel) return null;

    if (customEventDetailDialog) {
      // Dialog rendering is handled at CalendarRoot level to avoid stacking context issues.
      // CalendarRoot uses detailPanelEventId to know which event's dialog to show.
      return null;
    }

    if (!detailPanelPosition) return null;

    const panelProps = {
      event,
      position: detailPanelPosition,
      panelRef: detailPanelRef,
      isAllDay,
      eventVisibility,
      calendarRef,
      selectedEventElementRef,
      onEventUpdate,
      onEventDelete,
      onClose: handlePanelClose,
    };

    // If framework(React/Vue/...) has overridden the eventDetailContent slot, render the panel chrome
    // with ContentSlot inside it. This ensures the React content is portaled into
    // the positioned floating panel (at document.body), not inline in the calendar grid.
    // contentSlotRenderer is a stable useCallback so Preact does not see a new
    // component type on every render, preventing unmount/remount flicker.
    if (customRenderingStore?.isOverridden('eventDetailContent')) {
      return (
        <EventDetailPanelWithContent
          {...panelProps}
          contentRenderer={contentSlotRenderer}
        />
      );
    }

    if (customDetailPanelContent) {
      return (
        <EventDetailPanelWithContent
          {...panelProps}
          contentRenderer={customDetailPanelContent}
        />
      );
    }

    return <DefaultEventDetailPanel {...panelProps} app={app} />;
  };

  const renderEventContent = () => {
    let defaultContent;
    if (isMonthView) {
      if (isMultiDay && segment) {
        defaultContent = (
          <MultiDayEvent
            segment={segment}
            segmentIndex={segmentIndex ?? 0}
            isDragging={isBeingDragged || isEventSelected}
            isResizing={isBeingResized}
            isSelected={isEventSelected}
            onMoveStart={onMoveStart || (() => {})}
            onResizeStart={onResizeStart}
            isMobile={isMobile}
            isDraggable={isDraggable}
            isEditable={isEditable}
            viewable={canOpenDetail}
            isPopping={isPopping}
          />
        );
      } else {
        defaultContent = event.allDay ? (
          <MonthAllDayContent event={event} isEventSelected={isEventSelected} />
        ) : (
          <MonthRegularContent
            event={event}
            app={app}
            isEventSelected={isEventSelected}
            hideTime={hideTime}
            isMobile={isMobile}
          />
        );
      }
    } else {
      defaultContent = event.allDay ? (
        <AllDayContent
          event={event}
          isEditable={isEditable}
          onResizeStart={onResizeStart}
        />
      ) : (
        <RegularEventContent
          event={event}
          app={app}
          multiDaySegmentInfo={multiDaySegmentInfo}
          isEditable={isEditable}
          isTouchEnabled={isTouchEnabled}
          isEventSelected={isEventSelected}
          onResizeStart={onResizeStart}
        />
      );
    }

    return (
      <ContentSlot
        store={customRenderingStore}
        generatorName="eventContent"
        generatorArgs={eventContentSlotArgs}
        defaultContent={defaultContent}
      />
    );
  };

  // Final Render
  const calendarId = event.calendarId || 'blue';
  const calendarRegistry = app?.getCalendarRegistry();

  return (
    <>
      <div
        ref={eventRef}
        data-event-id={event.id}
        className={getEventClasses(
          isMonthView,
          isDayView,
          isAllDay,
          isMultiDay,
          segment
        )}
        style={{
          ...calculateEventStyle(),
          backgroundColor: isEventSelected
            ? getSelectedBgColor(calendarId, calendarRegistry)
            : getEventBgColor(calendarId, calendarRegistry),
          color: isEventSelected
            ? '#fff'
            : getEventTextColor(calendarId, calendarRegistry),
        }}
        onClick={isTouchEnabled ? undefined : handleClick}
        onContextMenu={isTouchEnabled ? undefined : handleContextMenu}
        onDblClick={isTouchEnabled ? undefined : handleDoubleClick}
        onMouseDown={e => {
          if (!isTouchEnabled) setIsPressed(true);
          if (onMoveStart) {
            if (multiDaySegmentInfo) {
              onMoveStart(e, {
                ...event,
                day: multiDaySegmentInfo.dayIndex ?? event.day,
                _segmentInfo: multiDaySegmentInfo,
              } as Event);
            } else if (isMultiDay && segment) {
              onMoveStart(e, {
                ...event,
                day: segment.startDayIndex,
                _segmentInfo: {
                  dayIndex: segment.startDayIndex,
                  isFirst: segment.isFirstSegment,
                  isLast: segment.isLastSegment,
                },
              } as Event);
            } else {
              onMoveStart(e, event);
            }
          }
        }}
        onMouseUp={() => !isTouchEnabled && setIsPressed(false)}
        onMouseLeave={() => !isTouchEnabled && setIsPressed(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {renderEventContent()}
      </div>

      {showDetailPanel && !customEventDetailDialog && (
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
      {contextMenuPosition && app && (
        <EventContextMenu
          event={event}
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          onClose={() => setContextMenuPosition(null)}
          app={app}
          onDetailPanelToggle={onDetailPanelToggle}
          detailPanelKey={detailPanelKey}
        />
      )}
    </>
  );
};

export default CalendarEvent;
