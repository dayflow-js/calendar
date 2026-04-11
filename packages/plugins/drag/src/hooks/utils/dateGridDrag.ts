import {
  Event,
  MonthDragState,
  dateToPlainDate,
  dateToZonedDateTime,
  temporalToDate,
} from '@dayflow/core';

type DateGridDragLike = {
  eventId?: string | null;
  mode?: string | null;
  originalEvent?: Event | null;
  originalStartDate?: Date | null;
  originalEndDate?: Date | null;
  originalStartTime?:
    | { hour: number; minute: number; second: number }
    | null
    | undefined;
  originalEndTime?:
    | { hour: number; minute: number; second: number }
    | null
    | undefined;
  resizeDirection?: string | null;
  targetDate?: Date | null;
  grabDayOffset?: number;
};

type DateGridPreviewRangeUpdate = {
  kind: 'range';
  targetDate: Date;
  startDate: Date;
  endDate: Date;
};

type DateGridPreviewTargetUpdate = {
  kind: 'target-only';
  targetDate: Date;
};

export type DateGridPreviewUpdate =
  | DateGridPreviewRangeUpdate
  | DateGridPreviewTargetUpdate
  | null;

type BuildDateGridPreviewUpdateParams = {
  addDaysToDate: (date: Date, days: number) => Date;
  daysDifference: (from: Date, to: Date) => number;
  drag: DateGridDragLike;
  targetDate: Date;
};

type BuildDateGridCreateEventParams = {
  appTimeZone: string;
  calendarId: string;
  targetDate: Date;
  title: string;
};

type DateGridMoveStartDragUpdates = {
  active: boolean;
  pendingMove: boolean;
  mode: 'move';
  eventId: string;
  startX: number;
  startY: number;
  targetDate: Date;
  originalDate: Date;
  originalEvent: Event;
  lastUpdateTime: number;
  originalStartDate: Date;
  originalEndDate: Date;
  eventDurationDays: number;
  currentSegmentDays: number;
  dragOffset: number;
  dragOffsetY: number;
  grabDayOffset: number;
};

type BuildDateGridMoveStartDataParams = {
  clientX: number;
  clientY: number;
  event: Event;
  eventDurationDays: number;
  eventEndDate: Date;
  eventStartDate: Date;
  grabDayOffset?: number;
  isTouchLike: boolean;
  sourceElement: HTMLElement;
  sourceRect: DOMRect;
};

export const shouldActivateDateGridMove = ({
  clientX,
  clientY,
  startX,
  startY,
}: {
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
}) => Math.hypot(clientX - startX, clientY - startY) >= 3;

const applyTimeToDate = (
  date: Date,
  isAllDay: boolean,
  timeInfo: { hour: number; minute: number; second: number } | null | undefined
) => {
  if (isAllDay) {
    date.setHours(0, 0, 0, 0);
    return;
  }

  if (timeInfo) {
    date.setHours(timeInfo.hour, timeInfo.minute, timeInfo.second ?? 0, 0);
  }
};

export const buildDateGridCreateEvent = ({
  appTimeZone,
  calendarId,
  targetDate,
  title,
}: BuildDateGridCreateEventParams): Event => {
  const startTime = new Date(targetDate);
  startTime.setHours(9, 0, 0, 0);
  const endTime = new Date(targetDate);
  endTime.setHours(10, 0, 0, 0);

  return {
    id: String(Date.now()),
    title,
    start: dateToZonedDateTime(startTime, appTimeZone),
    end: dateToZonedDateTime(endTime, appTimeZone),
    day: targetDate.getDay(),
    calendarId,
    allDay: false,
  };
};

