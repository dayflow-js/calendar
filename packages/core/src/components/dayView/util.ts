import { Event, EventLayout } from '@/types';
import { temporalToDate, dateToZonedDateTime } from '@/utils/temporal';
import { EventLayoutCalculator } from '@/components/eventLayout';

// Filter events for the current day
export const filterDayEvents = (
  events: Event[],
  currentDate: Date,
  currentWeekStart: Date
): Event[] => {
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);

  const filtered = events.filter(event => {
    const eventStart = temporalToDate(event.start);
    const eventEnd = temporalToDate(event.end);

    if (event.allDay) {
      const s = new Date(eventStart);
      s.setHours(0, 0, 0, 0);
      const e = new Date(eventEnd);
      e.setHours(0, 0, 0, 0);
      return s <= dayEnd && e >= dayStart;
    }

    return eventStart < dayEnd && eventEnd > dayStart;
  });

  return filtered.map(event => {
    const eventDate = temporalToDate(event.start);
    const dayDiff = Math.floor(
      (eventDate.getTime() - currentWeekStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    const correctDay = Math.max(0, Math.min(6, dayDiff));

    return {
      ...event,
      day: correctDay,
    };
  });
};

// Normalize events for layout calculation (clamping to current day)
export const normalizeLayoutEvents = (
  currentDayEvents: Event[],
  currentDate: Date
): Event[] => {
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);

  return currentDayEvents
    .filter(e => !e.allDay)
    .map(event => {
      const eventStart = temporalToDate(event.start);
      const eventEnd = temporalToDate(event.end);
      let newStart = event.start;
      let newEnd = event.end;
      let modified = false;

      if (eventStart < dayStart) {
        newStart = dateToZonedDateTime(dayStart);
        modified = true;
      }

      if (eventEnd > nextDay) {
        newEnd = dateToZonedDateTime(nextDay);
        modified = true;
      }

      return {
        ...event,
        start: modified ? newStart : event.start,
        end: modified ? newEnd : event.end,
        day: 0, // Force all events to same day index for collision detection
      };
    });
};

// Organize all-day events into rows
export const organizeAllDayEvents = (currentDayEvents: Event[]) => {
  const allDayEvents = currentDayEvents.filter(e => e.allDay);

  allDayEvents.sort((a, b) => {
    const aStart = temporalToDate(a.start);
    const bStart = temporalToDate(b.start);
    if (aStart.getTime() !== bStart.getTime()) {
      return aStart.getTime() - bStart.getTime();
    }
    const aEnd = temporalToDate(a.end);
    const bEnd = temporalToDate(b.end);
    return bEnd.getTime() - aEnd.getTime();
  });

  const rows: Event[][] = [];
  const eventsWithRow: Array<Event & { row: number }> = [];

  allDayEvents.forEach(event => {
    let rowIndex = 0;
    let placed = false;

    while (!placed) {
      if (!rows[rowIndex]) {
        rows[rowIndex] = [event];
        eventsWithRow.push({ ...event, row: rowIndex });
        placed = true;
      } else {
        const hasCollision = rows[rowIndex].some(existing => {
          const aStart = temporalToDate(event.start);
          const aEnd = temporalToDate(event.end);
          const bStart = temporalToDate(existing.start);
          const bEnd = temporalToDate(existing.end);
          return aStart <= bEnd && bStart <= aEnd;
        });

        if (!hasCollision) {
          rows[rowIndex].push(event);
          eventsWithRow.push({ ...event, row: rowIndex });
          placed = true;
        } else {
          rowIndex++;
        }
      }
    }
  });

  return eventsWithRow;
};

// Calculate layout for newly created events
export const calculateNewEventLayout = (
  targetDay: number,
  startHour: number,
  endHour: number,
  currentDate: Date,
  layoutEvents: Event[]
): EventLayout | null => {
  const startDate = new Date(currentDate);
  const endDate = new Date(currentDate);
  startDate.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
  endDate.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

  const tempEvent: Event = {
    id: '-1',
    title: 'Temp',
    day: 0,
    start: dateToZonedDateTime(startDate),
    end: dateToZonedDateTime(endDate),
    calendarId: 'blue',
    allDay: false,
  };

  const dayEvents = [...layoutEvents, tempEvent];
  const tempLayouts = EventLayoutCalculator.calculateDayEventLayouts(
    dayEvents,
    { viewType: 'day' }
  );
  return tempLayouts.get('-1') || null;
};

// Calculate drag layout
export const calculateDragLayout = (
  draggedEvent: Event,
  targetDay: number,
  targetStartHour: number,
  targetEndHour: number,
  currentDate: Date,
  layoutEvents: Event[]
): EventLayout | null => {
  const otherEvents = layoutEvents.filter(e => e.id !== draggedEvent.id);

  const viewDate = new Date(currentDate);
  const startD = new Date(viewDate);
  startD.setHours(
    Math.floor(targetStartHour),
    (targetStartHour % 1) * 60,
    0,
    0
  );
  const endD = new Date(viewDate);
  endD.setHours(Math.floor(targetEndHour), (targetEndHour % 1) * 60, 0, 0);

  const modifiedDraggedEvent = {
    ...draggedEvent,
    start: dateToZonedDateTime(startD),
    end: dateToZonedDateTime(endD),
    day: 0,
  };

  const dayEvents = [...otherEvents, modifiedDraggedEvent];

  if (dayEvents.length === 0) return null;

  const tempLayouts = EventLayoutCalculator.calculateDayEventLayouts(
    dayEvents,
    { viewType: 'day' }
  );
  return tempLayouts.get(draggedEvent.id) || null;
};
