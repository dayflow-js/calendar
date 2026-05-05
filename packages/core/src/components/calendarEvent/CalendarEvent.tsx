import { memo } from 'preact/compat';
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { EventContextMenu } from '@/components/contextMenu';
import { ContentSlot } from '@/renderer/ContentSlot';
import { CustomRenderingContext } from '@/renderer/CustomRenderingContext';
import {
  Event,
  ViewType,
  ReadOnlyConfig,
  EventDetailContentProps,
} from '@/types';
import {
  getSelectedBgColor,
  getEventBgColor,
  getEventTextColor,
  getPrimaryCalendarId,
  getCalendarEventBgColors,
  buildDiagonalPatternBackground,
  temporalToVisualTemporal,
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
  getEventSegmentShape,
} from './utils';

const HIGHLIGHT_POP_DURATION_MS = 650;

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
  useEventDetailPanel,
  multiDaySegmentInfo,
  app,
  isMobile = false,
  isSlidingView = false,
  enableTouch,
  hideTime,
  timeFormat = '24h',
  styleOverride,
  className,
  disableDefaultStyle = false,
  renderVisualContent,
  resizeHandleOrientation,
  appTimeZone,
  monthEventHeight,
}: CalendarEventProps) => {
  const customRenderingStore = useContext(CustomRenderingContext);
  const isTouchEnabled = enableTouch ?? isMobile;
  const isYearView = viewType === ViewType.YEAR;

  // Visual event for display (shifted walls)
  const visualEvent = useMemo(() => {
    if (!appTimeZone || event.allDay) return event;
    const start = temporalToVisualTemporal(
      event.start as Temporal.PlainDate,
      appTimeZone
    );
    const end = event.end
      ? temporalToVisualTemporal(event.end as Temporal.PlainDate, appTimeZone)
      : undefined;
    return { ...event, start, end } as Event;
  }, [event, appTimeZone]);
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
  const panelEnabled = useEventDetailPanel !== false;
  const showDetailPanelForClickOutside = showDetailPanel && panelEnabled;

  const readOnlyConfig = app?.getReadOnlyConfig(event.id) as ReadOnlyConfig;
  const isEditable = app?.canMutateFromUI(event.id) ?? false;
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
    shouldSuppressClick,
  } = useEventInteraction({
    event,
    isTouchEnabled,
    onMoveStart: isDraggable ? onMoveStart : undefined,
    onEventLongPress,
    onEventSelect,
    onDetailPanelToggle,
    canOpenDetail,
    useEventDetailPanel,
    app,
    multiDaySegmentInfo,
    isMultiDay,
    segment,
    detailPanelKey,
  });

  const [eventVisibility, setEventVisibility] = useState<
    'standard' | 'sticky-top' | 'sticky-bottom' | 'sticky-left' | 'sticky-right'
  >('standard');

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
  const {
    handleClick,
    handleDoubleClick,
    handleContextMenu,
    hasPendingSelection,
  } = useEventActions({
    event,
    timingEvent: visualEvent,
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
    useEventDetailPanel,
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
  });

  const isEventSelected =
    (selectedEventId === undefined
      ? isSelected
      : selectedEventId === event.id) ||
    hasPendingSelection ||
    (!isTouchEnabled && isPressed) ||
    isBeingDragged;
  const hasTouchResizeHandles = isTouchEnabled && isEventSelected && isEditable;

  // Styles Hook
  const { calculateEventStyle } = useEventStyles({
    event,
    timingEvent: visualEvent,
    layout,
    isBeingDragged,
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
    monthEventHeight,
  });

  // Visibility Hook
  useEventVisibility({
    event,
    timingEvent: visualEvent,
    isEventSelected,
    showDetailPanel,
    eventRef,
    calendarRef,
    isAllDay,
    viewType,
    isMobile,
    multiDaySegmentInfo,
    firstHour,
    hourHeight,
    updatePanelPosition,
    eventVisibility,
    setEventVisibility,
  });

  // Click Outside Hook
  useClickOutside({
    eventRef,
    detailPanelRef,
    eventId: event.id,
    isEventSelected: isEventSelected,
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

  // Memoized args for the eventContent ContentSlot
  const eventContentSlotArgs = useMemo(
    () => ({
      event,
      viewType,
      isAllDay,
      isMobile,
      isSelected: isEventSelected,
      isDragging: isBeingDragged,
      segment,
      layout,
    }),
    [
      event,
      viewType,
      isAllDay,
      isMobile,
      isEventSelected,
      isBeingDragged,
      segment,
      layout,
    ]
  );

  const contentSlotRenderer = useCallback(
    (contentProps: EventDetailContentProps) => (
      <ContentSlot
        store={customRenderingStore}
        generatorName='eventDetailContent'
        generatorArgs={contentProps}
      />
    ),
    [customRenderingStore]
  );

  // Highlight effect
  useEffect(() => {
    if (app?.state.highlightedEventId === event.id) {
      setIsPopping(true);
      const timer = setTimeout(() => {
        setIsPopping(false);
      }, HIGHLIGHT_POP_DURATION_MS);
      return () => {
        clearTimeout(timer);
        setIsPopping(false);
      };
    }
  }, [app?.state.highlightedEventId, event.id]);

  useEffect(() => {
    if (isEditable) return;
    setContextMenuPosition(null);
  }, [isEditable]);

  // Auto-open detail panel for newly created events
  useEffect(() => {
    const isFirst =
      (isMultiDay && segment?.isFirstSegment) ||
      (isYearView && yearSegment?.isFirstSegment) ||
      (!isMultiDay && !isYearView);

    if (
      newlyCreatedEventId === event.id &&
      !showDetailPanel &&
      isFirst &&
      useEventDetailPanel !== false
    ) {
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
  const calendarId = getPrimaryCalendarId(event);
  const calendarRegistry = app?.getCalendarRegistry();
  const multiCalendarBgColors =
    event.calendarIds && event.calendarIds.length > 1
      ? getCalendarEventBgColors(event, calendarRegistry)
      : null;
  const eventSegmentShape = getEventSegmentShape(
    viewType,
    isAllDay,
    segment,
    yearSegment
  );

  return (
    <>
      <div
        ref={eventRef}
        data-event-id={event.id}
        data-view={viewType}
        data-all-day={String(isAllDay)}
        data-selected={String(isEventSelected)}
        data-dragging={String(isBeingDragged)}
        data-resizing={String(isBeingResized)}
        data-popping={String(isPopping)}
        data-multi-day={String(isMultiDay)}
        data-editable={String(isEditable)}
        data-draggable={String(isDraggable)}
        data-viewable={String(canOpenDetail)}
        data-segment-shape={eventSegmentShape}
        data-month-stack={String(viewType === ViewType.MONTH && !isMultiDay)}
        data-touch-handles={String(hasTouchResizeHandles)}
        className={`${getEventClasses(
          viewType,
          isAllDay,
          isMultiDay
        )} ${isAllDay && newlyCreatedEventId === event.id ? 'df-all-day-event-animate' : ''} ${className ?? ''}`}
        style={{
          ...(disableDefaultStyle ? {} : calculateEventStyle()),
          ...(isEventSelected
            ? {
                background: getSelectedBgColor(calendarId, calendarRegistry),
                color: '#fff',
              }
            : event.calendarIds && event.calendarIds.length > 1
              ? {
                  background: buildDiagonalPatternBackground(
                    multiCalendarBgColors!
                  ),
                  color: getEventTextColor(calendarId, calendarRegistry),
                }
              : {
                  backgroundColor: getEventBgColor(
                    calendarId,
                    calendarRegistry
                  ),
                  color: getEventTextColor(calendarId, calendarRegistry),
                }),
          ...styleOverride,
        }}
        onClick={e => {
          if (isTouchEnabled && shouldSuppressClick()) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          handleClick(e as MouseEvent);
        }}
        onContextMenu={handleContextMenu}
        onDblClick={handleDoubleClick}
        onMouseDown={e => {
          if (!isTouchEnabled) setIsPressed(true);
          if (onMoveStart && isDraggable) {
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
          event={visualEvent}
          viewType={viewType}
          isAllDay={isAllDay}
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
          onMoveStart={onMoveStart}
          onResizeStart={onResizeStart}
          multiDaySegmentInfo={multiDaySegmentInfo}
          customRenderingStore={customRenderingStore}
          eventContentSlotArgs={eventContentSlotArgs}
          timeFormat={timeFormat}
          appTimeZone={appTimeZone}
          renderVisualContent={renderVisualContent}
          resizeHandleOrientation={resizeHandleOrientation}
          monthEventHeight={monthEventHeight}
        />
      </div>

      {showDetailPanel && panelEnabled && (
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
        showDetailPanel={showDetailPanel && panelEnabled}
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
        app={app}
      />

      {contextMenuPosition && app && isEditable && (
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

export default memo(CalendarEvent);
