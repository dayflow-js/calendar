/**
 * Event Utilities
 *
 * This module provides utilities for event operations including:
 * - Filtering events by day and type
 * - Calculating day indices based on week start dates
 * - Creating and updating events with proper date/time handling
 * - Converting between Date and Temporal API objects
 */

import { Temporal } from 'temporal-polyfill';

import { Event } from '@/types';

import { temporalToDate } from './temporal';

// ============================================================================
// Event Tools
// ============================================================================

/**
 * Get regular (non-all-day) events for a specific day index
 * @param dayIndex Day index (0-6, Monday-Sunday)
 * @param events Array of events
 * @returns Filtered events
 */
export const getEventsForDay = (dayIndex: number, events: Event[]) =>
  events.filter(event => event.day === dayIndex && !event.allDay);

/**
 * Get all-day events for a specific day index
 * Supports date range checking when weekStart is provided
 * @param dayIndex Day index (0-6, Monday-Sunday)
 * @param events Array of events
 * @param weekStart Optional week start date for accurate date range checking
 * @returns Filtered all-day events
 */
export const getAllDayEventsForDay = (
  dayIndex: number,
  events: Event[],
  weekStart?: Date
) =>
  events.filter(event => {
    if (!event.allDay) return false;

    // If no weekStart provided, use simple logic (backward compatibility)
    if (!weekStart) {
      return event.day === dayIndex;
    }

    // Calculate actual date for current dayIndex
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + dayIndex);
    currentDate.setHours(0, 0, 0, 0);

    // Get event's start and end dates (normalized to 00:00:00)
    const eventStartDate = temporalToDate(event.start);
    eventStartDate.setHours(0, 0, 0, 0);

    const eventEndDate = temporalToDate(event.end);
    eventEndDate.setHours(0, 0, 0, 0);

    // Check if current date is within event's date range (inclusive)
    return currentDate >= eventStartDate && currentDate <= eventEndDate;
  });

/**
 * Get Date object for a specific day index relative to week start
 * @param weekStart Week start date
 * @param dayIndex Day index (0-6)
 * @returns Date object
 */
export const getDateByDayIndex = (weekStart: Date, dayIndex: number): Date => {
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + dayIndex);
  return date;
};

/**
 * Update event's date and dayIndex
 * @param event Event to update
 * @param newDayIndex New day index
 * @param weekStart Week start date
 * @returns Updated event
 */
export const updateEventDateAndDay = (
  event: Event,
  newDayIndex: number,
  weekStart: Date
): Event => {
  const newDate = getDateByDayIndex(weekStart, newDayIndex);
  return {
    ...event,
    day: newDayIndex,
    start: event.allDay
      ? Temporal.PlainDate.from({
          year: newDate.getFullYear(),
          month: newDate.getMonth() + 1,
          day: newDate.getDate(),
        })
      : Temporal.ZonedDateTime.from({
          year: newDate.getFullYear(),
          month: newDate.getMonth() + 1,
          day: newDate.getDate(),
          hour: newDate.getHours(),
          minute: newDate.getMinutes(),
          timeZone: Temporal.Now.timeZoneId(),
        }),
    end: event.allDay
      ? Temporal.PlainDate.from({
          year: newDate.getFullYear(),
          month: newDate.getMonth() + 1,
          day: newDate.getDate(),
        })
      : Temporal.ZonedDateTime.from({
          year: newDate.getFullYear(),
          month: newDate.getMonth() + 1,
          day: newDate.getDate(),
          hour: newDate.getHours(),
          minute: newDate.getMinutes(),
          timeZone: Temporal.Now.timeZoneId(),
        }),
  };
};

/**
 * Convert Date to Temporal (PlainDate or ZonedDateTime based on allDay flag)
 * @param date Date object
 * @param allDay Whether it's an all-day event
 * @returns Temporal object
 */
const dateToTemporal = (
  date: Date,
  allDay: boolean
): Temporal.PlainDate | Temporal.ZonedDateTime => {
  if (allDay) {
    return Temporal.PlainDate.from({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    });
  }
  return Temporal.ZonedDateTime.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds(),
    timeZone: Temporal.Now.timeZoneId(),
  });
};

