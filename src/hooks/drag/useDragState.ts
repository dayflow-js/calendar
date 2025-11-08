import { useRef, useCallback, useState, useMemo } from 'react';
import { throttle } from '@/utils/throttle';
import {
  MonthDragState,
  UnifiedDragRef,
  useDragProps,
  ViewType,
  WeekDayDragState,
  UseDragStateReturn,
} from '@/types';

export const useDragState = (options: useDragProps): UseDragStateReturn => {
  const { viewType, onEventsUpdate } = options;

  const isMonthView = viewType === ViewType.MONTH;

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
    originalStartDate: null,
    originalEndDate: null,
    eventDate: undefined,
    originalStartTime: null,
    originalEndTime: null,
    sourceElement: null,
    indicatorVisible: false,
  });

  const currentDragRef = useRef({ x: 0, y: 0 });

  // Initial drag state
  const initialDragState = useMemo(
    () =>
      isMonthView
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
    [isMonthView]
  );

  const [dragState, setDragState] = useState<MonthDragState | WeekDayDragState>(
    initialDragState
  );

  const throttledSetEvents = useMemo(
    () =>
      throttle(
        (updateFunc, dragState?: string) =>
          onEventsUpdate(updateFunc, dragState === 'resize'),
        isMonthView ? 16 : 8
      ),
    [isMonthView, onEventsUpdate]
  );

  // Reset state
  const resetDragState = useCallback(() => {
    if (isMonthView) {
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
      originalStartDate: null,
      originalEndDate: null,
      eventDate: undefined,
      originalStartTime: null,
      originalEndTime: null,
      sourceElement: null,
      indicatorVisible: false,
    };
  }, [isMonthView]);

  return {
    dragRef,
    currentDragRef,
    dragState,
    setDragState,
    resetDragState,
    throttledSetEvents,
  };
};
