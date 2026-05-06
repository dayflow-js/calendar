// oxlint-disable typescript/no-explicit-any
import {
  MonthDragState,
  UnifiedDragRef,
  useDragProps,
  ViewType,
  WeekDayDragState,
  UseDragStateReturn,
  Event as CalendarEvent,
} from '@dayflow/core';
import { throttle } from '@drag/utils/throttle';
import { useRef, useCallback, useState, useMemo } from 'preact/hooks';

type InternalDragRef = UnifiedDragRef & { pendingMove?: boolean };

export const useDragState = (options: useDragProps): UseDragStateReturn => {
  const { viewType, onEventsUpdate } = options;

  const isDateGridView =
    viewType === ViewType.MONTH || viewType === ViewType.YEAR;

  // Drag reference
  const dragRef = useRef<UnifiedDragRef>({
    active: false,
    mode: null,
    eventId: null,
    startX: 0,
    startY: 0,
    dayIndex: 0,
    startHour: 0,
    endHour: 0,
    originalDay: 0,
    originalStartHour: 0,
    originalEndHour: 0,
    resizeDirection: null,
    hourOffset: null,
    duration: 0,
    lastRawMouseHour: null,
    lastUpdateTime: 0,
    initialMouseY: 0,
    lastClientY: 0,
    allDay: false,
    // Month view specific
    targetDate: null,
    originalDate: null,
    originalEvent: null,
    dragOffset: 0,
    dragOffsetY: 0,
    originalStartDate: null,
    originalEndDate: null,
    eventDate: undefined,
    originalStartTime: null,
    originalEndTime: null,
    sourceElement: null,
    indicatorVisible: false,
  } as InternalDragRef);

  const currentDragRef = useRef({ x: 0, y: 0 });

  // Initial drag state
  const initialDragState = useMemo(
    () =>
      isDateGridView
        ? ({
            active: false,
            mode: null,
            eventId: null,
            targetDate: null,
            startDate: null,
            endDate: null,
          } as MonthDragState)
        : ({
            active: false,
            mode: null,
            eventId: null,
            dayIndex: 0,
            startHour: 0,
            endHour: 0,
            allDay: false,
          } as WeekDayDragState),
    [isDateGridView]
  );

  const [dragState, setDragState] = useState<MonthDragState | WeekDayDragState>(
    initialDragState
  );

  const throttledSetEventsByMode = useMemo(() => {
    const createThrottledUpdater = (wait: number) =>
      throttle(
        ((
          updateFunc: (events: CalendarEvent[]) => CalendarEvent[],
          interactionType?: string
        ) => onEventsUpdate(updateFunc, interactionType === 'resize')) as any,
        wait
      );

    if (isDateGridView) {
      const shared = createThrottledUpdater(16);
      return {
        default: shared,
        move: shared,
        resize: shared,
        create: shared,
      };
    }

    return {
      default: createThrottledUpdater(16),
      move: createThrottledUpdater(16),
      create: createThrottledUpdater(16),
      resize: createThrottledUpdater(16),
    };
  }, [isDateGridView, onEventsUpdate]);

  const throttledSetEvents = useCallback(
    (
      updateFunc: (events: CalendarEvent[]) => CalendarEvent[],
      interactionType?: string
    ) => {
      const throttledUpdater =
        throttledSetEventsByMode[
          interactionType as keyof typeof throttledSetEventsByMode
        ] ?? throttledSetEventsByMode.default;
      throttledUpdater(updateFunc, interactionType);
    },
    [throttledSetEventsByMode]
  );

  // Reset state
  const resetDragState = useCallback(() => {
    throttledSetEventsByMode.default.cancel();
    throttledSetEventsByMode.move.cancel();
    throttledSetEventsByMode.resize.cancel();
    throttledSetEventsByMode.create.cancel();

    if (isDateGridView) {
      setDragState({
        active: false,
        mode: null,
        eventId: null,
        targetDate: null,
        startDate: null,
        endDate: null,
      });
    } else {
      setDragState({
        active: false,
        mode: null,
        eventId: null,
        dayIndex: 0,
        startHour: 0,
        endHour: 0,
        allDay: false,
      });
    }

    dragRef.current = {
      active: false,
      mode: null,
      eventId: null,
      startX: 0,
      startY: 0,
      dayIndex: 0,
      startHour: 0,
      endHour: 0,
      originalDay: 0,
      originalStartHour: 0,
      originalEndHour: 0,
      duration: 0,
      resizeDirection: null,
      hourOffset: null,
      lastRawMouseHour: null,
      lastUpdateTime: 0,
      initialMouseY: 0,
      lastClientY: 0,
      allDay: false,
      targetDate: null,
      originalDate: null,
      originalEvent: null,
      dragOffset: 0,
      dragOffsetY: 0,
      originalStartDate: null,
      originalEndDate: null,
      eventDate: undefined,
      originalStartTime: null,
      originalEndTime: null,
      sourceElement: null,
      indicatorVisible: false,
      initialIndicatorLeft: undefined,
      initialIndicatorTop: undefined,
      initialIndicatorWidth: undefined,
      initialIndicatorHeight: undefined,
      indicatorContainer: null,
    } as InternalDragRef;
  }, [isDateGridView, throttledSetEventsByMode]);

  return {
    dragRef,
    currentDragRef,
    dragState,
    setDragState,
    resetDragState,
    throttledSetEvents,
  };
};
