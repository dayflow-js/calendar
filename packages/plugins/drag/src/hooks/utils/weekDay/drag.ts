import {
  Event,
  WeekDayDragState,
  createDateWithHour,
  temporalToDate,
} from '@dayflow/core';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type EditingHours = {
  startDate: Date;
  endDate: Date;
  startHour: number;
  endHour: number;
};

type SegmentInfo = {
  dayIndex: number;
  startHour: number;
  endHour: number;
};

type MoveStartDragUpdates = {
  active: true;
  mode: 'move';
  eventId: string;
  startX: number;
  startY: number;
  dayIndex: number;
  startHour: number;
  endHour: number;
  originalDay: number;
  originalStartHour: number;
  originalEndHour: number;
  allDay: boolean;
  eventDate: Date;
  eventDurationDays: number;
  startDragDayIndex: number;
  initialIndicatorLeft?: number;
  initialIndicatorTop?: number;
  initialIndicatorWidth?: number;
  initialIndicatorHeight?: number;
  indicatorContainer: HTMLElement | null;
  calendarId?: string;
  calendarIds?: string[];
  title?: string;
  hourOffset?: number;
  duration?: number;
};

type ResizeStartDragUpdates = {
  active: true;
  mode: 'resize';
  eventId: string;
  startX: number;
  startY: number;
  allDay?: boolean;
  resizeDirection: string;
  originalStartDate: Date;
  originalEndDate: Date;
  originalEvent: Event;
  dayIndex: number;
  startHour?: number;
  endHour?: number;
  originalDay?: number;
  originalStartHour?: number;
  originalEndHour?: number;
  lastUpdateTime?: number;
  initialMouseY?: number;
  hourOffset?: number;
};

type WeekDayMoveStartParams = {
  allDayRowElement?: HTMLDivElement | null;
  clientX: number;
  clientY: number;
  editingHours: EditingHours;
  event: Event;
  mouseHour: number;
  sourceElement: HTMLElement;
  sourceRect: DOMRect;
};

type WeekDayResizeStartParams = {
  clientX: number;
  clientY: number;
  direction: string;
  editingHours: EditingHours;
  event: Event;
  mouseHour: number;
};

type WeekDayCreateStartDragUpdates = {
  active: true;
  mode: 'create';
  eventId: null;
  startX: number;
  startY: number;
  dayIndex: number;
  startHour: number;
  endHour: number;
  allDay: false;
  eventDate: Date;
  duration: number;
  hourOffset: number;
};

type WeekDayCreateStartParams = {
  clientX: number;
  clientY: number;
  currentWeekStart?: Date;
  dayIndex: number;
  getDateByDayIndex: (weekStart: Date, dayIndex: number) => Date;
  isMobile: boolean;
  roundToTimeStep: (value: number) => number;
  startHour: number;
  timeStep: number;
};

type CreateAllDayPreviewDragLike = {
  dayIndex: number;
  startX: number;
  startY: number;
};

type ResizeAllDayPreviewDragLike = {
  originalStartDate?: Date | null;
  originalEndDate?: Date | null;
  resizeDirection?: string | null;
};

type TimedResizePreviewDragLike = {
  dayIndex: number;
  endHour: number;
  hourOffset?: number | null;
  originalDay: number;
  originalEndHour: number;
  originalStartHour: number;
  resizeDirection?: string | null;
  startHour: number;
};

type TimedMovePreviewDragLike = {
  dayIndex: number;
  duration: number;
  hourOffset?: number | null;
};

export const getAllDayEventDurationDays = (
  start: Date,
  end: Date,
  inclusive: boolean
) => {
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  const diff = Math.floor(
    (endDate.getTime() - startDate.getTime()) / DAY_IN_MS
  );
  return inclusive ? Math.max(1, diff + 1) : Math.max(0, diff);
};

