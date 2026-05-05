import {
  Event,
  createDateWithHour,
  dateToZonedDateTime,
  temporalToDate,
} from '@dayflow/core';

type SingleDayTimedResizeEventParams = {
  appTimeZone: string;
  currentWeekStart?: Date;
  endDayIndex: number;
  event: Event;
  getDateByDayIndex: (weekStart: Date, dayIndex: number) => Date;
  roundedEnd: number;
  roundedStart: number;
  startDayIndex: number;
};

type TimedCreatePreviewDragLike = {
  duration?: number;
  endHour: number;
  originalStartHour: number;
  hourOffset?: number | null;
  startHour: number;
  startY: number;
};

export const buildSingleDayTimedResizeEventUpdate = ({
  appTimeZone,
  currentWeekStart,
  endDayIndex,
  event,
  getDateByDayIndex,
  roundedEnd,
  roundedStart,
  startDayIndex,
}: SingleDayTimedResizeEventParams) => {
  const eventStartDate = temporalToDate(event.start);
  const newStartDate = createDateWithHour(
    currentWeekStart
      ? getDateByDayIndex(currentWeekStart, startDayIndex)
      : eventStartDate,
    roundedStart
  ) as Date;
  const endDate = currentWeekStart
    ? getDateByDayIndex(currentWeekStart, endDayIndex)
    : eventStartDate;
  const newEndDate = createDateWithHour(endDate, roundedEnd) as Date;

  return {
    newEndDate,
    newStartDate,
    updatedEvent: {
      ...event,
      start: dateToZonedDateTime(newStartDate, appTimeZone),
      end: dateToZonedDateTime(newEndDate, appTimeZone),
      day: startDayIndex,
    },
  };
};

export const buildTimedCreatePreview = ({
  clientY,
  drag,
  firstHour,
  isMobile,
  lastHour,
  mouseHour,
  roundToTimeStep,
  timeStep,
}: {
  clientY: number;
  drag: TimedCreatePreviewDragLike;
  firstHour: number;
  isMobile: boolean;
  lastHour: number;
  mouseHour: number;
  roundToTimeStep: (value: number) => number;
  timeStep: number;
}) => {
  if (isMobile) {
    const newHour = roundToTimeStep(mouseHour + (drag.hourOffset ?? 0));
    const safeStartHour = Math.max(
      firstHour,
      Math.min(lastHour - (drag.duration || 1), newHour)
    );

    return {
      endHour: safeStartHour + (drag.duration || 1),
      startHour: safeStartHour,
    };
  }

  const newHour = roundToTimeStep(mouseHour);
  const [newStartHour, newEndHour] =
    clientY < drag.startY
      ? [newHour, Math.max(newHour + timeStep, drag.originalStartHour)]
      : [drag.startHour, Math.max(drag.startHour + timeStep, newHour)];

  return {
    endHour: newEndHour,
    startHour: newStartHour,
  };
};
