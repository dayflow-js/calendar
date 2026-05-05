import { dateToZonedDateTime, temporalToDate } from '@dayflow/core';
import {
  buildSingleDayTimedResizeEventUpdate,
  buildTimedCreatePreview,
} from '@drag/hooks/utils/weekDay/preview';

describe('weekDayPreview', () => {
  it('builds timed create preview for mobile drag', () => {
    const preview = buildTimedCreatePreview({
      clientY: 0,
      drag: {
        duration: 2,
        endHour: 11,
        originalStartHour: 9,
        hourOffset: 0,
        startHour: 9,
        startY: 0,
      },
      firstHour: 0,
      isMobile: true,
      lastHour: 24,
      mouseHour: 23,
      roundToTimeStep: value => value,
      timeStep: 0.25,
    });

    expect(preview.startHour).toBe(22);
    expect(preview.endHour).toBe(24);
  });

  it('builds single-day timed resize event dates', () => {
    const { newEndDate, newStartDate, updatedEvent } =
      buildSingleDayTimedResizeEventUpdate({
        appTimeZone: 'UTC',
        currentWeekStart: new Date('2026-04-06T00:00:00Z'),
        endDayIndex: 4,
        event: {
          id: 'event-1',
          title: 'Focus',
          start: dateToZonedDateTime(new Date('2026-04-08T09:00:00Z'), 'UTC'),
          end: dateToZonedDateTime(new Date('2026-04-08T10:00:00Z'), 'UTC'),
          day: 2,
          calendarId: 'work',
          allDay: false,
        },
        getDateByDayIndex: (weekStart, dayIndex) => {
          const nextDate = new Date(weekStart);
          nextDate.setDate(weekStart.getDate() + dayIndex);
          return nextDate;
        },
        roundedEnd: 11,
        roundedStart: 9,
        startDayIndex: 4,
      });

    expect(newStartDate.getFullYear()).toBe(2026);
    expect(newStartDate.getMonth()).toBe(3);
    expect(newStartDate.getDate()).toBe(10);
    expect(newStartDate.getHours()).toBe(9);
    expect(newEndDate.getFullYear()).toBe(2026);
    expect(newEndDate.getMonth()).toBe(3);
    expect(newEndDate.getDate()).toBe(10);
    expect(newEndDate.getHours()).toBe(11);
    expect(updatedEvent.day).toBe(4);
    expect(temporalToDate(updatedEvent.start).toISOString()).toBe(
      '2026-04-10T09:00:00.000Z'
    );
    expect(temporalToDate(updatedEvent.end).toISOString()).toBe(
      '2026-04-10T11:00:00.000Z'
    );
  });
});