export const buildDateGridMoveStartData = ({
  clientX,
  clientY,
  event,
  eventDurationDays,
  eventEndDate,
  eventStartDate,
  grabDayOffset = 0,
  isTouchLike,
  sourceElement,
  sourceRect,
}: BuildDateGridMoveStartDataParams): {
  currentDragOffset: { x: number; y: number };
  dragState: MonthDragState;
  dragUpdates: DateGridMoveStartDragUpdates;
} => {
  const segmentDaysAttr = sourceElement.dataset.segmentDays;
  const currentSegmentDays = segmentDaysAttr
    ? Number.parseInt(segmentDaysAttr, 10)
    : eventDurationDays;

  const dragUpdates: DateGridMoveStartDragUpdates = {
    active: isTouchLike,
    pendingMove: !isTouchLike,
    mode: 'move',
    eventId: event.id,
    startX: clientX,
    startY: clientY,
    targetDate: eventStartDate,
    originalDate: eventStartDate,
    originalEvent: { ...event },
    lastUpdateTime: Date.now(),
    originalStartDate: eventStartDate,
    originalEndDate: eventEndDate,
    eventDurationDays,
    currentSegmentDays,
    dragOffset: sourceRect.width / 2,
    dragOffsetY: sourceRect.height / 2,
    grabDayOffset,
  };

  return {
    currentDragOffset: {
      x: clientX - sourceRect.left,
      y: clientY - sourceRect.top,
    },
    dragState: {
      active: true,
      mode: 'move',
      eventId: event.id,
      targetDate: eventStartDate,
      startDate: eventStartDate,
      endDate: eventEndDate,
    },
    dragUpdates,
  };
};

export const buildDateGridPreviewUpdate = ({
  addDaysToDate,
  daysDifference,
  drag,
  targetDate,
}: BuildDateGridPreviewUpdateParams): DateGridPreviewUpdate => {
  if (drag.mode === 'resize' && drag.originalEvent && drag.resizeDirection) {
    const originalDate = temporalToDate(drag.originalEvent.start);
    let newStartDate: Date;
    let newEndDate: Date;
    const isAllDay = drag.originalEvent.allDay ?? false;
    const startTimeInfo = drag.originalStartTime;
    const endTimeInfo = drag.originalEndTime;

    if (drag.resizeDirection === 'left') {
      newStartDate = new Date(targetDate);
      applyTimeToDate(newStartDate, isAllDay, startTimeInfo);

      const endBase = temporalToDate(drag.originalEvent.end) || originalDate;
      newEndDate = new Date(endBase);
      applyTimeToDate(newEndDate, isAllDay, endTimeInfo);
      if (newStartDate > newEndDate) {
        newStartDate = newEndDate;
      }
    } else {
      const startBase =
        temporalToDate(drag.originalEvent.start) || originalDate;
      newStartDate = new Date(startBase);
      applyTimeToDate(newStartDate, isAllDay, startTimeInfo);

      newEndDate = new Date(targetDate);
      applyTimeToDate(newEndDate, isAllDay, endTimeInfo);
      if (newEndDate < newStartDate) {
        newEndDate = newStartDate;
      }
    }

    return {
      kind: 'range',
      targetDate: drag.resizeDirection === 'left' ? newStartDate : newEndDate,
      startDate: newStartDate,
      endDate: newEndDate,
    };
  }

  if (drag.mode === 'move') {
    if (drag.originalStartDate && drag.originalEndDate) {
      const normalizedOriginalStart = new Date(drag.originalStartDate);
      normalizedOriginalStart.setHours(0, 0, 0, 0);

      const grabOffsetDays = drag.grabDayOffset ?? 0;
      const adjustedTargetDate =
        grabOffsetDays > 0
          ? addDaysToDate(targetDate, -grabOffsetDays)
          : targetDate;

      const dragOffsetDays = daysDifference(
        normalizedOriginalStart,
        adjustedTargetDate
      );
      const newStartDate = addDaysToDate(
        drag.originalStartDate,
        dragOffsetDays
      );
      const newEndDate = addDaysToDate(drag.originalEndDate, dragOffsetDays);

      if (drag.originalStartDate.getTime() === newStartDate.getTime()) {
        return null;
      }

      return {
        kind: 'range',
        targetDate: newStartDate,
        startDate: newStartDate,
        endDate: newEndDate,
      };
    }

    if (drag.targetDate?.getTime() !== targetDate.getTime()) {
      return {
        kind: 'target-only',
        targetDate,
      };
    }
  }

  return null;
};

type DateGridDropResultBase = {
  originalEvent: Event;
};

export type DateGridDropResult =
  | (DateGridDropResultBase & {
      kind: 'resize';
      updatedEvent: Event;
      startDate: Date;
      endDate: Date;
    })
  | (DateGridDropResultBase & {
      kind: 'move';
      updatedEvent: Event;
      startDate: Date;
      endDate: Date;
    })
  | {
      kind: 'restore';
      originalEvent: Event;
    }
  | null;