export const buildWeekDayMoveStartData = ({
  allDayRowElement,
  clientX,
  clientY,
  editingHours,
  event,
  mouseHour,
  sourceElement,
  sourceRect,
}: WeekDayMoveStartParams): {
  dragUpdates: MoveStartDragUpdates;
  dragState: WeekDayDragState;
} => {
  const segmentInfo = (
    event as unknown as {
      _segmentInfo?: SegmentInfo;
    }
  )._segmentInfo;
  const isSegment = !!segmentInfo;

  const currentDayIndex = isSegment ? segmentInfo.dayIndex : (event.day ?? 0);
  const currentStartHour = isSegment
    ? segmentInfo.startHour
    : editingHours.startHour;
  const eventDurationDays =
    event.allDay && event.start && event.end
      ? getAllDayEventDurationDays(
          temporalToDate(event.start),
          temporalToDate(event.end),
          false
        )
      : 0;

  const eventStartDate = temporalToDate(event.start);
  const indicatorContainer = event.allDay
    ? ((sourceElement.offsetParent as HTMLElement | null) ??
      allDayRowElement ??
      null)
    : null;
  const allDayContainerRect = event.allDay
    ? indicatorContainer?.getBoundingClientRect()
    : null;

  const dragUpdates: MoveStartDragUpdates = {
    active: true,
    mode: 'move',
    eventId: event.id,
    startX: clientX,
    startY: clientY,
    dayIndex: currentDayIndex,
    startHour: currentStartHour,
    endHour: isSegment ? segmentInfo.endHour : editingHours.endHour,
    originalDay: event.day ?? 0,
    originalStartHour: editingHours.startHour,
    originalEndHour: editingHours.endHour,
    allDay: event.allDay || false,
    eventDate: eventStartDate,
    eventDurationDays,
    startDragDayIndex: currentDayIndex,
    initialIndicatorLeft: allDayContainerRect
      ? sourceRect.left - allDayContainerRect.left
      : undefined,
    initialIndicatorTop: allDayContainerRect
      ? sourceRect.top - allDayContainerRect.top
      : undefined,
    initialIndicatorWidth: allDayContainerRect ? sourceRect.width : undefined,
    initialIndicatorHeight: allDayContainerRect ? sourceRect.height : undefined,
    indicatorContainer,
    calendarId: event.calendarId,
    calendarIds: event.calendarIds,
    title: event.title,
  };

  if (!event.allDay) {
    dragUpdates.hourOffset = currentStartHour - mouseHour;
    const durationInMs =
      editingHours.endDate.getTime() - editingHours.startDate.getTime();
    dragUpdates.duration = durationInMs / (1000 * 60 * 60);
  }

  return {
    dragUpdates,
    dragState: {
      active: true,
      mode: 'move',
      eventId: event.id,
      dayIndex: event.day ?? 0,
      startHour: editingHours.startHour,
      endHour: editingHours.endHour,
      allDay: event.allDay || false,
    },
  };
};

export const buildWeekDayResizeStartData = ({
  clientX,
  clientY,
  direction,
  editingHours,
  event,
  mouseHour,
}: WeekDayResizeStartParams): {
  dragUpdates: ResizeStartDragUpdates;
  dragState: WeekDayDragState;
} => {
  if (event.allDay) {
    const initialStartDate = temporalToDate(event.start);
    const initialEndDate = temporalToDate(event.end);

    return {
      dragUpdates: {
        active: true,
        mode: 'resize',
        eventId: event.id,
        startX: clientX,
        startY: clientY,
        allDay: true,
        resizeDirection: direction,
        originalStartDate: initialStartDate,
        originalEndDate: initialEndDate,
        originalEvent: { ...event },
        dayIndex: event.day ?? 0,
      },
      dragState: {
        active: true,
        mode: 'resize',
        eventId: event.id,
        dayIndex: event.day ?? 0,
        startHour: 0,
        endHour: 0,
        allDay: true,
      },
    };
  }

  return {
    dragUpdates: {
      active: true,
      mode: 'resize',
      eventId: event.id,
      startX: clientX,
      startY: clientY,
      dayIndex: event.day ?? 0,
      startHour: editingHours.startHour,
      endHour: editingHours.endHour,
      originalDay: event.day ?? 0,
      originalStartHour: editingHours.startHour,
      originalEndHour: editingHours.endHour,
      resizeDirection: direction,
      lastUpdateTime: Date.now(),
      initialMouseY: mouseHour,
      originalStartDate: editingHours.startDate,
      originalEndDate: editingHours.endDate,
      hourOffset:
        direction === 'top'
          ? editingHours.startHour - mouseHour
          : editingHours.endHour - mouseHour,
      allDay: false,
      originalEvent: { ...event },
    },
    dragState: {
      active: true,
      mode: 'resize',
      eventId: event.id,
      dayIndex: event.day ?? 0,
      startHour: editingHours.startHour,
      endHour: editingHours.endHour,
      allDay: false,
    },
  };
};

export const buildWeekDayCreateStartData = ({
  clientX,
  clientY,
  currentWeekStart,
  dayIndex,
  getDateByDayIndex,
  isMobile,
  roundToTimeStep,
  startHour,
  timeStep,
}: WeekDayCreateStartParams): {
  dragState: WeekDayDragState;
  dragUpdates: WeekDayCreateStartDragUpdates;
} => {
  const initialDuration = isMobile ? 1 : timeStep * 4;
  const hourOffset = isMobile ? -initialDuration / 2 : 0;
  const adjustedStart = roundToTimeStep(startHour + hourOffset);

  const dragUpdates: WeekDayCreateStartDragUpdates = {
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
    hourOffset,
  };

  return {
    dragState: {
      active: true,
      mode: 'create',
      eventId: null,
      dayIndex,
      startHour: dragUpdates.startHour,
      endHour: dragUpdates.endHour,
      allDay: false,
    },
    dragUpdates,
  };
};