/**
 * Create new event with Date fields set
 * @param eventData Event data without start/end
 * @param weekStart Week start date
 * @returns Complete event with Temporal start/end
 */
export const createEventWithDate = (
  eventData: Omit<Event, 'start' | 'end'>,
  weekStart: Date
): Event => {
  const eventDate = getDateByDayIndex(weekStart, eventData.day ?? 0);
  const allDay = eventData.allDay ?? false;
  return {
    ...eventData,
    start: dateToTemporal(eventDate, allDay),
    end: dateToTemporal(eventDate, allDay),
  };
};

/**
 * Calculate day index based on real date and current week start
 * @param eventDate Event date
 * @param weekStart Week start date
 * @returns Day index (can be outside 0-6 range for events outside current week)
 */
export const calculateDayIndex = (eventDate: Date, weekStart: Date): number => {
  // Get event date start time (00:00:00)
  const eventDateStart = new Date(eventDate);
  eventDateStart.setHours(0, 0, 0, 0);

  // Get week start date start time (00:00:00)
  const weekStartCopy = new Date(weekStart);
  weekStartCopy.setHours(0, 0, 0, 0);
  const diffTime = eventDateStart.getTime() - weekStartCopy.getTime();

  return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Note: Not limited to 0-6 range, as events can be outside current week
};

/**
 * Check if event is within current week range
 * @param eventDate Event date
 * @param weekStart Week start date
 * @returns Whether event is in the week
 */
export const isEventInWeek = (eventDate: Date, weekStart: Date): boolean => {
  const dayIndex = calculateDayIndex(eventDate, weekStart);

  return dayIndex >= 0 && dayIndex <= 6;
};

/**
 * Recalculate day field for all events (based on current week)
 * @param events Array of events
 * @param weekStart Week start date
 * @returns Events with updated day indices
 */
export const recalculateEventDays = (
  events: Event[],
  weekStart: Date
): Event[] =>
  events.map(event => {
    const eventDate = temporalToDate(event.start);
    const newDay = calculateDayIndex(eventDate, weekStart);

    return {
      ...event,
      day: newDay,
    };
  });

/**
 * Get day index by Date (relative to week start)
 * @param weekStart Week start date
 * @param targetDate Target date
 * @returns Day index
 */
export const getDayIndexByDate = (
  weekStart: Date,
  targetDate: Date
): number => {
  // Ensure both are start of day for comparison
  const weekStartCopy = new Date(weekStart);
  weekStartCopy.setHours(0, 0, 0, 0);

  const targetDateCopy = new Date(targetDate);
  targetDateCopy.setHours(0, 0, 0, 0);

  const diffTime = targetDateCopy.getTime() - weekStartCopy.getTime();

  // Don't limit return value, return actual day difference
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get events within specified week range
 * @param events Array of events
 * @param weekStart Week start date
 * @returns Filtered and recalculated events
 */
export const getEventsForWeek = (events: Event[], weekStart: Date): Event[] => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return events
    .filter(event => {
      const eventDate = temporalToDate(event.start);
      return eventDate >= weekStart && eventDate <= weekEnd;
    })
    .map(event => {
      // Recalculate day based on event's real date relative to current week start
      const dayIndex = calculateDayIndex(
        temporalToDate(event.start),
        weekStart
      );
      return {
        ...event,
        day: dayIndex,
      };
    });
};

/**
 * Create event with real date
 * @param eventData Event data without start/end
 * @param weekStart Week start date
 * @returns Complete event
 */
export const createEventWithRealDate = (
  eventData: Omit<Event, 'start' | 'end'>,
  weekStart: Date
): Event => {
  const eventDate = new Date(weekStart);
  eventDate.setDate(weekStart.getDate() + (eventData.day ?? 0));
  const allDay = eventData.allDay ?? false;
  return {
    ...eventData,
    start: dateToTemporal(eventDate, allDay),
    end: dateToTemporal(eventDate, allDay),
  };
};

/**
 * Update event with real date
 * @param event Event to update
 * @param newDayIndex New day index
 * @param weekStart Week start date
 * @returns Updated event
 */
