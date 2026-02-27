import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from 'preact/hooks';

import { EventContextMenu } from '@/components/contextMenu';
import { ContentSlot } from '@/renderer/ContentSlot';
import { CustomRenderingContext } from '@/renderer/CustomRenderingContext';
import { Event, ViewType } from '@/types';
import {
  getSelectedBgColor,
  getEventBgColor,
  getEventTextColor,
} from '@/utils';

import { EventContent } from './components/EventContent';
import { EventDetailPanel } from './components/EventDetailPanel';
import { useClickOutside } from './hooks/useClickOutside';
import { useDetailPanelPosition } from './hooks/useDetailPanelPosition';
import { useEventActions } from './hooks/useEventActions';
import { useEventInteraction } from './hooks/useEventInteraction';
import { useEventStyles } from './hooks/useEventStyles';
import { useEventVisibility } from './hooks/useEventVisibility';
import { CalendarEventProps } from './types';
// Import extracted utils and hooks
import {
  getDayMetrics,
  getActiveDayIndex,
  getClickedDayIndex,
  getEventClasses,
} from './utils';

const CalendarEvent = ({
  event,
  layout,
  isAllDay = false,
  allDayHeight = 28,
  calendarRef,
  isBeingDragged = false,
  isBeingResized = false,
  viewType,
  isMultiDay = false,
  segment,
  yearSegment,
  columnsPerRow,
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
  isSlidingView = false,
  enableTouch,
  hideTime,
  timeFormat = '24h',
}: CalendarEventProps) => {
  const customRenderingStore = useContext(CustomRenderingContext);
  const isTouchEnabled = enableTouch ?? isMobile;
  const isYearView = viewType === ViewType.YEAR;
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isPopping, setIsPopping] = useState(false);

  const eventRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const selectedEventElementRef = useRef<HTMLDivElement | null>(null);
  const selectedDayIndexRef = useRef<number | null>(null);

  const detailPanelKey =
    isMultiDay && segment
      ? `${event.id}::${segment.id}`
      : multiDaySegmentInfo?.dayIndex === undefined
        ? isYearView && yearSegment
          ? yearSegment.id
          : event.id
        : `${event.id}::day-${multiDaySegmentInfo.dayIndex}`;

  const showDetailPanel = detailPanelEventId === detailPanelKey;
  const showDetailPanelForClickOutside =
    showDetailPanel && !customEventDetailDialog;

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
    (selectedEventId === undefined
      ? isSelected
      : selectedEventId === event.id) ||
    (!isTouchEnabled && isPressed) ||
    isBeingDragged;

  const [eventVisibility, setEventVisibility] = useState<
    'visible' | 'sticky-top' | 'sticky-bottom'
  >('visible');

  // Utility Wrappers
  const setActiveDayIndex = (dayIndex: number | null) => {
    selectedDayIndexRef.current = dayIndex;
  };

  const getActiveDayIdx = useCallback(
    () =>
      getActiveDayIndex(
        event,
        detailPanelEventId || undefined,
        detailPanelKey,
        selectedDayIndexRef.current,
        multiDaySegmentInfo,
        segment
      ),
    [event, detailPanelEventId, detailPanelKey, multiDaySegmentInfo, segment]
  );

  const getClickedDayIdx = useCallback(
    (clientX: number) =>
      getClickedDayIndex(clientX, calendarRef, viewType, isMobile),
    [calendarRef, viewType, isMobile]
  );

  const getDayMetricsWrapper = useCallback(
    (dayIndex: number) =>
      getDayMetrics(dayIndex, calendarRef, viewType, isMobile),
    [calendarRef, viewType, isMobile]
  );

  // Positioning Hook
  const { detailPanelPosition, setDetailPanelPosition, updatePanelPosition } =
    useDetailPanelPosition({
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
    });

  // Actions Hook
  const { handleClick, handleDoubleClick, handleContextMenu } = useEventActions(
    {
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
    }
  );

  // Styles Hook
  const { calculateEventStyle } = useEventStyles({
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
  });

  // Visibility Hook
  useEventVisibility({
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
    eventVisibility,
    setEventVisibility,
  });

  // When a custom dialog is open, disable ALL click-outside handling
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
  const handlePanelClose = useCallback(() => {
    if (onEventSelect) onEventSelect(null);
    selectedDayIndexRef.current = null;
    setIsSelected(false);
    onDetailPanelToggle?.(null);
  }, [onEventSelect, onDetailPanelToggle, setIsSelected]);

  // Memoized args for the eventDetailContent ContentSlot
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
  const eventContentSlotArgs = useMemo(
    () => ({
      event,
      isAllDay,
      isMobile,
      isMonthView: viewType === ViewType.MONTH,
      segment,
      layout,
    }),
    [event, isAllDay, isMobile, viewType, segment, layout]
  );

  // Stable contentRenderer for EventDetailPanelWithContent
  const contentSlotRenderer = useCallback(
    () => (
      <ContentSlot
        store={customRenderingStore}
        generatorName='eventDetailContent'
        generatorArgs={panelSlotArgs}
      />
    ),
    [customRenderingStore, panelSlotArgs]
  );

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

  // Auto-open detail panel for newly created events
  useEffect(() => {
    const isFirst =
      (isMultiDay && segment?.isFirstSegment) ||
      (isYearView && yearSegment?.isFirstSegment) ||
      (!isMultiDay && !isYearView);

    if (newlyCreatedEventId === event.id && !showDetailPanel && isFirst) {
      setTimeout(() => {
        onDetailPanelToggle?.(detailPanelKey);
        onDetailPanelOpen?.();
      }, 50);
    }
  }, [
    newlyCreatedEventId,
    event.id,
    showDetailPanel,
    isMultiDay,
    segment,
    isYearView,
    yearSegment,
    onDetailPanelToggle,
    onDetailPanelOpen,
    detailPanelKey,
  ]);

  // Final Render
  const calendarId = event.calendarId || 'blue';
  const calendarRegistry = app?.getCalendarRegistry();

  return (
    <>
      <div
        ref={eventRef}
        data-event-id={event.id}
        className={`${getEventClasses(
          viewType,
          isAllDay,
          isMultiDay,
          segment,
          yearSegment
        )} ${isAllDay && newlyCreatedEventId === event.id ? 'df-all-day-event-animate' : ''}`}
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
            const mouseEvent = e as MouseEvent;
            if (multiDaySegmentInfo) {
              onMoveStart(mouseEvent, {
                ...event,
                day: multiDaySegmentInfo.dayIndex ?? event.day,
                _segmentInfo: multiDaySegmentInfo,
              } as Event);
            } else if (isMultiDay && segment) {
              onMoveStart(mouseEvent, {
                ...event,
                day: segment.startDayIndex,
                _segmentInfo: {
                  dayIndex: segment.startDayIndex,
                  isFirst: segment.isFirstSegment,
                  isLast: segment.isLastSegment,
                },
              } as Event);
            } else {
              onMoveStart(mouseEvent, event);
            }
          }
        }}
        onMouseUp={() => !isTouchEnabled && setIsPressed(false)}
        onMouseLeave={() => !isTouchEnabled && setIsPressed(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <EventContent
          event={event}
          viewType={viewType}
          isMultiDay={isMultiDay}
          segment={segment}
          yearSegment={yearSegment}
          segmentIndex={segmentIndex}
          isBeingDragged={isBeingDragged}
          isBeingResized={isBeingResized}
          isEventSelected={isEventSelected}
          isPopping={isPopping}
          isEditable={isEditable}
          isDraggable={isDraggable}
          canOpenDetail={canOpenDetail}
          isTouchEnabled={isTouchEnabled}
          hideTime={hideTime}
          isMobile={isMobile}
          isSlidingView={isSlidingView}
          app={app}
          onResizeStart={onResizeStart}
          multiDaySegmentInfo={multiDaySegmentInfo}
          customRenderingStore={customRenderingStore}
          eventContentSlotArgs={eventContentSlotArgs}
          layout={layout}
          timeFormat={timeFormat}
        />
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

      <EventDetailPanel
        showDetailPanel={showDetailPanel}
        customEventDetailDialog={customEventDetailDialog}
        detailPanelPosition={detailPanelPosition}
        event={event}
        detailPanelRef={detailPanelRef}
        isAllDay={isAllDay}
        eventVisibility={eventVisibility}
        calendarRef={calendarRef}
        selectedEventElementRef={selectedEventElementRef}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        handlePanelClose={handlePanelClose}
        customRenderingStore={customRenderingStore}
        contentSlotRenderer={contentSlotRenderer}
        customDetailPanelContent={customDetailPanelContent}
        app={app}
      />

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