type BuildDateGridDropResultParams = {
  appTimeZone: string;
  canonicalizeEditedEvent: (originalEvent: Event, visualEvent: Event) => Event;
  clientX: number;
  clientY: number;
  drag: DateGridDragLike;
  events?: Event[];
  getTargetDateFromPosition: (clientX: number, clientY: number) => Date | null;
};

const toEventTemporalRange = (
  startDate: Date,
  endDate: Date,
  isAllDay: boolean,
  appTimeZone: string
) => ({
  start: isAllDay
    ? dateToPlainDate(startDate)
    : dateToZonedDateTime(startDate, appTimeZone),
  end: isAllDay
    ? dateToPlainDate(endDate)
    : dateToZonedDateTime(endDate, appTimeZone),
});

export const buildDateGridDropResult = ({
  appTimeZone,
  canonicalizeEditedEvent,
  clientX,
  clientY,
  drag,
  events,
  getTargetDateFromPosition,
}: BuildDateGridDropResultParams): DateGridDropResult => {
  if (
    drag.mode === 'resize' &&
    drag.eventId &&
    drag.originalStartDate &&
    drag.originalEndDate
  ) {
    const originalEvent =
      drag.originalEvent || events?.find(event => event.id === drag.eventId);
    if (!originalEvent) return null;

    const temporals = toEventTemporalRange(
      drag.originalStartDate,
      drag.originalEndDate,
      drag.originalEvent?.allDay || false,
      appTimeZone
    );

    return {
      kind: 'resize',
      originalEvent,
      updatedEvent: canonicalizeEditedEvent(originalEvent, {
        ...originalEvent,
        ...temporals,
      }),
      startDate: drag.originalStartDate,
      endDate: drag.originalEndDate,
    };
  }

  if (drag.mode !== 'move') return null;

  if (drag.eventId && drag.originalStartDate && drag.originalEndDate) {
    const originalEvent =
      drag.originalEvent || events?.find(event => event.id === drag.eventId);

    const originalEventStart = drag.originalEvent?.start
      ? temporalToDate(drag.originalEvent.start)
      : null;
    const hasMoved =
      originalEventStart &&
      originalEventStart.getTime() !== drag.originalStartDate.getTime();

    if (hasMoved && originalEvent) {
      const temporals = toEventTemporalRange(
        drag.originalStartDate,
        drag.originalEndDate,
        drag.originalEvent?.allDay || false,
        appTimeZone
      );

      return {
        kind: 'move',
        originalEvent,
        updatedEvent: canonicalizeEditedEvent(originalEvent, {
          ...originalEvent,
          ...temporals,
        }),
        startDate: drag.originalStartDate,
        endDate: drag.originalEndDate,
      };
    }

    if (drag.originalEvent) {
      return {
        kind: 'restore',
        originalEvent: drag.originalEvent,
      };
    }
  }

  const finalTargetDate =
    getTargetDateFromPosition(clientX, clientY) || drag.targetDate;

  if (!drag.eventId || !finalTargetDate) return null;

  const originalEvent =
    drag.originalEvent || events?.find(event => event.id === drag.eventId);
  if (!originalEvent) return null;

  const eventStartDate = temporalToDate(originalEvent.start);
  const eventEndDate = temporalToDate(originalEvent.end);

  const newStartDate = new Date(finalTargetDate);
  newStartDate.setHours(
    eventStartDate.getHours(),
    eventStartDate.getMinutes(),
    0,
    0
  );

  const newEndDate = new Date(finalTargetDate);
  newEndDate.setHours(eventEndDate.getHours(), eventEndDate.getMinutes(), 0, 0);

  const temporals = toEventTemporalRange(
    newStartDate,
    newEndDate,
    originalEvent.allDay || false,
    appTimeZone
  );

  return {
    kind: 'move',
    originalEvent,
    updatedEvent: canonicalizeEditedEvent(originalEvent, {
      ...originalEvent,
      ...temporals,
    }),
    startDate: newStartDate,
    endDate: newEndDate,
  };
};
