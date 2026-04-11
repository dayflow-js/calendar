import {
  Event,
  MonthDragState,
  ViewType,
  WeekDayDragState,
  UseDragHandlersReturn,
  UseDragHandlersParams,
  DragService,
  roundToTimeStep,
  TIME_STEP,
  getDateByDayIndex,
  useLocale,
  temporalToDate,
  dateToZonedDateTime,
  dateToPlainDate,
} from '@dayflow/core';
import {
  buildDateGridCreateEvent,
  buildDateGridDropResult,
  buildDateGridMoveStartData,
  buildDateGridPreviewUpdate,
  shouldActivateDateGridMove,
} from '@drag/hooks/utils/dateGridDrag';
import {
  addDocumentDragListeners,
  applyGlobalDragCursor,
  clearGlobalDragCursor,
  getClientCoordinates,
  isTouchLikeEvent,
  removeDocumentDragListeners,
} from '@drag/hooks/utils/dragInteraction';
import {
  canonicalizeEditedEvent as canonicalizeEditedEventForTimeZone,
  getAppTimeZone as getAppTimeZoneFromApp,
  getDayIndexForDate as getDayIndexForDateInWeek,
  getEffectiveDaySpan as getEffectiveDaySpanForEvent,
  getEventDateForEditing as getEventDateForEditingInTimeZone,
  getTimedEventHoursForEditing as getTimedEventHoursForEditingInTimeZone,
} from '@drag/hooks/utils/eventEditing';
import { resolveDragSourceElement } from '@drag/hooks/utils/resolveDragSourceElement';
import {
  buildWeekDayCreateEvent,
  buildWeekDayDropEvent,
  finalizeWeekDayDragHours,
} from '@drag/hooks/utils/weekDay/completion';
import {
  buildCrossRegionAllDayPreview,
  buildCrossRegionTimedPreview,
  buildUniversalMoveDropResult,
  shouldActivateUniversalMoveIndicator,
} from '@drag/hooks/utils/weekDay/crossRegion';
import {
  buildAllDayCreateMovePreview,
  buildAllDayResizePreview,
  buildCrossDayTimedResizePreview,
  buildSingleDayTimedResizePreview,
  buildTimedMovePreview,
  buildWeekDayCreateStartData,
  buildWeekDayMoveStartData,
  buildWeekDayResizeStartData,
  getAllDayEventDurationDays,
} from '@drag/hooks/utils/weekDay/drag';
import { buildWeekDayDragLayout } from '@drag/hooks/utils/weekDay/layout';
import {
  buildSingleDayTimedResizeEventUpdate,
  buildTimedCreatePreview,
} from '@drag/hooks/utils/weekDay/preview';
import { useCallback, useRef } from 'preact/hooks';

type InternalDragRef = {
  pendingMove?: boolean;
};