export const buildAllDayCreateMovePreview = ({
  clientX,
  clientY,
  drag,
  getColumnDayIndex,
  isDayView,
}: {
  clientX: number;
  clientY: number;
  drag: CreateAllDayPreviewDragLike;
  getColumnDayIndex: (clientX: number) => number;
  isDayView: boolean;
}) => ({
  distance: Math.hypot(clientX - drag.startX, clientY - drag.startY),
  newDayIndex: isDayView ? drag.dayIndex : getColumnDayIndex(clientX),
});

export const buildAllDayResizePreview = ({
  currentWeekStart,
  drag,
  getDateByDayIndex,
  targetDayIndex,
}: {
  currentWeekStart?: Date;
  drag: ResizeAllDayPreviewDragLike;
  getDateByDayIndex: (weekStart: Date, dayIndex: number) => Date;
  targetDayIndex: number;
}) => {
  let newStartDate = drag.originalStartDate || new Date();
  let newEndDate = drag.originalEndDate || new Date();

  if (drag.resizeDirection === 'left') {
    newStartDate = currentWeekStart
      ? getDateByDayIndex(currentWeekStart, targetDayIndex)
      : new Date();
    if (newStartDate > newEndDate) {
      newStartDate = newEndDate;
    }
  } else if (drag.resizeDirection === 'right') {
    newEndDate = currentWeekStart
      ? getDateByDayIndex(currentWeekStart, targetDayIndex)
      : new Date();
    if (newEndDate < newStartDate) {
      newEndDate = newStartDate;
    }
  }

  return { newStartDate, newEndDate };
};

export const buildCrossDayTimedResizePreview = ({
  currentWeekStart,
  drag,
  firstHour,
  getDateByDayIndex,
  getDayIndexForDate,
  getEventDateForEditing,
  lastHour,
  mouseHour,
  originalEvent,
  roundToTimeStep,
  timeStepMs,
}: {
  currentWeekStart?: Date;
  drag: TimedResizePreviewDragLike;
  firstHour: number;
  getDateByDayIndex: (weekStart: Date, dayIndex: number) => Date;
  getDayIndexForDate: (date: Date, fallback: number) => number;
  getEventDateForEditing: (temporal: Event['start']) => Date;
  lastHour: number;
  mouseHour: number;
  originalEvent: Event;
  roundToTimeStep: (value: number) => number;
  timeStepMs: number;
}) => {
  const targetDayIndex = currentWeekStart ? drag.dayIndex : drag.dayIndex;
  const resolvedTargetDayIndex = targetDayIndex;
  const proposedHour = roundToTimeStep(
    Math.max(firstHour, Math.min(lastHour, mouseHour + (drag.hourOffset ?? 0)))
  );
  const pointerBaseDate = currentWeekStart
    ? getDateByDayIndex(currentWeekStart, resolvedTargetDayIndex)
    : getEventDateForEditing(originalEvent.start);
  const pointerDate = createDateWithHour(pointerBaseDate, proposedHour) as Date;

  const anchorStartDate = getEventDateForEditing(originalEvent.start);
  const anchorEndDate = getEventDateForEditing(
    originalEvent.end ?? originalEvent.start
  );

  let newStartDate = new Date(anchorStartDate);
  let newEndDate = new Date(anchorEndDate);

  if (drag.resizeDirection === 'bottom') {
    if (pointerDate.getTime() >= anchorStartDate.getTime()) {
      newStartDate = new Date(anchorStartDate);
      newEndDate = new Date(
        Math.max(pointerDate.getTime(), anchorStartDate.getTime() + timeStepMs)
      );
    } else {
      newStartDate = new Date(
        Math.min(pointerDate.getTime(), anchorStartDate.getTime() - timeStepMs)
      );
      newEndDate = new Date(anchorStartDate);
    }
  } else if (drag.resizeDirection === 'right') {
    const pointerEndDate = createDateWithHour(
      pointerBaseDate,
      anchorEndDate.getHours() + anchorEndDate.getMinutes() / 60
    ) as Date;
    if (pointerEndDate.getTime() >= anchorStartDate.getTime()) {
      newStartDate = new Date(anchorStartDate);
      newEndDate = new Date(
        Math.max(
          pointerEndDate.getTime(),
          anchorStartDate.getTime() + timeStepMs
        )
      );
    } else {
      newStartDate = new Date(
        Math.min(
          pointerEndDate.getTime(),
          anchorStartDate.getTime() - timeStepMs
        )
      );
      newEndDate = new Date(anchorStartDate);
    }
  } else if (drag.resizeDirection === 'top') {
    if (pointerDate.getTime() <= anchorEndDate.getTime()) {
      newStartDate = new Date(
        Math.min(pointerDate.getTime(), anchorEndDate.getTime() - timeStepMs)
      );
      newEndDate = new Date(anchorEndDate);
    } else {
      newStartDate = new Date(anchorEndDate);
      newEndDate = new Date(
        Math.max(pointerDate.getTime(), anchorEndDate.getTime() + timeStepMs)
      );
    }
  }

  const startDayIndex = getDayIndexForDate(newStartDate, drag.originalDay);
  const endDayIndex = getDayIndexForDate(newEndDate, startDayIndex);
  const indicatorStartHour =
    newStartDate.getHours() + newStartDate.getMinutes() / 60;
  const indicatorEndHour =
    startDayIndex === endDayIndex
      ? newEndDate.getHours() + newEndDate.getMinutes() / 60
      : lastHour;

  return {
    endDayIndex,
    indicatorEndHour,
    indicatorStartHour,
    newEndDate,
    newStartDate,
    startDayIndex,
  };
};

