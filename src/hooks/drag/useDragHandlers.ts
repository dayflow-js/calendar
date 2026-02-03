import { useCallback } from 'react';
import {
  EventLayout,
  Event,
  MonthDragState,
  ViewType,
  WeekDayDragState,
  UseDragHandlersReturn,
  UseDragHandlersParams,
} from '../../types';
import { roundToTimeStep, TIME_STEP, getDateByDayIndex } from '../../utils';
import {
  extractHourFromDate,
  createDateWithHour,
  getEndOfDay,
  getEventEndHour,
} from '../../utils/helpers';
import { useLocale } from '@/locale';
import { Temporal } from 'temporal-polyfill';
import {
  temporalToDate,
  dateToZonedDateTime,
  dateToPlainDate,
} from '../../utils/temporal';

// Helper function to get client coordinates from Mouse or Touch events
const getClientCoordinates = (
  e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent
) => {
  let clientX, clientY;
  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if ('changedTouches' in e && e.changedTouches.length > 0) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else {
    clientX = (e as MouseEvent).clientX;
    clientY = (e as MouseEvent).clientY;
  }
  return { clientX, clientY };
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
    FIRST_HOUR = 0,
    LAST_HOUR = 24,
    MIN_DURATION = 0.25,
    app,
  } = options;

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

  const isDateGridView = viewType === ViewType.MONTH || viewType === ViewType.YEAR;
  const isDayView = viewType === ViewType.DAY;

  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const getEffectiveDaySpan = (
    start: Date,
    end: Date,
    isAllDay: boolean = false
  ): number => {
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    let span = Math.floor(
      (endDate.getTime() - startDate.getTime()) / DAY_IN_MS
    );
    if (span <= 0) return 0;

    if (!isAllDay && span === 1) {
      const isMidnightEnd =
        end.getHours() === 0 &&
        end.getMinutes() === 0 &&
        end.getSeconds() === 0 &&
        end.getMilliseconds() === 0;
      const durationMs = end.getTime() - start.getTime();
      if (isMidnightEnd && durationMs < DAY_IN_MS) {
        return 0;
      }
    }

    return span;
  };

  // Cross-region drag move (Week/Day view specific) - complete version
  const handleUniversalDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const readOnlyConfig = app?.getReadOnlyConfig();
      const isDraggable = readOnlyConfig?.draggable !== false;
      const isEditable = !app?.state.readOnly;
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.mode === 'move' && !isDraggable) return;
      if ((drag.mode === 'resize' || drag.mode === 'create') && !isEditable) return;

      // Prevent scrolling on touch devices
      if (e.cancelable) {
        e.preventDefault();
        e.stopPropagation();
      }

      const { clientX, clientY } = getClientCoordinates(e);

      if (!drag || !drag.active) return;

      // Deferred indicator creation for move mode
      if (drag.mode === 'move' && !drag.indicatorVisible) {
        const distance = Math.hypot(
          clientX - drag.startX,
          clientY - drag.startY
        );

        if (distance < 3) return;

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
        if (drag.allDay) {
          // AllDay event resize (horizontal)
          document.body.style.cursor = 'ew-resize';
        } else {
          // Regular event resize (vertical)
          document.body.style.cursor = 'ns-resize';
        }
      } else {
        // Move mode
        document.body.style.cursor = 'grabbing';
      }

      const isInAllDayArea = checkIfInAllDayArea(clientY);
      const newDayIndex = isDayView
        ? drag.dayIndex
        : getColumnDayIndex(clientX);

      if (isInAllDayArea) {
        // Switch to all-day area
        if (!drag.allDay) {
          drag.allDay = true;
          drag.startHour = 0;
          drag.endHour = 0;
          drag.eventDate = currentWeekStart
            ? getDateByDayIndex(currentWeekStart, newDayIndex)
            : new Date();
          removeDragIndicator();
          drag.indicatorVisible = false;
          const event = events?.find(e => e.id === drag.eventId);
          // When switching regions, don't pass source element, use calculation method
          createDragIndicator(drag, event?.calendarId, event?.title);
          drag.sourceElement = null;
          drag.indicatorVisible = true;
        }
        drag.dayIndex = newDayIndex;
        setDragState(prev => ({
          ...prev,
          dayIndex: newDayIndex,
          startHour: 0,
          endHour: 0,
          allDay: true,
        }));
        updateDragIndicator(newDayIndex, 0, 0, true);
      } else {
        // Switch to regular time area
        handleDirectScroll(clientY);
        const mouseHour = pixelYToHour(clientY);

        const startDragDay = drag.startDragDayIndex ?? drag.originalDay;
        const dayOffset = drag.dayIndex - startDragDay;

        if (drag.allDay) {
          // Switch from all-day to regular event
          drag.allDay = false;
          drag.startHour = roundToTimeStep(mouseHour);
          drag.endHour = drag.startHour + 1;
          drag.duration = 1;
          drag.hourOffset = 0;
          drag.eventDate = currentWeekStart
            ? getDateByDayIndex(currentWeekStart, newDayIndex)
            : new Date();
          removeDragIndicator();
          drag.indicatorVisible = false;
          const event = events?.find(e => e.id === drag.eventId);
          // When switching regions, don't pass source element, use calculation method
          createDragIndicator(drag, event?.calendarId, event?.title);
          drag.sourceElement = null;
          drag.indicatorVisible = true;
        } else {
          // Regular event moves within time area
          let newStartHour = roundToTimeStep(
            mouseHour + (drag.hourOffset ?? 0)
          );
          newStartHour = Math.max(
            FIRST_HOUR,
            Math.min(LAST_HOUR - drag.duration, newStartHour)
          );
          drag.startHour = newStartHour;
          drag.endHour = newStartHour + drag.duration;
        }

        drag.dayIndex = newDayIndex;
        drag.eventDate = currentWeekStart
          ? getDateByDayIndex(currentWeekStart, newDayIndex)
          : new Date();

        setDragState(prev => ({
          ...prev,
          dayIndex: newDayIndex,
          startHour: roundToTimeStep(drag.startHour),
          endHour: roundToTimeStep(drag.endHour),
          allDay: false,
        }));

        // Calculate layout
        let dragLayout: EventLayout | null = null;
        if (drag.mode === 'move' && drag.eventId && calculateDragLayout) {
          const draggedEvent = events?.find(e => e.id === drag.eventId);
          if (draggedEvent) {
            dragLayout = calculateDragLayout(
              draggedEvent,
              newDayIndex,
              roundToTimeStep(drag.startHour),
              roundToTimeStep(drag.endHour)
            );
          }
        }
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
      currentWeekStart,
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
    ]
  );

  // Cross-region drag end (Week/Day view specific) - complete version
  const handleUniversalDragEnd = useCallback(() => {
    const drag = dragRef.current;
    if (!drag || !drag.active) return;

    const readOnlyConfig = app?.getReadOnlyConfig();
    const isDraggable = readOnlyConfig?.draggable !== false;
    const isEditable = !app?.state.readOnly;

    if (drag.mode === 'move' && !isDraggable) return;
    if ((drag.mode === 'resize' || drag.mode === 'create') && !isEditable) return;

    document.body.style.cursor = 'default';

    // If dragging but threshold not met (indicator not visible), treat as click/cancel
    if (drag.mode === 'move' && !drag.indicatorVisible) {
      document.removeEventListener('mousemove', handleUniversalDragMove);
      document.removeEventListener('mouseup', handleUniversalDragEnd);
      document.removeEventListener('touchmove', handleUniversalDragMove, { capture: true });
      document.removeEventListener('touchend', handleUniversalDragEnd);
      resetDragState();
      return;
    }

    if (drag.mode !== 'move' || !drag.eventId) return;

    let finalStartHour = drag.startHour;
    let finalEndHour = drag.endHour;

    if (!drag.allDay) {
      finalStartHour = roundToTimeStep(drag.startHour);
      finalEndHour = roundToTimeStep(drag.endHour);
      if (finalEndHour - finalStartHour < MIN_DURATION) {
        finalEndHour = finalStartHour + MIN_DURATION;
      }
    }

    onEventsUpdate?.(prev =>
      prev.map(event => {
        if (event.id !== drag.eventId) return event;

        // Calculate new event date
        const newEventDate = currentWeekStart
          ? getDateByDayIndex(currentWeekStart, drag.dayIndex)
          : temporalToDate(event.start);

        // Calculate day offset during drag
        const startDragDay = drag.startDragDayIndex ?? drag.originalDay;
        const dayOffset = drag.dayIndex - startDragDay;

        // Create start/end based on whether it's an all-day event
        let newStart: Temporal.PlainDate | Temporal.ZonedDateTime;
        let newEnd: Temporal.PlainDate | Temporal.ZonedDateTime;

        if (drag.allDay) {
          const originalStartDate = drag.originalStartDate
            ? new Date(drag.originalStartDate)
            : temporalToDate(event.start);
          originalStartDate.setHours(0, 0, 0, 0);

          const newStartDate = new Date(originalStartDate);
          newStartDate.setDate(newStartDate.getDate() + dayOffset);

          const newEndDate = new Date(newStartDate);
          if (drag.eventDurationDays && drag.eventDurationDays > 0) {
            newEndDate.setDate(
              newEndDate.getDate() + drag.eventDurationDays
            );
          }

          newStart = dateToPlainDate(newStartDate);
          newEnd = dateToPlainDate(getEndOfDay(newEndDate) as Date);
        } else {
          // Get original event start and end time
          const originalStart = temporalToDate(event.start);
          const originalEnd = temporalToDate(event.end);
          const wasAllDay = event.allDay;

          // Check if original event spans multiple days
          const isOriginallyMultiDay =
            getEffectiveDaySpan(
              originalStart,
              originalEnd,
              event.allDay ?? false
            ) > 0;

          if (isOriginallyMultiDay && !wasAllDay) {
            // Multi-day event (originally REGULAR): keep original time and multi-day duration, only change date
            const newStartDate = new Date(originalStart);
            newStartDate.setDate(newStartDate.getDate() + dayOffset);

            const newEndDate = new Date(originalEnd);
            newEndDate.setDate(newEndDate.getDate() + dayOffset);

            newStart = dateToZonedDateTime(newStartDate);
            newEnd = dateToZonedDateTime(newEndDate);
          } else {
            // Single-day event OR Originally All-Day event (regardless of span):
            const newEventDate = currentWeekStart
              ? getDateByDayIndex(currentWeekStart, drag.dayIndex)
              : new Date();

            const startDateObj = createDateWithHour(
              newEventDate,
              finalStartHour
            ) as Date;
            const endDateObj = createDateWithHour(
              newEventDate,
              finalEndHour
            ) as Date;

            newStart = dateToZonedDateTime(startDateObj);
            newEnd = dateToZonedDateTime(endDateObj);
          }
        }

        // Calculate new day (day when event starts)
        const newDay = drag.originalDay + dayOffset;

        return {
          ...event,
          day: newDay,
          start: newStart,
          end: newEnd,
          allDay: drag.allDay,
        };
      })
    );

    document.removeEventListener('mousemove', handleUniversalDragMove);
    document.removeEventListener('mouseup', handleUniversalDragEnd);
    document.removeEventListener('touchmove', handleUniversalDragMove, { capture: true });
    document.removeEventListener('touchend', handleUniversalDragEnd);
    removeDragIndicator();
    resetDragState();
  }, [
    handleUniversalDragMove,
    removeDragIndicator,
    resetDragState,
    onEventsUpdate,
    MIN_DURATION,
    currentWeekStart,
    dragRef,
  ]);

  // Drag move handler - complete version
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const drag = dragRef.current;
      if (!drag || !drag.active) return;

      const readOnlyConfig = app?.getReadOnlyConfig();
      const isDraggable = readOnlyConfig?.draggable !== false;
      const isEditable = !app?.state.readOnly;

      if (drag.mode === 'move' && !isDraggable) return;
      if ((drag.mode === 'resize' || drag.mode === 'create') && !isEditable) return;

      // Prevent scrolling on touch devices
      if (e.cancelable) {
        e.preventDefault();
        e.stopPropagation();
      }

      const { clientX, clientY } = getClientCoordinates(e);

      if (!drag || !drag.active) return;

      // Set cursor based on drag mode and direction
      if (drag.mode === 'resize') {
        if (isDateGridView || drag.allDay) {
          // MonthView or AllDay event resize (horizontal)
          document.body.style.cursor = 'ew-resize';
        } else {
          // Regular event resize in Week/Day view (vertical)
          document.body.style.cursor = 'ns-resize';
        }
      } else {
        // Move or create mode
        document.body.style.cursor = 'grabbing';
      }

      if (isDateGridView) {
        // Month view drag logic
        if (drag.mode !== 'resize') {
          if (drag.mode === 'move') {
            const distance = Math.hypot(
              clientX - drag.startX,
              clientY - drag.startY
            );

            if (!drag.indicatorVisible && distance >= 3) {
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

        const targetDate = getTargetDateFromPosition(clientX, clientY);
        if (!targetDate) return;

        if (
          drag.mode === 'resize' &&
          drag.originalEvent &&
          drag.resizeDirection
        ) {
          // Resize logic
          const originalDate = temporalToDate(drag.originalEvent.start);
          let newStartDate: Date;
          let newEndDate: Date;
          const applyTimeToDate = (
            date: Date,
            timeInfo:
              | { hour: number; minute: number; second: number }
              | null
              | undefined
          ) => {
            if (!date) return;
            if (drag.originalEvent?.allDay) {
              date.setHours(0, 0, 0, 0);
            } else if (timeInfo) {
              date.setHours(
                timeInfo.hour,
                timeInfo.minute,
                timeInfo.second ?? 0,
                0
              );
            }
          };
          const startTimeInfo = drag.originalStartTime;
          const endTimeInfo = drag.originalEndTime;

          if (drag.resizeDirection === 'left') {
            newStartDate = new Date(targetDate);
            applyTimeToDate(newStartDate, startTimeInfo);

            const endBase =
              temporalToDate(drag.originalEvent.end) || originalDate;
            newEndDate = new Date(endBase);
            applyTimeToDate(newEndDate, endTimeInfo);
            if (newStartDate > newEndDate) {
              newStartDate = newEndDate;
            }
          } else {
            const startBase =
              temporalToDate(drag.originalEvent.start) || originalDate;
            newStartDate = new Date(startBase);
            applyTimeToDate(newStartDate, startTimeInfo);

            newEndDate = new Date(targetDate);
            applyTimeToDate(newEndDate, endTimeInfo);
            if (newEndDate < newStartDate) {
              newEndDate = newStartDate;
            }
          }

          drag.originalStartDate = new Date(newStartDate.getTime());
          drag.originalEndDate = new Date(newEndDate.getTime());

          const newStartTemporal = drag.originalEvent.allDay
            ? dateToPlainDate(newStartDate)
            : dateToZonedDateTime(newStartDate);
          const newEndTemporal = drag.originalEvent.allDay
            ? dateToPlainDate(newEndDate)
            : dateToZonedDateTime(newEndDate);

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
            drag.mode
          );
        } else if (drag.mode === 'move') {
          // Move logic
          if (drag.originalStartDate && drag.originalEndDate) {
            // Normalize original start date to midnight to ensure consistent day difference calculation
            const normalizedOriginalStart = new Date(drag.originalStartDate);
            normalizedOriginalStart.setHours(0, 0, 0, 0);

            const dragOffsetDays = daysDifference(
              normalizedOriginalStart,
              targetDate
            );
            const newStartDate = addDaysToDate(
              drag.originalStartDate,
              dragOffsetDays
            );
            const newEndDate = addDaysToDate(
              drag.originalEndDate,
              dragOffsetDays
            );

            const currentStartTime = drag.originalStartDate?.getTime();
            const newStartTime = newStartDate.getTime();

            if (currentStartTime !== newStartTime) {
              drag.originalStartDate = new Date(newStartDate.getTime());
              drag.originalEndDate = new Date(newEndDate.getTime());
              drag.targetDate = newStartDate;
              // Don't update state here, only update ref
            }
          } else {
            if (drag.targetDate?.getTime() !== targetDate.getTime()) {
              drag.targetDate = targetDate;
              // Don't update state here, only update ref
            }
          }
        }
      } else {
        // Week/Day view drag logic
        handleDirectScroll(clientY);
        drag.lastClientY = clientY;
        const mouseHour = pixelYToHour(clientY);

        // Handle All-Day Create Drag
        if (drag.mode === 'create' && drag.allDay) {
          const distance = Math.hypot(
            clientX - drag.startX,
            clientY - drag.startY
          );

          if (!drag.indicatorVisible) {
            if (distance < 3) return;
            createDragIndicator(drag, 'blue', t('newAllDayEvent'));
            drag.indicatorVisible = true;
          }

          // Update day index based on horizontal position
          const newDayIndex = isDayView ? drag.dayIndex : getColumnDayIndex(clientX);
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

            let newStartDate = drag.originalStartDate || new Date();
            let newEndDate = drag.originalEndDate || new Date();

            if (drag.resizeDirection === 'left') {
              // Adjust start date
              const targetDate = currentWeekStart
                ? getDateByDayIndex(currentWeekStart, targetDayIndex)
                : new Date();
              newStartDate = targetDate;

              if (newStartDate > newEndDate) {
                newStartDate = newEndDate;
              }
            } else if (drag.resizeDirection === 'right') {
              // Adjust end date
              const targetDate = currentWeekStart
                ? getDateByDayIndex(currentWeekStart, targetDayIndex)
                : new Date();
              newEndDate = targetDate;

              if (newEndDate < newStartDate) {
                newEndDate = newStartDate;
              }
            }

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
            let newStartHour = drag.startHour;
            let newEndHour = drag.endHour;

            // Calculate actual end day of event (from current event)
            const currentEvent = events?.find(e => e.id === drag.eventId);
            let eventEndDayIndex = drag.dayIndex;
            if (currentEvent) {
              const eventStart = temporalToDate(currentEvent.start);
              const eventEnd = temporalToDate(currentEvent.end);
              const span = getEffectiveDaySpan(
                eventStart,
                eventEnd,
                currentEvent.allDay ?? false
              );
              eventEndDayIndex = (currentEvent.day ?? 0) + span;
            }

            let endDayIndex = eventEndDayIndex;
            let startDayIndex = drag.originalDay;

            if (drag.resizeDirection === 'top') {
              // Support top resize across days
              const targetDayIndex = isDayView
                ? drag.dayIndex
                : getColumnDayIndex(clientX);

              const proposedStartHour = mouseHour + (drag?.hourOffset ?? 0);

              // Check if it spans days (extending forward), but cannot exceed end day
              if (targetDayIndex < eventEndDayIndex) {
                // Can extend forward to target day
                startDayIndex = targetDayIndex;
                newStartHour = Math.max(
                  FIRST_HOUR,
                  Math.min(LAST_HOUR, proposedStartHour)
                );
              } else {
                // On or after end day: limit to end day and handle time adjustment
                startDayIndex = eventEndDayIndex;

                if (proposedStartHour > drag.originalEndHour) {
                  newStartHour = drag.originalEndHour;
                  newEndHour = proposedStartHour;
                  drag.hourOffset = newEndHour - mouseHour;
                } else {
                  newStartHour = Math.max(FIRST_HOUR, proposedStartHour);
                  if (drag.originalEndHour - newStartHour < TIME_STEP) {
                    newStartHour = drag.originalEndHour - TIME_STEP;
                  }
                }
              }
            } else if (drag.resizeDirection === 'bottom') {
              // Support bottom resize across days
              const targetDayIndex = isDayView
                ? drag.dayIndex
                : getColumnDayIndex(clientX);

              const proposedEndHour = mouseHour + (drag?.hourOffset ?? 0);

              // Check if it spans days
              if (targetDayIndex !== drag.dayIndex) {
                endDayIndex = targetDayIndex;
                newEndHour = Math.max(
                  FIRST_HOUR,
                  Math.min(LAST_HOUR, proposedEndHour)
                );
              } else {
                // Resize within same day
                if (proposedEndHour < drag.originalStartHour) {
                  newEndHour = drag.originalStartHour;
                  newStartHour = proposedEndHour;
                  drag.hourOffset = newStartHour - mouseHour;
                } else {
                  newEndHour = Math.min(LAST_HOUR, proposedEndHour);
                  if (newEndHour - drag.startHour < TIME_STEP) {
                    newEndHour = drag.startHour + TIME_STEP;
                  }
                }
              }
            } else if (drag.resizeDirection === 'right') {
              // Support right resize (multi-day regular event)
              const targetDayIndex = isDayView
                ? drag.dayIndex
                : getColumnDayIndex(clientX);
              endDayIndex = Math.max(drag.dayIndex, targetDayIndex);
            }

            // Ensure time range is valid
            if (endDayIndex === startDayIndex) {
              [newStartHour, newEndHour] = [
                Math.max(FIRST_HOUR, Math.min(newStartHour, newEndHour)),
                Math.min(LAST_HOUR, Math.max(newStartHour, newEndHour)),
              ];
            }

            const [roundedStart, roundedEnd] = [
              roundToTimeStep(newStartHour),
              roundToTimeStep(newEndHour),
            ];
            drag.startHour = newStartHour;
            drag.endHour = newEndHour;

            // Update drag.dayIndex to the day when event starts
            drag.dayIndex = startDayIndex;

            // Update event
            throttledSetEvents(
              (prev: Event[]) =>
                prev.map(event => {
                  if (event.id !== drag.eventId) return event;

                  const eventStartDate = temporalToDate(event.start);

                  // Calculate new start and end dates
                  const newStartDate = createDateWithHour(
                    currentWeekStart
                      ? getDateByDayIndex(currentWeekStart, startDayIndex)
                      : eventStartDate,
                    roundedStart
                  ) as Date;

                  const endDate = currentWeekStart
                    ? getDateByDayIndex(currentWeekStart, endDayIndex)
                    : eventStartDate;
                  const newEndDate = createDateWithHour(
                    endDate,
                    roundedEnd
                  ) as Date;

                  const newStart = dateToZonedDateTime(newStartDate);
                  const newEnd = dateToZonedDateTime(newEndDate);

                  return {
                    ...event,
                    start: newStart,
                    end: newEnd,
                    day: startDayIndex,
                  };
                }),
              drag.mode
            );

            // Update drag indicator
            updateDragIndicator(drag.dayIndex, roundedStart, roundedEnd, false);
          }
        } else if (drag.mode === 'create') {
          if (options.isMobile) {
            // Mobile: Move the creation block instead of resizing, centering it under the finger
            const newHour = roundToTimeStep(mouseHour + (drag.hourOffset ?? 0));
            // Ensure within bounds
            const safeStartHour = Math.max(
              FIRST_HOUR,
              Math.min(LAST_HOUR - (drag.duration || 1), newHour)
            );
            drag.startHour = safeStartHour;
            drag.endHour = safeStartHour + (drag.duration || 1);
          } else {
            // Desktop: Resize behavior
            const newHour = roundToTimeStep(mouseHour);
            const [newStartHour, newEndHour] =
              clientY < drag.startY
                ? [newHour, Math.max(newHour + TIME_STEP, drag.endHour)]
                : [drag.startHour, Math.max(drag.startHour + TIME_STEP, newHour)];

            drag.startHour = newStartHour;
            drag.endHour = newEndHour;
          }

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
          const newDayIndex = isDayView
            ? drag.dayIndex
            : getColumnDayIndex(clientX);
          let newStartHour = roundToTimeStep(
            mouseHour + (drag.hourOffset ?? 0)
          );
          newStartHour = Math.max(
            FIRST_HOUR,
            Math.min(LAST_HOUR - drag.duration, newStartHour)
          );

          const newEndHour = newStartHour + drag.duration;
          drag.dayIndex = newDayIndex;
          drag.startHour = newStartHour;
          drag.endHour = newEndHour;

          // Remove setDragState, only update at drag end

          // Calculate layout and update drag indicator
          let dragLayout: EventLayout | null = null;
          if (drag.eventId && calculateDragLayout) {
            const draggedEvent = events?.find(e => e.id === drag.eventId);
            if (draggedEvent) {
              dragLayout = calculateDragLayout(
                draggedEvent,
                newDayIndex,
                roundToTimeStep(newStartHour),
                roundToTimeStep(newEndHour)
              );
            }
          }
          updateDragIndicator(
            newDayIndex,
            roundToTimeStep(newStartHour),
            roundToTimeStep(newEndHour),
            false,
            dragLayout
          );
        }
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
      const drag = dragRef.current;
      if (!drag || !drag.active) return;

      const readOnlyConfig = app?.getReadOnlyConfig();
      const isDraggable = readOnlyConfig?.draggable !== false;
      const isEditable = !app?.state.readOnly;

      if (drag.mode === 'move' && !isDraggable) return;
      if ((drag.mode === 'resize' || drag.mode === 'create') && !isEditable) return;

      document.body.style.cursor = 'default';

      // If dragging but threshold not met (indicator not visible), treat as click/cancel
      if ((drag.mode === 'move' || drag.mode === 'create') && !drag.indicatorVisible) {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDragMove, { capture: true });
        document.removeEventListener('touchend', handleDragEnd);
        resetDragState();
        return;
      }

      const { clientX, clientY } = getClientCoordinates(e);

      if (!drag || !drag.active) return;

      if (isDateGridView) {
        // Month view drag end logic
        if (
          drag.mode === 'resize' &&
          drag.eventId &&
          drag.originalStartDate &&
          drag.originalEndDate
        ) {
          // Update state at drag end (month view)
          setDragState(prev => {
            if ('targetDate' in prev) {
              return {
                ...prev,
                targetDate: drag.originalStartDate,
                startDate: drag.originalStartDate,
                endDate: drag.originalEndDate,
              } as MonthDragState;
            }
            return prev;
          });

          const isAllDay = drag.originalEvent?.allDay || false;
          const newStartTemporal = isAllDay
            ? dateToPlainDate(drag.originalStartDate!)
            : dateToZonedDateTime(drag.originalStartDate!);
          const newEndTemporal = isAllDay
            ? dateToPlainDate(drag.originalEndDate!)
            : dateToZonedDateTime(drag.originalEndDate!);

          throttledSetEvents((prev: Event[]) =>
            prev.map(event =>
              event.id === drag.eventId
                ? {
                  ...event,
                  start: newStartTemporal,
                  end: newEndTemporal,
                  title: event.title,
                }
                : event
            )
          );
        } else if (drag.mode === 'move') {
          if (drag.eventId && drag.originalStartDate && drag.originalEndDate) {
            // Check if the event actually moved
            const originalEventStart = drag.originalEvent?.start
              ? temporalToDate(drag.originalEvent.start)
              : null;

            const hasMoved = originalEventStart && originalEventStart.getTime() !== drag.originalStartDate.getTime();

            if (hasMoved) {
              // Update state at drag end (month view)
              setDragState(prev => {
                if ('targetDate' in prev) {
                  return {
                    ...prev,
                    targetDate: drag.originalStartDate,
                    startDate: drag.originalStartDate,
                    endDate: drag.originalEndDate,
                  } as MonthDragState;
                }
                return prev;
              });

              const isAllDay = drag.originalEvent?.allDay || false;
              const newStartTemporal = isAllDay
                ? dateToPlainDate(drag.originalStartDate!)
                : dateToZonedDateTime(drag.originalStartDate!);
              const newEndTemporal = isAllDay
                ? dateToPlainDate(drag.originalEndDate!)
                : dateToZonedDateTime(drag.originalEndDate!);

              throttledSetEvents((prev: Event[]) =>
                prev.map(event =>
                  event.id === drag.eventId
                    ? {
                      ...event,
                      start: newStartTemporal,
                      end: newEndTemporal,
                      title: event.title,
                    }
                    : event
                )
              );
            }
          } else {
            const finalTargetDate =
              getTargetDateFromPosition(clientX, clientY) ||
              drag.targetDate;
            if (drag.eventId && finalTargetDate) {
              // Update state at drag end (month view)
              setDragState(prev => {
                if ('targetDate' in prev) {
                  return {
                    ...prev,
                    targetDate: finalTargetDate,
                  } as MonthDragState;
                }
                return prev;
              });

              throttledSetEvents((prev: Event[]) =>
                prev.map(event => {
                  if (event.id !== drag.eventId) return event;

                  // Keep event time part, only change date part
                  const eventStartDate = temporalToDate(event.start);
                  const eventEndDate = temporalToDate(event.end);

                  const newStartDate = new Date(finalTargetDate);
                  newStartDate.setHours(
                    eventStartDate.getHours(),
                    eventStartDate.getMinutes(),
                    0,
                    0
                  );

                  const newEndDate = new Date(finalTargetDate);
                  newEndDate.setHours(
                    eventEndDate.getHours(),
                    eventEndDate.getMinutes(),
                    0,
                    0
                  );

                  const newStart = event.allDay
                    ? dateToPlainDate(newStartDate)
                    : dateToZonedDateTime(newStartDate);
                  const newEnd = event.allDay
                    ? dateToPlainDate(newEndDate)
                    : dateToZonedDateTime(newEndDate);

                  return { ...event, start: newStart, end: newEnd };
                })
              );
            }
          }
        }
      } else {
        // Week/Day view drag end logic
        let [finalStartHour, finalEndHour] = [
          roundToTimeStep(drag.startHour),
          roundToTimeStep(drag.endHour),
        ];
        if (finalEndHour - finalStartHour < MIN_DURATION) {
          if (drag.resizeDirection === 'top') {
            finalStartHour = finalEndHour - MIN_DURATION;
          } else {
            finalEndHour = finalStartHour + MIN_DURATION;
          }
        }

        if (drag.mode === 'create') {
          const eventDate = currentWeekStart
            ? getDateByDayIndex(currentWeekStart, drag.dayIndex)
            : new Date();
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

          const startDate = createDateWithHour(
            eventDate,
            finalStartHour
          ) as Date;
          const endDate = createDateWithHour(eventDate, finalEndHour) as Date;

          const isAllDay = drag.allDay;
          const startTemporal = isAllDay
            ? dateToPlainDate(startDate)
            : dateToZonedDateTime(startDate);
          const endTemporal = isAllDay
            ? dateToPlainDate(endDate)
            : dateToZonedDateTime(endDate);

          onEventCreate?.({
            id: String(Date.now()),
            title: isAllDay ? t('newAllDayEvent') : t('newEvent'),
            day: drag.dayIndex,
            start: startTemporal,
            end: endTemporal,
            calendarId: 'blue',
            allDay: isAllDay,
          });
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

          // For all-day event resize and regular event resize, no additional update needed here
          // because it's already updated via throttledSetEvents in handleDragMove
          // Only move operation needs to update day field here
          if (drag.mode === 'move') {
            onEventsUpdate?.(prev =>
              prev.map(event =>
                event.id === drag.eventId
                  ? {
                    ...event,
                    day: drag.dayIndex,
                  }
                  : event
              )
            );
          }
        }
      }

      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove, { capture: true });
      document.removeEventListener('touchend', handleDragEnd);
      removeDragIndicator();
      drag.indicatorVisible = false;
      drag.sourceElement = null;
      resetDragState();
    },
    [
      isDateGridView,
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
    (e: React.MouseEvent | React.TouchEvent, ...args: (Date | number)[]) => {
      if (app?.state.readOnly) return; // Non-editable if readOnly exists

      // Prevent scrolling on touch devices
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      if (dragRef.current?.active) return;

      const { clientX, clientY } = getClientCoordinates(e);

      if (isDateGridView) {
        // Month view create event
        const [targetDate] = args as [Date];
        // Set default time to 9:00-10:00
        const startTime = new Date(targetDate);
        startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(targetDate);
        endTime.setHours(10, 0, 0, 0);

        const startTemporal = dateToZonedDateTime(startTime);
        const endTemporal = dateToZonedDateTime(endTime);

        const newEvent: Event = {
          id: String(Date.now()),
          title: t('newEvent'),
          start: startTemporal,
          end: endTemporal,
          day: targetDate.getDay(),
          calendarId: 'blue',
          allDay: false,
        };

        onEventCreate?.(newEvent);

        if (onEventEdit) {
          setTimeout(() => {
            onEventEdit(newEvent);
          }, 50);
        }
      } else {
        // Week/Day view create event
        const [dayIndex, startHour] = args as [number, number];
        const drag = dragRef.current;
        if (!drag) return;
        const roundedStart = roundToTimeStep(startHour);
        const isMobile = !!options.isMobile;
        const initialDuration = isMobile ? 1 : TIME_STEP * 4;
        const hourOffset = isMobile ? -initialDuration / 2 : 0;
        const adjustedStart = roundToTimeStep(startHour + hourOffset);

        Object.assign(drag, {
          active: true,
          mode: 'create',
          eventId: null,
          startX: clientX,
          startY: clientY,
          dayIndex,
          startHour: adjustedStart,
          endHour: adjustedStart + initialDuration,
          allDay: false,
          eventDate: currentWeekStart
            ? getDateByDayIndex(currentWeekStart, dayIndex)
            : new Date(),
          duration: initialDuration,
          hourOffset: hourOffset,
        });

        setDragState({
          active: true,
          mode: 'create',
          eventId: null,
          dayIndex,
          startHour: drag.startHour,
          endHour: drag.endHour,
          allDay: false,
        });

        const newEventLayout = calculateNewEventLayout?.(
          dayIndex,
          drag.startHour,
          drag.endHour
        );
        createDragIndicator(drag, 'blue', t('newEvent'), newEventLayout);
        drag.sourceElement = null;
        drag.indicatorVisible = true;
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDragMove, { capture: true, passive: false });
        document.addEventListener('touchend', handleDragEnd);
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
    (e: React.MouseEvent | React.TouchEvent, event: Event) => {
      // Prevent scrolling on touch devices
      if (e.cancelable && ('touches' in e || 'changedTouches' in e)) {
        e.preventDefault();
      }
      e.stopPropagation();
      if (dragRef.current?.active) return;

      const { clientX, clientY } = getClientCoordinates(e);

      const drag = dragRef.current;
      if (!drag) return;
      const sourceElement = e.currentTarget as HTMLElement;

      if (isDateGridView) {
        // Month view move start
        currentDragRef.current = {
          x: clientX - sourceElement.getBoundingClientRect().left,
          y: clientY - sourceElement.getBoundingClientRect().top,
        };

        const eventStartDate = temporalToDate(event.start);
        const eventEndDate = temporalToDate(event.end);

        // Calculate event day span
        let eventDurationDays = 1;
        if (event.allDay && event.start && event.end) {
          const startDate = new Date(eventStartDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(eventEndDate);
          endDate.setHours(0, 0, 0, 0);
          eventDurationDays = Math.floor(
            (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) +
            1
          );

          // Ensure AllDay event eventDurationDays is at least 1 day
          eventDurationDays = Math.max(1, eventDurationDays);
        }

        // Read number of days occupied by current segment from DOM element
        const segmentDaysAttr = sourceElement.getAttribute('data-segment-days');
        const currentSegmentDays = segmentDaysAttr
          ? parseInt(segmentDaysAttr, 10)
          : eventDurationDays;

        drag.active = true;
        drag.mode = 'move';
        drag.eventId = event.id;
        drag.startX = clientX;
        drag.startY = clientY;
        drag.targetDate = eventStartDate;
        drag.originalDate = eventStartDate;
        drag.originalEvent = { ...event };
        drag.lastUpdateTime = Date.now();
        drag.originalStartDate = eventStartDate;
        drag.originalEndDate = eventEndDate;
        drag.eventDurationDays = eventDurationDays;
        drag.currentSegmentDays = currentSegmentDays;

        setDragState({
          active: true,
          mode: 'move',
          eventId: event.id,
          targetDate: eventStartDate,
          startDate: eventStartDate,
          endDate: eventEndDate,
        });

        drag.sourceElement = sourceElement;
        drag.indicatorVisible = false;

        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDragMove, { capture: true, passive: false });
        document.addEventListener('touchend', handleDragEnd);
      } else {
        // Week/Day view move start
        const mouseHour = pixelYToHour(clientY);

        // Check if it's a segment of multi-day event
        const segmentInfo = (event as any)._segmentInfo;
        const isSegment = !!segmentInfo;

        // Use segment's day or original event's day
        const currentDayIndex = isSegment
          ? segmentInfo.dayIndex
          : (event.day ?? 0);

        // Use segment's startHour or original event's startHour
        const currentStartHour = isSegment
          ? segmentInfo.startHour
          : extractHourFromDate(event.start);

        // Calculate day span of multi-day event
        let eventDurationDays = 0;
        if (event.allDay && event.start && event.end) {
          const startDate = temporalToDate(event.start);
          startDate.setHours(0, 0, 0, 0);
          const endDate = temporalToDate(event.end);
          endDate.setHours(0, 0, 0, 0);
          eventDurationDays = Math.floor(
            (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
          );
        }

        const eventStartDate = temporalToDate(event.start);

        Object.assign(drag, {
          active: true,
          mode: 'move',
          eventId: event.id,
          startX: clientX,
          startY: clientY,
          dayIndex: currentDayIndex,
          startHour: currentStartHour,
          endHour: isSegment ? segmentInfo.endHour : getEventEndHour(event),
          originalDay: event.day ?? 0,
          originalStartHour: extractHourFromDate(event.start),
          originalEndHour: getEventEndHour(event),
          allDay: event.allDay || false,
          eventDate: eventStartDate,
          eventDurationDays: eventDurationDays, // Save original multi-day count
          startDragDayIndex: currentDayIndex, // Save dayIndex when drag starts
          calendarId: event.calendarId,
          title: event.title,
        });

        if (!event.allDay) {
          // Use segment's startHour when calculating hourOffset
          drag.hourOffset = currentStartHour - mouseHour;

          // When calculating duration, consider multi-day case - always use full event's duration
          const eventStart = temporalToDate(event.start);
          const eventEnd = temporalToDate(event.end);
          const durationInMs = eventEnd.getTime() - eventStart.getTime();
          drag.duration = durationInMs / (1000 * 60 * 60); // Convert to hours
        }

        setDragState({
          active: true,
          mode: 'move',
          eventId: event.id,
          dayIndex: event.day ?? 0,
          startHour: extractHourFromDate(event.start),
          endHour: getEventEndHour(event),
          allDay: event.allDay || false,
        });

        drag.sourceElement = sourceElement;
        drag.indicatorVisible = false;

        // Week/Day view uses cross-region drag support
        document.addEventListener('mousemove', handleUniversalDragMove);
        document.addEventListener('mouseup', handleUniversalDragEnd);
        document.addEventListener('touchmove', handleUniversalDragMove, { capture: true, passive: false });
        document.addEventListener('touchend', handleUniversalDragEnd);
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
    ]
  );

  // Resize start - complete version
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, event: Event, direction: string) => {
      if (app?.state.readOnly) return;

      // Prevent scrolling on touch devices
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      if (dragRef.current?.active) return;

      const { clientX, clientY } = getClientCoordinates(e);

      const drag = dragRef.current;
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

        setDragState({
          active: true,
          mode: 'resize',
          eventId: event.id,
          targetDate: direction === 'left' ? initialStartDate : initialEndDate,
          startDate: initialStartDate,
          endDate: initialEndDate,
        });
      } else {
        // Week/Day view resize start
        if (event.allDay) {
          // All-day event resize (horizontal by day)
          const initialStartDate = temporalToDate(event.start);
          const initialEndDate = temporalToDate(event.end);

          drag.active = true;
          drag.mode = 'resize';
          drag.eventId = event.id;
          drag.startX = clientX;
          drag.startY = clientY;
          drag.allDay = true;
          drag.resizeDirection = direction as 'left' | 'right';
          drag.originalStartDate = initialStartDate;
          drag.originalEndDate = initialEndDate;
          drag.originalEvent = { ...event };
          drag.dayIndex = event.day ?? 0;

          setDragState({
            active: true,
            mode: 'resize',
            eventId: event.id,
            dayIndex: event.day ?? 0,
            startHour: 0,
            endHour: 0,
            allDay: true,
          });
        } else {
          // Regular event resize (vertical by hour)
          const mouseHour = pixelYToHour(clientY);

          Object.assign(drag, {
            active: true,
            mode: 'resize',
            eventId: event.id,
            startX: clientX,
            startY: clientY,
            dayIndex: event.day ?? 0,
            startHour: extractHourFromDate(event.start),
            endHour: getEventEndHour(event),
            originalDay: event.day ?? 0,
            originalStartHour: extractHourFromDate(event.start),
            originalEndHour: getEventEndHour(event),
            resizeDirection: direction,
            lastUpdateTime: Date.now(),
            initialMouseY: mouseHour,
            hourOffset:
              direction === 'top'
                ? extractHourFromDate(event.start) - mouseHour
                : getEventEndHour(event) - mouseHour,
            allDay: false,
          });

          setDragState({
            active: true,
            mode: 'resize',
            eventId: event.id,
            dayIndex: event.day ?? 0,
            startHour: extractHourFromDate(event.start),
            endHour: getEventEndHour(event),
            allDay: false,
          });
        }
      }

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDragMove, { capture: true, passive: false });
      document.addEventListener('touchend', handleDragEnd);
    },
    [
      isDateGridView,
      handleDragMove,
      handleDragEnd,
      pixelYToHour,
      dragRef,
      setDragState,
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