export const useDragHandlers = (
  params: UseDragHandlersParams
): UseDragHandlersReturn => {
  const { t } = useLocale();
  const { options, common, state, manager } = params;
  const {
    viewType,
    onEventsUpdate,
    onEventCreate,
    onEventEdit,
    calculateNewEventLayout,
    calculateDragLayout,
    currentWeekStart,
    events,
    allDayRowRef,
    FIRST_HOUR = 0,
    LAST_HOUR = 24,
    MIN_DURATION = 0.25,
    app,
  } = options;

  const appTimeZone = getAppTimeZoneFromApp(app);
  const getAppTimeZone = () => appTimeZone;

  const getEventDateForEditing = (temporal: Event['start']) =>
    getEventDateForEditingInTimeZone(temporal, appTimeZone);

  const canonicalizeEditedEvent = (
    originalEvent: Event,
    visualEvent: Event
  ): Event =>
    canonicalizeEditedEventForTimeZone(originalEvent, visualEvent, appTimeZone);

  const getTimedEventHoursForEditing = (event: Event) =>
    getTimedEventHoursForEditingInTimeZone(event, appTimeZone);

  const {
    dragRef,
    currentDragRef,
    setDragState,
    resetDragState,
    throttledSetEvents,
  } = state;
  const { removeDragIndicator, createDragIndicator, updateDragIndicator } =
    manager;
  const {
    pixelYToHour,
    getColumnDayIndex,
    checkIfInAllDayArea,
    handleDirectScroll,
    daysDifference,
    addDaysToDate,
    getTargetDateFromPosition,
  } = common;

  const isDateGridView =
    viewType === ViewType.MONTH || viewType === ViewType.YEAR;
  const isDayView = viewType === ViewType.DAY;
  const shouldPreviewDateGridEventChanges = false;
  const dateGridPreviewFrameRef = useRef<number | null>(null);
  const latestDateGridPointerRef = useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);

  type DateCellRect = {
    date: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  const dateCellCacheRef = useRef<DateCellRect[]>([]);

  const buildDateCellCache = useCallback(() => {
    if (!options.calendarRef?.current) return;
    const cells =
      options.calendarRef.current.querySelectorAll<HTMLElement>('[data-date]');
    const cache: DateCellRect[] = [];
    for (const cell of cells) {
      const date = cell.dataset.date;
      if (!date) continue;
      const rect = cell.getBoundingClientRect();
      cache.push({
        date,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      });
    }
    dateCellCacheRef.current = cache;
  }, [options.calendarRef]);

  const getCachedTargetDate = useCallback(
    (clientX: number, clientY: number): Date | null => {
      for (const cell of dateCellCacheRef.current) {
        if (
          clientX >= cell.left &&
          clientX <= cell.right &&
          clientY >= cell.top &&
          clientY <= cell.bottom
        ) {
          return new Date(cell.date + 'T00:00:00');
        }
      }
      return null;
    },
    []
  );

  const TIME_STEP_MS = TIME_STEP * 60 * 60 * 1000;
  const getEffectiveDaySpan = (
    start: Date,
    end: Date,
    isAllDay: boolean = false
  ): number => getEffectiveDaySpanForEvent(start, end, isAllDay);

  const getDayIndexForDate = (date: Date, fallback: number = 0): number =>
    getDayIndexForDateInWeek(currentWeekStart, date, fallback);

  const cancelScheduledDateGridPreview = useCallback(() => {
    if (dateGridPreviewFrameRef.current !== null) {
      clearTimeout(dateGridPreviewFrameRef.current);
      dateGridPreviewFrameRef.current = null;
    }
    latestDateGridPointerRef.current = null;
  }, []);

  const applyDateGridPreview = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current as typeof dragRef.current & InternalDragRef;
      if (!drag || (!drag.active && !drag.pendingMove)) return;

      const targetDate =
        getCachedTargetDate(clientX, clientY) ??
        getTargetDateFromPosition(clientX, clientY);
      if (!targetDate) return;

      const previewUpdate = buildDateGridPreviewUpdate({
        addDaysToDate,
        daysDifference,
        drag,
        targetDate,
      });
      if (!previewUpdate) return;

      if (previewUpdate.kind === 'target-only') {
        drag.targetDate = previewUpdate.targetDate;
        return;
      }

      drag.originalStartDate = new Date(previewUpdate.startDate.getTime());
      drag.originalEndDate = new Date(previewUpdate.endDate.getTime());
      drag.targetDate = new Date(previewUpdate.targetDate.getTime());

      setDragState(prev => {
        if ('targetDate' in prev) {
          return {
            ...prev,
            targetDate: previewUpdate.targetDate,
            startDate: previewUpdate.startDate,
            endDate: previewUpdate.endDate,
          } as MonthDragState;
        }
        return prev;
      });

      const isAllDay = drag.originalEvent?.allDay || false;
      const newStartTemporal = isAllDay
        ? dateToPlainDate(previewUpdate.startDate)
        : dateToZonedDateTime(previewUpdate.startDate, getAppTimeZone());
      const newEndTemporal = isAllDay
        ? dateToPlainDate(previewUpdate.endDate)
        : dateToZonedDateTime(previewUpdate.endDate, getAppTimeZone());

      if (shouldPreviewDateGridEventChanges) {
        throttledSetEvents(
          (prev: Event[]) =>
            prev.map(event =>
              event.id === drag.eventId
                ? {
                    ...event,
                    start: newStartTemporal,
                    end: newEndTemporal,
                    title: event.title,
                  }
                : event
            ),
          drag.mode ?? undefined
        );
      }
    },
    [
      dragRef,
      getCachedTargetDate,
      getTargetDateFromPosition,
      setDragState,
      throttledSetEvents,
      shouldPreviewDateGridEventChanges,
      daysDifference,
      addDaysToDate,
      getAppTimeZone,
    ]
  );

  // Cross-region drag move (Week/Day view specific) - complete version
  const handleUniversalDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const readOnlyConfig = app?.getReadOnlyConfig();
      const isDraggable = readOnlyConfig?.draggable !== false;
      const isEditable = !app?.state.readOnly;
      const drag = dragRef.current as typeof dragRef.current & InternalDragRef;
      if (!drag) return;
      if (drag.mode === 'move' && !isDraggable) return;
      if ((drag.mode === 'resize' || drag.mode === 'create') && !isEditable)
        return;

      // Prevent scrolling on touch devices
      if (e.cancelable) {
        e.preventDefault();
        e.stopPropagation();
      }

      const { clientX, clientY } = getClientCoordinates(e);

      if (!drag || !drag.active) return;

      // Deferred indicator creation for move mode
      if (drag.mode === 'move' && !drag.indicatorVisible) {
        if (
          !shouldActivateUniversalMoveIndicator({
            clientX,
            clientY,
            startX: drag.startX,
            startY: drag.startY,
          })
        ) {
          return;
        }

        createDragIndicator(
          drag,
          drag.calendarId,
          drag.title,
          null,
          drag.sourceElement || undefined
        );
        drag.indicatorVisible = true;
      }

      // Set cursor based on drag mode and direction
      if (drag.mode === 'resize') {
        applyGlobalDragCursor(
          'resize',
          drag.allDay ? 'ew-resize' : 'ns-resize'
        );
      } else {
        applyGlobalDragCursor('move', 'grabbing');
      }

      const isInAllDayArea = checkIfInAllDayArea(clientY);
      const newDayIndex = isDayView
        ? drag.dayIndex
        : getColumnDayIndex(clientX);

      if (isInAllDayArea) {
        // Switch to all-day area
        if (drag.allDay) {
          setDragState(prev => ({
            ...prev,
            dayIndex: newDayIndex,
            startHour: 0,
            endHour: 0,
            allDay: true,
          }));
        } else {
          const { dragState: allDayDragState, dragUpdates } =
            buildCrossRegionAllDayPreview({
              currentWeekStart,
              drag,
              newDayIndex,
            });
          Object.assign(drag, dragUpdates);
          removeDragIndicator();
          drag.indicatorVisible = false;
          const event = events?.find(target => target.id === drag.eventId);
          // When switching regions, don't pass source element, use calculation method
          createDragIndicator(drag, event?.calendarId, event?.title);
          drag.sourceElement = null;
          drag.indicatorVisible = true;
          setDragState(allDayDragState);
        }
        drag.dayIndex = newDayIndex;
        updateDragIndicator(newDayIndex, 0, 0, true);
      } else {
        // Switch to regular time area
        handleDirectScroll(clientY);
        const mouseHour = pixelYToHour(clientY);

        if (drag.allDay) {
          const { dragState: timedDragState, dragUpdates } =
            buildCrossRegionTimedPreview({
              currentWeekStart,
              drag,
              firstHour: FIRST_HOUR,
              lastHour: LAST_HOUR,
              mouseHour,
              newDayIndex,
              roundToTimeStep,
              timeStep: TIME_STEP,
            });
          Object.assign(drag, dragUpdates);
          removeDragIndicator();
          drag.indicatorVisible = false;
          const event = events?.find(target => target.id === drag.eventId);
          // When switching regions, don't pass source element, use calculation method
          createDragIndicator(drag, event?.calendarId, event?.title);
          drag.sourceElement = null;
          drag.indicatorVisible = true;
          setDragState(timedDragState);
        } else {
          const { dragState: timedDragState, dragUpdates } =
            buildCrossRegionTimedPreview({
              currentWeekStart,
              drag,
              firstHour: FIRST_HOUR,
              lastHour: LAST_HOUR,
              mouseHour,
              newDayIndex,
              roundToTimeStep,
              timeStep: TIME_STEP,
            });
          Object.assign(drag, dragUpdates);
          setDragState(timedDragState);
        }

        // Calculate layout
        const dragLayout =
          drag.mode === 'move'
            ? buildWeekDayDragLayout({
                calculateDragLayout,
                dayIndex: newDayIndex,
                endHour: drag.endHour,
                eventId: drag.eventId,
                events,
                roundToTimeStep,
                startHour: drag.startHour,
              })
            : null;
        updateDragIndicator(
          newDayIndex,
          roundToTimeStep(drag.startHour),
          roundToTimeStep(drag.endHour),
          false,
          dragLayout
        );
      }
    },
    [
      calculateDragLayout,
      checkIfInAllDayArea,
      createDragIndicator,
      events,
      FIRST_HOUR,
      getColumnDayIndex,
      handleDirectScroll,
      LAST_HOUR,
      isDayView,
      pixelYToHour,
      removeDragIndicator,
      updateDragIndicator,
      dragRef,
      setDragState,
      currentWeekStart,
    ]
  );

  // Cross-region drag end (Week/Day view specific) - complete version
  const handleUniversalDragEnd = useCallback(() => {
    const drag = dragRef.current as typeof dragRef.current & InternalDragRef;
    if (!drag || !drag.active) return;

    const readOnlyConfig = app?.getReadOnlyConfig();
    const isDraggable = readOnlyConfig?.draggable !== false;
    const isEditable = !app?.state.readOnly;

    if (drag.mode === 'move' && !isDraggable) return;
    if ((drag.mode === 'resize' || drag.mode === 'create') && !isEditable)
      return;

    clearGlobalDragCursor();

    // If dragging but threshold not met (indicator not visible), treat as click/cancel
    if (drag.mode === 'move' && !drag.indicatorVisible) {
      removeDocumentDragListeners(
        handleUniversalDragMove,
        handleUniversalDragEnd
      );
      resetDragState();
      return;
    }

    if (drag.mode !== 'move' || !drag.eventId) return;

    // Precompute updatedEvent to fire onEventDrop callback
    const targetEvent = events?.find(e => e.id === drag.eventId);
    if (targetEvent) {
      const { originalEvent, updatedEvent } = buildUniversalMoveDropResult({
        appTimeZone,
        canonicalizeEditedEvent,
        currentWeekStart,
        drag,
        getEffectiveDaySpan,
        minDuration: MIN_DURATION,
        roundToTimeStep,
        targetEvent,
      });

      const dragConfig = app?.getPlugin<DragService>('drag')?.getConfig();
      dragConfig?.onEventDrop?.(updatedEvent, originalEvent);

      onEventsUpdate?.(
        prev =>
          prev.map(event => (event.id === drag.eventId ? updatedEvent : event)),
        false,
        'drag'
      );
    }

    removeDocumentDragListeners(
      handleUniversalDragMove,
      handleUniversalDragEnd
    );
    removeDragIndicator();
    resetDragState();
  }, [
    handleUniversalDragMove,
    removeDragIndicator,
    resetDragState,
    onEventsUpdate,
    MIN_DURATION,
    dragRef,
  ]);

  // Drag move handler - complete version
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const drag = dragRef.current as typeof dragRef.current & InternalDragRef;
      if (!drag || (!drag.active && !drag.pendingMove)) return;

      const readOnlyConfig = app?.getReadOnlyConfig();
      const isDraggable = readOnlyConfig?.draggable !== false;
      const isEditable = !app?.state.readOnly;

      if (drag.mode === 'move' && !isDraggable) return;
      if ((drag.mode === 'resize' || drag.mode === 'create') && !isEditable)
        return;

      // Prevent scrolling on touch devices
      if (e.cancelable) {
        e.preventDefault();
        e.stopPropagation();
      }

      const { clientX, clientY } = getClientCoordinates(e);

      if (!drag || (!drag.active && !drag.pendingMove)) return;

      // Set cursor based on drag mode and direction
      if (drag.mode === 'resize') {
        applyGlobalDragCursor(
          'resize',
          isDateGridView || drag.allDay ? 'ew-resize' : 'ns-resize'
        );
      } else {
        applyGlobalDragCursor(
          drag.mode === 'create' ? 'create' : 'move',
          'grabbing'
        );
      }

      if (isDateGridView) {
        // Month view drag logic
        if (drag.mode !== 'resize') {
          if (drag.mode === 'move') {
            if (drag.pendingMove) {
              if (
                !shouldActivateDateGridMove({
                  clientX,
                  clientY,
                  startX: drag.startX,
                  startY: drag.startY,
                })
              ) {
                return;
              }

              drag.pendingMove = false;
              drag.active = true;

              setDragState({
                active: true,
                mode: 'move',
                eventId: drag.eventId,
                targetDate: drag.targetDate ?? null,
                startDate: drag.originalStartDate ?? null,
                endDate: drag.originalEndDate ?? null,
              });
            }

            if (
              !drag.indicatorVisible &&
              shouldActivateDateGridMove({
                clientX,
                clientY,
                startX: drag.startX,
                startY: drag.startY,
              })
            ) {
              createDragIndicator(
                drag,
                drag.originalEvent?.calendarId,
                drag.originalEvent?.title,
                null,
                drag.sourceElement || undefined
              );
              drag.indicatorVisible = true;
            }
          }

          if (drag.indicatorVisible) {
            updateDragIndicator(clientX, clientY);
          }
        }

        latestDateGridPointerRef.current = { clientX, clientY };
        if (dateGridPreviewFrameRef.current === null) {
          dateGridPreviewFrameRef.current = setTimeout(() => {
            dateGridPreviewFrameRef.current = null;
            const latestPointer = latestDateGridPointerRef.current;
            if (!latestPointer) return;
            applyDateGridPreview(latestPointer.clientX, latestPointer.clientY);
          }, 0) as unknown as number;
        }

        return;
      }

      // Week/Day view drag logic
      if (!drag.allDay) {
        handleDirectScroll(clientY);
      }
      drag.lastClientY = clientY;
      const mouseHour = pixelYToHour(clientY);

      // Handle All-Day Create Drag
      if (drag.mode === 'create' && drag.allDay) {
        const { distance, newDayIndex } = buildAllDayCreateMovePreview({
          clientX,
          clientY,
          drag,
          getColumnDayIndex,
          isDayView,
        });

        if (!drag.indicatorVisible) {
          if (distance < 3) return;
          createDragIndicator(drag, 'blue', t('newAllDayEvent'));
          drag.indicatorVisible = true;
        }

        drag.dayIndex = newDayIndex;

        updateDragIndicator(newDayIndex, 0, 0, true);
        return;
      }

      if (drag.mode === 'resize') {
        if (drag.allDay) {
          // All-day event horizontal resize (by day)
          const targetDayIndex = isDayView
            ? drag.dayIndex
            : getColumnDayIndex(clientX);
          const { newStartDate, newEndDate } = buildAllDayResizePreview({
            currentWeekStart,
            drag,
            getDateByDayIndex,
            targetDayIndex,
          });

          drag.originalStartDate = new Date(newStartDate.getTime());
          drag.originalEndDate = new Date(newEndDate.getTime());

          // Update event
          const newStartTemporal = dateToPlainDate(newStartDate);
          const newEndTemporal = dateToPlainDate(newEndDate);

          throttledSetEvents(
            (prev: Event[]) =>
              prev.map(event => {
                if (event.id !== drag.eventId) return event;

                return {
                  ...event,
                  start: newStartTemporal,
                  end: newEndTemporal,
                  allDay: true,
                };
              }),
            drag.mode
          );
        } else {
          // Regular event resize (supports multi-day)
          const currentEvent = events?.find(
            target => target.id === drag.eventId
          );
          if (!currentEvent) return;

          if (!isDayView) {
            const originalEvent = drag.originalEvent || currentEvent;
            const targetDayIndex = getColumnDayIndex(clientX);
            const {
              indicatorEndHour,
              indicatorStartHour,
              newEndDate,
              newStartDate,
              startDayIndex,
            } = buildCrossDayTimedResizePreview({
              currentWeekStart,
              drag: {
                ...drag,
                dayIndex: targetDayIndex,
              },
              firstHour: FIRST_HOUR,
              getDateByDayIndex,
              getDayIndexForDate,
              getEventDateForEditing,
              lastHour: LAST_HOUR,
              mouseHour,
              originalEvent,
              roundToTimeStep,
              timeStepMs: TIME_STEP_MS,
            });

            drag.originalStartDate = new Date(newStartDate.getTime());
            drag.originalEndDate = new Date(newEndDate.getTime());
            drag.startHour = indicatorStartHour;
            drag.endHour = indicatorEndHour;
            drag.dayIndex = startDayIndex;

            throttledSetEvents(
              (prev: Event[]) =>
                prev.map(event => {
                  if (event.id !== drag.eventId) return event;

                  return {
                    ...event,
                    start: dateToZonedDateTime(newStartDate, getAppTimeZone()),
                    end: dateToZonedDateTime(newEndDate, getAppTimeZone()),
                    day: startDayIndex,
                  };
                }),
              drag.mode
            );

            updateDragIndicator(
              drag.dayIndex,
              indicatorStartHour,
              indicatorEndHour,
              false
            );
            return;
          }

          const { endDayIndex, newEndHour, newStartHour, startDayIndex } =
            buildSingleDayTimedResizePreview({
              currentEvent,
              drag,
              firstHour: FIRST_HOUR,
              getEffectiveDaySpan,
              lastHour: LAST_HOUR,
              mouseHour,
              timeStep: TIME_STEP,
            });

          const [roundedStart, roundedEnd] = [
            roundToTimeStep(newStartHour),
            roundToTimeStep(newEndHour),
          ];
          drag.startHour = newStartHour;
          drag.endHour = newEndHour;
          drag.dayIndex = startDayIndex;

          throttledSetEvents(
            (prev: Event[]) =>
              prev.map(event => {
                if (event.id !== drag.eventId) return event;

                const { newEndDate, newStartDate, updatedEvent } =
                  buildSingleDayTimedResizeEventUpdate({
                    appTimeZone,
                    currentWeekStart,
                    endDayIndex,
                    event,
                    getDateByDayIndex,
                    roundedEnd,
                    roundedStart,
                    startDayIndex,
                  });

                drag.originalStartDate = new Date(newStartDate.getTime());
                drag.originalEndDate = new Date(newEndDate.getTime());

                return updatedEvent;
              }),
            drag.mode
          );

          updateDragIndicator(drag.dayIndex, roundedStart, roundedEnd, false);
        }
      } else if (drag.mode === 'create') {
        const { endHour, startHour } = buildTimedCreatePreview({
          clientY,
          drag,
          firstHour: FIRST_HOUR,
          isMobile: !!options.isMobile,
          lastHour: LAST_HOUR,
          mouseHour,
          roundToTimeStep,
          timeStep: TIME_STEP,
        });
        drag.startHour = startHour;
        drag.endHour = endHour;

        // Remove setDragState, only update at drag end

        const newEventLayout = calculateNewEventLayout?.(
          drag.dayIndex,
          drag.startHour,
          drag.endHour
        );
        updateDragIndicator(
          drag.dayIndex,
          drag.startHour,
          drag.endHour,
          false,
          newEventLayout
        );
      } else if (drag.mode === 'move') {
        const {
          dayIndex: newDayIndex,
          endHour: newEndHour,
          startHour: newStartHour,
        } = buildTimedMovePreview({
          clientX,
          drag,
          firstHour: FIRST_HOUR,
          getColumnDayIndex,
          isDayView,
          lastHour: LAST_HOUR,
          mouseHour,
          roundToTimeStep,
        });
        drag.dayIndex = newDayIndex;
        drag.startHour = newStartHour;
        drag.endHour = newEndHour;

        // Remove setDragState, only update at drag end

        // Calculate layout and update drag indicator
        const dragLayout = buildWeekDayDragLayout({
          calculateDragLayout,
          dayIndex: newDayIndex,
          endHour: newEndHour,
          eventId: drag.eventId,
          events,
          roundToTimeStep,
          startHour: newStartHour,
        });
        updateDragIndicator(
          newDayIndex,
          roundToTimeStep(newStartHour),
          roundToTimeStep(newEndHour),
          false,
          dragLayout
        );
      }
    },
    [
      isDateGridView,
      isDayView,
      updateDragIndicator,
      getTargetDateFromPosition,
      throttledSetEvents,
      daysDifference,
      addDaysToDate,
      FIRST_HOUR,
      LAST_HOUR,
      calculateNewEventLayout,
      getColumnDayIndex,
      pixelYToHour,
      handleDirectScroll,
      calculateDragLayout,
      events,
      dragRef,
      createDragIndicator,
    ]
  );

  // Drag end handler - complete version
  const handleDragEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const drag = dragRef.current as typeof dragRef.current & InternalDragRef;
      if (!drag || (!drag.active && !drag.pendingMove)) return;

      const readOnlyConfig = app?.getReadOnlyConfig();
      const isDraggable = readOnlyConfig?.draggable !== false;
      const isEditable = !app?.state.readOnly;

      if (drag.mode === 'move' && !isDraggable) return;
      if ((drag.mode === 'resize' || drag.mode === 'create') && !isEditable)
        return;

      clearGlobalDragCursor();

      // If dragging but threshold not met (indicator not visible), treat as click/cancel
      if (
        (drag.mode === 'move' || drag.mode === 'create') &&
        !drag.indicatorVisible
      ) {
        removeDocumentDragListeners(handleDragMove, handleDragEnd);
        resetDragState();
        return;
      }

      const { clientX, clientY } = getClientCoordinates(e);

      if (!drag || (!drag.active && !drag.pendingMove)) return;

      if (isDateGridView) {
        cancelScheduledDateGridPreview();
        applyDateGridPreview(clientX, clientY);
        const dateGridDropResult = buildDateGridDropResult({
          appTimeZone,
          canonicalizeEditedEvent,
          clientX,
          clientY,
          drag,
          events,
          getTargetDateFromPosition,
        });

        if (
          dateGridDropResult &&
          (dateGridDropResult.kind === 'resize' ||
            dateGridDropResult.kind === 'move')
        ) {
          setDragState(prev => {
            if ('targetDate' in prev) {
              return {
                ...prev,
                targetDate: dateGridDropResult.startDate,
                startDate: dateGridDropResult.startDate,
                endDate: dateGridDropResult.endDate,
              } as MonthDragState;
            }
            return prev;
          });

          const dragConfig = app?.getPlugin<DragService>('drag')?.getConfig();
          if (dateGridDropResult.kind === 'resize') {
            dragConfig?.onEventResize?.(
              dateGridDropResult.updatedEvent,
              dateGridDropResult.originalEvent
            );
          } else {
            dragConfig?.onEventDrop?.(
              dateGridDropResult.updatedEvent,
              dateGridDropResult.originalEvent
            );
          }

          onEventsUpdate?.(
            prev =>
              prev.map(event =>
                event.id === drag.eventId
                  ? dateGridDropResult.updatedEvent
                  : event
              ),
            false,
            dateGridDropResult.kind === 'resize' ? 'resize' : 'drag'
          );
        } else if (dateGridDropResult?.kind === 'restore') {
          onEventsUpdate?.(
            prev =>
              prev.map(event =>
                event.id === drag.eventId
                  ? dateGridDropResult.originalEvent
                  : event
              ),
            false,
            'drag'
          );
        }
      } else {
        // Week/Day view drag end logic
        const { finalEndHour, finalStartHour } = finalizeWeekDayDragHours({
          drag,
          getEffectiveDaySpan,
          minDuration: MIN_DURATION,
          roundToTimeStep,
        });

        if (drag.mode === 'create') {
          // Update state at drag end (Week/Day view)
          setDragState(prev => {
            if ('dayIndex' in prev) {
              return {
                ...prev,
                dayIndex: drag.dayIndex,
                startHour: finalStartHour,
                endHour: finalEndHour,
              } as WeekDayDragState;
            }
            return prev;
          });

          const writableCalendar = app
            ?.getCalendarRegistry()
            ?.getDefaultWritableCalendar();
          if (!writableCalendar) return;
          onEventCreate?.(
            buildWeekDayCreateEvent({
              appTimeZone,
              currentWeekStart,
              drag,
              finalEndHour,
              finalStartHour,
              getDateByDayIndex,
              title: drag.allDay ? t('newAllDayEvent') : t('newEvent'),
              writableCalendarId: writableCalendar.id,
            })
          );
        } else if (drag.mode === 'move' || drag.mode === 'resize') {
          // Update state at drag end (Week/Day view)
          setDragState(prev => {
            if ('dayIndex' in prev) {
              return {
                ...prev,
                dayIndex: drag.dayIndex,
                startHour: finalStartHour,
                endHour: finalEndHour,
              } as WeekDayDragState;
            }
            return prev;
          });

          const originalEventWeekDay =
            drag.originalEvent ||
            events?.find(eventItem => eventItem.id === drag.eventId);
          const weekDayDropMode = drag.mode;

          // Precompute updatedEvent to fire onEventDrop/onEventResize callback
          let updatedEventWeekDay: Event | undefined;
          if (
            originalEventWeekDay &&
            (weekDayDropMode === 'move' || weekDayDropMode === 'resize')
          ) {
            updatedEventWeekDay = buildWeekDayDropEvent({
              appTimeZone,
              canonicalizeEditedEvent,
              currentWeekStart,
              drag: {
                ...drag,
                mode: weekDayDropMode,
              },
              finalEndHour,
              finalStartHour,
              getDateByDayIndex,
              originalEvent: originalEventWeekDay,
            });

            const dragConfig = app?.getPlugin<DragService>('drag')?.getConfig();
            if (drag.mode === 'move') {
              dragConfig?.onEventDrop?.(
                updatedEventWeekDay,
                originalEventWeekDay
              );
            } else {
              dragConfig?.onEventResize?.(
                updatedEventWeekDay,
                originalEventWeekDay
              );
            }
          }

          const dragSource = drag.mode === 'move' ? 'drag' : 'resize';

          // For move and resize operations, we need to finalize the changes in the store
          onEventsUpdate?.(
            prev =>
              prev.map(event => {
                if (event.id !== drag.eventId) return event;
                return updatedEventWeekDay ?? event;
              }),
            false,
            dragSource
          );
        }
      }

      removeDocumentDragListeners(handleDragMove, handleDragEnd);
      clearGlobalDragCursor();
      removeDragIndicator();
      drag.indicatorVisible = false;
      drag.sourceElement = null;
      resetDragState();
    },
    [
      isDateGridView,
      applyDateGridPreview,
      cancelScheduledDateGridPreview,
      handleDragMove,
      removeDragIndicator,
      resetDragState,
      getTargetDateFromPosition,
      throttledSetEvents,
      MIN_DURATION,
      currentWeekStart,
      onEventCreate,
      onEventsUpdate,
      dragRef,
      setDragState,
    ]
  );

  // Create event start - complete version
  const handleCreateStart = useCallback(
    (e: MouseEvent | TouchEvent, ...args: (Date | number)[]) => {
      if (app?.state.readOnly) return; // Non-editable if readOnly exists
      if (!app?.getCalendarRegistry()?.getDefaultWritableCalendar()) return; // All calendars are read-only

      // Prevent scrolling on touch devices
      if ('cancelable' in e && e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      if (dragRef.current?.active) return;

      const { clientX, clientY } = getClientCoordinates(e);

      if (isDateGridView) {
        // Month view create event
        const [targetDate] = args as [Date];
        const newEvent = buildDateGridCreateEvent({
          appTimeZone,
          calendarId:
            app?.getCalendarRegistry()?.getDefaultWritableCalendar()?.id ??
            'blue',
          targetDate,
          title: t('newEvent'),
        });

        onEventCreate?.(newEvent);

        if (onEventEdit) {
          setTimeout(() => {
            onEventEdit(newEvent);
          }, 50);
        }
      } else {
        // Week/Day view create event
        const [dayIndex, startHour] = args as [number, number];
        const drag = dragRef.current as typeof dragRef.current &
          InternalDragRef;
        if (!drag) return;
        const { dragState: weekDayDragState, dragUpdates } =
          buildWeekDayCreateStartData({
            clientX,
            clientY,
            currentWeekStart,
            dayIndex,
            getDateByDayIndex,
            isMobile: !!options.isMobile,
            roundToTimeStep,
            startHour,
            timeStep: TIME_STEP,
          });

        Object.assign(drag, dragUpdates);
        setDragState(weekDayDragState);

        const newEventLayout = calculateNewEventLayout?.(
          dayIndex,
          drag.startHour,
          drag.endHour
        );
        const writableCalId =
          app?.getCalendarRegistry()?.getDefaultWritableCalendar()?.id ??
          'blue';
        createDragIndicator(drag, writableCalId, t('newEvent'), newEventLayout);
        drag.sourceElement = null;
        drag.indicatorVisible = true;
        addDocumentDragListeners(handleDragMove, handleDragEnd);
      }
    },
    [
      isDateGridView,
      onEventCreate,
      onEventEdit,
      currentWeekStart,
      calculateNewEventLayout,
      createDragIndicator,
      handleDragMove,
      handleDragEnd,
      dragRef,
      setDragState,
    ]
  );

  // Move event start - complete version
  const handleMoveStart = useCallback(
    (e: MouseEvent | TouchEvent, event: Event) => {
      // Prevent scrolling on touch devices
      if (
        'cancelable' in e &&
        e.cancelable &&
        ('touches' in e || 'changedTouches' in e)
      ) {
        e.preventDefault();
      }
      e.stopPropagation();
      if (dragRef.current?.active) return;

      const { clientX, clientY } = getClientCoordinates(e);

      const drag = dragRef.current as typeof dragRef.current & InternalDragRef;
      if (!drag) return;
      const sourceElement = resolveDragSourceElement(
        e.currentTarget as HTMLElement | null
      );
      const sourceRect = sourceElement.getBoundingClientRect();

      if (isDateGridView) {
        // Month view move start
        const eventStartDate = event.allDay
          ? temporalToDate(event.start)
          : getEventDateForEditing(event.start);
        const eventEndDate = temporalToDate(event.end);

        // Calculate event day span
        let eventDurationDays = 1;
        if (event.allDay && event.start && event.end) {
          eventDurationDays = getAllDayEventDurationDays(
            eventStartDate,
            eventEndDate,
            true
          );
        }

        const grabDate = getTargetDateFromPosition(clientX, clientY);
        const normalizedEventStart = new Date(eventStartDate);
        normalizedEventStart.setHours(0, 0, 0, 0);
        const grabDayOffset = grabDate
          ? Math.max(0, daysDifference(normalizedEventStart, grabDate))
          : 0;

        const {
          currentDragOffset,
          dragState: monthDragState,
          dragUpdates,
        } = buildDateGridMoveStartData({
          clientX,
          clientY,
          event,
          eventDurationDays,
          eventEndDate,
          eventStartDate,
          grabDayOffset,
          isTouchLike: isTouchLikeEvent(e),
          sourceElement,
          sourceRect,
        });

        currentDragRef.current = currentDragOffset;
        Object.assign(drag, dragUpdates);

        if (drag.active) {
          setDragState(monthDragState);
        }

        drag.sourceElement = sourceElement;
        drag.indicatorVisible = false;

        buildDateCellCache();
        addDocumentDragListeners(handleDragMove, handleDragEnd);
      } else {
        // Week/Day view move start
        const mouseHour = pixelYToHour(clientY);
        const editingHours = getTimedEventHoursForEditing(event);
        const { dragState: weekDayDragState, dragUpdates } =
          buildWeekDayMoveStartData({
            allDayRowElement: allDayRowRef?.current ?? null,
            clientX,
            clientY,
            editingHours,
            event,
            mouseHour,
            sourceElement,
            sourceRect,
          });

        Object.assign(drag, dragUpdates);
        setDragState(weekDayDragState);

        drag.sourceElement = sourceElement;
        drag.indicatorVisible = false;

        // Week/Day view uses cross-region drag support
        addDocumentDragListeners(
          handleUniversalDragMove,
          handleUniversalDragEnd
        );
      }
    },
    [
      isDateGridView,
      createDragIndicator,
      handleDragEnd,
      handleDragMove,
      handleUniversalDragMove,
      handleUniversalDragEnd,
      pixelYToHour,
      dragRef,
      currentDragRef,
      setDragState,
      allDayRowRef,
      buildDateCellCache,
    ]
  );

  // Resize start - complete version
  const handleResizeStart = useCallback(
    (e: MouseEvent | TouchEvent, event: Event, direction: string) => {
      if (app?.state.readOnly) return;

      // Prevent scrolling on touch devices
      if ('cancelable' in e && e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      if (dragRef.current?.active) return;

      const { clientX, clientY } = getClientCoordinates(e);

      const drag = dragRef.current as typeof dragRef.current & InternalDragRef;
      if (!drag) return;

      if (isDateGridView) {
        // Month view resize start
        const originalDate = temporalToDate(event.start);
        const initialStartDate = temporalToDate(event.start);
        const initialEndDate = temporalToDate(event.end);
        const originalStartTime = {
          hour: initialStartDate.getHours(),
          minute: initialStartDate.getMinutes(),
          second: initialStartDate.getSeconds(),
        };
        const originalEndTime = {
          hour: initialEndDate.getHours(),
          minute: initialEndDate.getMinutes(),
          second: initialEndDate.getSeconds(),
        };

        drag.active = true;
        drag.mode = 'resize';
        drag.eventId = event.id;
        drag.startX = clientX;
        drag.startY = clientY;
        drag.targetDate =
          direction === 'left' ? initialStartDate : initialEndDate;
        drag.originalDate = originalDate;
        drag.originalEvent = { ...event };
        drag.lastUpdateTime = Date.now();
        drag.resizeDirection = direction as 'left' | 'right';
        drag.originalStartDate = initialStartDate;
        drag.originalEndDate = initialEndDate;
        drag.originalStartTime = originalStartTime;
        drag.originalEndTime = originalEndTime;

        buildDateCellCache();
        setDragState({
          active: true,
          mode: 'resize',
          eventId: event.id,
          targetDate: direction === 'left' ? initialStartDate : initialEndDate,
          startDate: initialStartDate,
          endDate: initialEndDate,
        });
      } else if (event.allDay) {
        const { dragState: weekDayDragState, dragUpdates } =
          buildWeekDayResizeStartData({
            clientX,
            clientY,
            direction,
            editingHours: getTimedEventHoursForEditing(event),
            event,
            mouseHour: 0,
          });

        Object.assign(drag, dragUpdates);
        setDragState(weekDayDragState);
      } else {
        // Regular event resize (vertical by hour)
        const mouseHour = pixelYToHour(clientY);
        const editingHours = getTimedEventHoursForEditing(event);
        const { dragState: weekDayDragState, dragUpdates } =
          buildWeekDayResizeStartData({
            clientX,
            clientY,
            direction,
            editingHours,
            event,
            mouseHour,
          });

        Object.assign(drag, dragUpdates);
        setDragState(weekDayDragState);
      }

      addDocumentDragListeners(handleDragMove, handleDragEnd);
    },
    [
      isDateGridView,
      handleDragMove,
      handleDragEnd,
      pixelYToHour,
      dragRef,
      setDragState,
      buildDateCellCache,
    ]
  );

  return {
    handleDragMove,
    handleDragEnd,
    handleCreateStart,
    handleMoveStart,
    handleResizeStart,
    handleUniversalDragMove,
    handleUniversalDragEnd,
  };
};