export const buildSingleDayTimedResizePreview = ({
  currentEvent,
  drag,
  firstHour,
  getEffectiveDaySpan,
  lastHour,
  mouseHour,
  timeStep,
}: {
  currentEvent: Event;
  drag: TimedResizePreviewDragLike;
  firstHour: number;
  getEffectiveDaySpan: (start: Date, end: Date, isAllDay?: boolean) => number;
  lastHour: number;
  mouseHour: number;
  timeStep: number;
}) => {
  let newStartHour = drag.startHour;
  let newEndHour = drag.endHour;

  const eventStart = temporalToDate(currentEvent.start);
  const eventEnd = temporalToDate(currentEvent.end);
  const span = getEffectiveDaySpan(
    eventStart,
    eventEnd,
    currentEvent.allDay ?? false
  );
  const eventEndDayIndex = (currentEvent.day ?? 0) + span;

  let endDayIndex = eventEndDayIndex;
  let startDayIndex = drag.originalDay;

  if (drag.resizeDirection === 'top') {
    const targetDayIndex = drag.dayIndex;
    const proposedStartHour = mouseHour + (drag.hourOffset ?? 0);

    if (targetDayIndex < eventEndDayIndex) {
      startDayIndex = targetDayIndex;
      newStartHour = Math.max(firstHour, Math.min(lastHour, proposedStartHour));
    } else {
      startDayIndex = eventEndDayIndex;

      if (proposedStartHour > drag.originalEndHour) {
        newStartHour = drag.originalEndHour;
        newEndHour = proposedStartHour;
      } else {
        newStartHour = Math.max(firstHour, proposedStartHour);
        if (drag.originalEndHour - newStartHour < timeStep) {
          newStartHour = drag.originalEndHour - timeStep;
        }
      }
    }
  } else if (drag.resizeDirection === 'bottom') {
    const targetDayIndex = drag.dayIndex;
    const proposedEndHour = mouseHour + (drag.hourOffset ?? 0);

    if (targetDayIndex === drag.dayIndex) {
      if (proposedEndHour < drag.originalStartHour) {
        newEndHour = drag.originalStartHour;
        newStartHour = proposedEndHour;
      } else {
        newEndHour = Math.min(lastHour, proposedEndHour);
        if (newEndHour - drag.startHour < timeStep) {
          newEndHour = drag.startHour + timeStep;
        }
      }
    } else {
      endDayIndex = targetDayIndex;
      newEndHour = Math.max(firstHour, Math.min(lastHour, proposedEndHour));
    }
  }

  if (endDayIndex === startDayIndex) {
    newStartHour = Math.max(firstHour, Math.min(newStartHour, newEndHour));
    newEndHour = Math.min(lastHour, Math.max(newStartHour, newEndHour));
  }

  return {
    endDayIndex,
    newEndHour,
    newStartHour,
    startDayIndex,
  };
};

export const buildTimedMovePreview = ({
  clientX,
  drag,
  firstHour,
  getColumnDayIndex,
  isDayView,
  lastHour,
  mouseHour,
  roundToTimeStep,
}: {
  clientX: number;
  drag: TimedMovePreviewDragLike;
  firstHour: number;
  getColumnDayIndex: (clientX: number) => number;
  isDayView: boolean;
  lastHour: number;
  mouseHour: number;
  roundToTimeStep: (value: number) => number;
}) => {
  let newStartHour = roundToTimeStep(mouseHour + (drag.hourOffset ?? 0));
  newStartHour = Math.max(
    firstHour,
    Math.min(lastHour - drag.duration, newStartHour)
  );

  return {
    dayIndex: isDayView ? drag.dayIndex : getColumnDayIndex(clientX),
    endHour: newStartHour + drag.duration,
    startHour: newStartHour,
  };
};
