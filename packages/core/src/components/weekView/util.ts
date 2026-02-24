import { Event, EventLayout } from '@/types';
import { temporalToDate, dateToZonedDateTime } from '@/utils/temporal';
import { createDateWithHour, getDateByDayIndex } from '@/utils';
import { EventLayoutCalculator } from '@/components/eventLayout';
import {
  analyzeMultiDayRegularEvent,
  analyzeMultiDayEventsForWeek,
} from '@/components/monthView/util';

// ... existing code ...

// Calculate event layouts for the entire week
export const calculateEventLayouts = (
  currentWeekEvents: Event[],
  currentWeekStart: Date,
  daysToShow: number = 7
): Map<number, Map<string, EventLayout>> => {
  const allLayouts = new Map<number, Map<string, EventLayout>>();

  for (let day = 0; day < daysToShow; day++) {
    const dayEventsForLayout: Event[] = [];

    currentWeekEvents.forEach(event => {
      if (event.allDay) return;

      const segments = analyzeMultiDayRegularEvent(
        event,
        currentWeekStart,
        daysToShow
      );

      if (segments.length > 0) {
        const segment = segments.find(s => s.dayIndex === day);
        if (segment) {
          const segmentEndHour =
            segment.endHour >= 24 ? 23.99 : segment.endHour;

          const virtualEvent: Event = {
            ...event,
            start: dateToZonedDateTime(
              createDateWithHour(
                getDateByDayIndex(currentWeekStart, day),
                segment.startHour
              ) as Date
            ),
            end: dateToZonedDateTime(
              createDateWithHour(
                getDateByDayIndex(currentWeekStart, day),
                segmentEndHour
              ) as Date
            ),
            day: day,
          };
          dayEventsForLayout.push(virtualEvent);
        }
      } else {
        if (event.day === day) {
          dayEventsForLayout.push(event);
        }
      }
    });

    const dayLayouts = EventLayoutCalculator.calculateDayEventLayouts(
      dayEventsForLayout,
      { viewType: 'week' }
    );
    allLayouts.set(day, dayLayouts);
  }

  return allLayouts;
};

export const getWeekStart = (date: Date): Date => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Filter events for the current week
export const filterWeekEvents = (
  events: Event[],
  currentWeekStart: Date,
  daysToShow: number = 7
): Event[] => {
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + (daysToShow - 1));
  weekEnd.setHours(23, 59, 59, 999);

  const filtered = events.filter(event => {
    const eventStart = temporalToDate(event.start);
    eventStart.setHours(0, 0, 0, 0);
    const eventEnd = temporalToDate(event.end);
    eventEnd.setHours(23, 59, 59, 999);

    return eventEnd >= currentWeekStart && eventStart <= weekEnd;
  });

  return filtered.map(event => {
    const eventDate = temporalToDate(event.start);
    const dayDiff = Math.floor(
      (eventDate.getTime() - currentWeekStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    const correctDay = Math.max(0, Math.min(daysToShow - 1, dayDiff));

    return {
      ...event,
      day: correctDay,
    };
  });
};

// Organize all-day segments
export const organizeAllDaySegments = (
  currentWeekEvents: Event[],
  currentWeekStart: Date,
  daysToShow: number = 7
) => {
  const multiDaySegments = analyzeMultiDayEventsForWeek(
    currentWeekEvents,
    currentWeekStart,
    daysToShow
  );
  const segments = multiDaySegments.filter((seg: any) => seg.event.allDay);

  segments.sort((a: any, b: any) => {
    // Use absolute start time for stable sorting across window shifts
    const aStart = temporalToDate(a.event.start).getTime();
    const bStart = temporalToDate(b.event.start).getTime();
    
    if (aStart !== bStart) {
      return aStart - bStart;
    }
    const aDays = a.totalDays;
    const bDays = b.totalDays;
    return bDays - aDays;
  });

  const segmentsWithRow: Array<(typeof multiDaySegments)[0] & { row: number }> =
    [];

  segments.forEach((segment: any) => {
    let row = 0;
    let foundRow = false;

    while (!foundRow) {
      const hasConflict = segmentsWithRow.some((existing: any) => {
        if (existing.row !== row) return false;
        return !(
          segment.endDayIndex < existing.startDayIndex ||
          segment.startDayIndex > existing.endDayIndex
        );
      });

      if (!hasConflict) {
        foundRow = true;
      } else {
        row++;
      }
    }

    segmentsWithRow.push({ ...segment, row });
  });

  return segmentsWithRow;
};

// Calculate new event layout
export const calculateNewEventLayout = (
  targetDay: number,
  startHour: number,
  endHour: number,
  currentWeekEvents: Event[]
): EventLayout | null => {
  const startDate = new Date();
  const endDate = new Date();
  startDate.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
  endDate.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

  const tempEvent: Event = {
    id: '-1',
    title: 'Temp',
    day: targetDay,
    start: dateToZonedDateTime(startDate),
    end: dateToZonedDateTime(endDate),
    calendarId: 'blue',
    allDay: false,
  };

  const dayEvents = [
    ...currentWeekEvents.filter(e => e.day === targetDay && !e.allDay),
    tempEvent,
  ];
  const tempLayouts = EventLayoutCalculator.calculateDayEventLayouts(
    dayEvents,
    { viewType: 'week' }
  );
  return tempLayouts.get('-1') || null;
};

// Calculate drag layout
export const calculateDragLayout = (
  draggedEvent: Event,
  targetDay: number,
  targetStartHour: number,
  targetEndHour: number,
  currentWeekEvents: Event[]
): EventLayout | null => {
  const tempEvents = currentWeekEvents.map(e => {
    if (e.id !== draggedEvent.id) return e;

    const eventDateForCalc = temporalToDate(e.start);
    const newStartDate = createDateWithHour(
      eventDateForCalc,
      targetStartHour
    ) as Date;
    const newEndDate = createDateWithHour(
      eventDateForCalc,
      targetEndHour
    ) as Date;
    const newStart = dateToZonedDateTime(newStartDate);
    const newEnd = dateToZonedDateTime(newEndDate);

    return { ...e, day: targetDay, start: newStart, end: newEnd };
  });

  const dayEvents = tempEvents.filter(e => e.day === targetDay && !e.allDay);

  if (dayEvents.length === 0) return null;

  const tempLayouts = EventLayoutCalculator.calculateDayEventLayouts(
    dayEvents,
    { viewType: 'week' }
  );
  return tempLayouts.get(draggedEvent.id) || null;
};