export const updateEventWithRealDate = (
  event: Event,
  newDayIndex: number,
  weekStart: Date
): Event => {
  const newDate = new Date(weekStart);
  newDate.setDate(weekStart.getDate() + newDayIndex);
  const allDay = event.allDay ?? false;
  return {
    ...event,
    day: newDayIndex,
    start: dateToTemporal(newDate, allDay),
    end: dateToTemporal(newDate, allDay),
  };
};

// ============================================================================
// New Helper Functions (Support PlainDateTime)
// ============================================================================

/**
 * Create event with PlainDateTime (default for local events)
 * This is the recommended function for creating events without timezone complexity
 */
export const createEventWithPlainDateTime = (
  eventData: Omit<Event, 'start' | 'end'>,
  weekStart: Date
): Event => {
  const eventDate = getDateByDayIndex(weekStart, eventData.day ?? 0);
  const allDay = eventData.allDay ?? false;

  if (allDay) {
    const plainDate = Temporal.PlainDate.from({
      year: eventDate.getFullYear(),
      month: eventDate.getMonth() + 1,
      day: eventDate.getDate(),
    });
    return {
      ...eventData,
      start: plainDate,
      end: plainDate,
    };
  }

  // Use PlainDateTime for timed events (no timezone)
  const plainDateTime = Temporal.PlainDateTime.from({
    year: eventDate.getFullYear(),
    month: eventDate.getMonth() + 1,
    day: eventDate.getDate(),
    hour: eventDate.getHours(),
    minute: eventDate.getMinutes(),
    second: eventDate.getSeconds(),
    millisecond: eventDate.getMilliseconds(),
  });

  return {
    ...eventData,
    start: plainDateTime,
    end: plainDateTime,
  };
};

/**
 * Create event with ZonedDateTime (for timezone-aware events)
 * Use when explicit timezone control is needed
 */
export const createEventWithZonedDateTime = (
  eventData: Omit<Event, 'start' | 'end'>,
  weekStart: Date,
  timeZone: string
): Event => {
  const eventDate = getDateByDayIndex(weekStart, eventData.day ?? 0);
  const allDay = eventData.allDay ?? false;

  if (allDay) {
    const plainDate = Temporal.PlainDate.from({
      year: eventDate.getFullYear(),
      month: eventDate.getMonth() + 1,
      day: eventDate.getDate(),
    });
    return {
      ...eventData,
      start: plainDate,
      end: plainDate,
    };
  }

  // Use ZonedDateTime with explicit timezone
  const zonedDateTime = Temporal.ZonedDateTime.from({
    year: eventDate.getFullYear(),
    month: eventDate.getMonth() + 1,
    day: eventDate.getDate(),
    hour: eventDate.getHours(),
    minute: eventDate.getMinutes(),
    second: eventDate.getSeconds(),
    millisecond: eventDate.getMilliseconds(),
    timeZone: timeZone,
  });

  return {
    ...eventData,
    start: zonedDateTime,
    end: zonedDateTime,
  };
};

/**
 * Compare two events for equality
 * @param event1 First event
 * @param event2 Second event
 * @returns Whether events are equal in content
 */
export const isEventDeepEqual = (
  event1: Event | null,
  event2: Event | null
): boolean => {
  if (event1 === event2) return true;
  if (!event1 || !event2) return false;

  return (
    event1.title === event2.title &&
    event1.calendarId === event2.calendarId &&
    (event1.description || '') === (event2.description || '') &&
    !!event1.allDay === !!event2.allDay &&
    event1.start.toString() === event2.start.toString() &&
    event1.end.toString() === event2.end.toString()
  );
};

/**
 * Check if event's primary fields (start, end, title) have changed.
 * This is commonly used to determine if an event update should be persisted
 * after a drag or resize operation.
 *
 * @param oldEvent Original event
 * @param newEvent Updated event
 * @returns Whether primary fields have changed
 */
export const hasEventChanged = (oldEvent: Event, newEvent: Event): boolean =>
  temporalToDate(oldEvent.start).getTime() !==
    temporalToDate(newEvent.start).getTime() ||
  temporalToDate(oldEvent.end).getTime() !==
    temporalToDate(newEvent.end).getTime() ||
  oldEvent.title !== newEvent.title ||
  oldEvent.day !== newEvent.day ||
  !!oldEvent.allDay !== !!newEvent.allDay;
