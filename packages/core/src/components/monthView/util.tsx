import { Event } from '@/types';
import { CalendarDays, Gift, Heart, MapPin, Star } from '../common/Icons';
import { MultiDayEventSegment } from '@/components/monthView/WeekComponent';
import { temporalToDate } from '@/utils/temporal';
import { daysDifference } from '@/utils';

export const getEventIcon = (event: Event) => {
  if (event.icon === false) return null;
  if (event.icon !== undefined && typeof event.icon !== 'boolean') {
    return event.icon;
  }

  const title = event.title.toLowerCase();

  if (
    title.includes('holiday') ||
    title.includes('vacation') ||
    title.includes('假期')
  ) {
    return <Gift className="h-3 w-3" />;
  }
  if (
    title.includes('birthday') ||
    title.includes('anniversary') ||
    title.includes('生日')
  ) {
    return <Heart className="h-3 w-3" />;
  }
  if (
    title.includes('conference') ||
    title.includes('meeting') ||
    title.includes('会议') ||
    title.includes('研讨')
  ) {
    return <Star className="h-3 w-3" />;
  }
  if (
    title.includes('trip') ||
    title.includes('travel') ||
    title.includes('旅行')
  ) {
    return <MapPin className="h-3 w-3" />;
  }

  return <CalendarDays className="h-3 w-3" />;
};

// Analyze multi-day events and generate segments for the current week (supports all-day events and multi-day regular events)
export const analyzeMultiDayEventsForWeek = (
  events: Event[],
  weekStart: Date,
  daysInWeek: number = 7
): MultiDayEventSegment[] => {
  const segments: MultiDayEventSegment[] = [];

  // Get the date range of the current week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + (daysInWeek - 1));
  weekEnd.setHours(23, 59, 59, 999);

  events.forEach(event => {
    // Use start and end as the event's start and end times
    const eventStartFull = temporalToDate(event.start);
    const eventEndFull = temporalToDate(event.end);

    // Get the date portion
    const eventStartDate = new Date(eventStartFull);
    eventStartDate.setHours(0, 0, 0, 0);
    const eventEndDate = new Date(eventEndFull);
    eventEndDate.setHours(0, 0, 0, 0);

    // For regular events, if the end time is midnight 00:00 and duration is less than 24 hours,
    // adjust the end date to the same day as the start date to avoid misidentifying as a multi-day event
    let adjustedEventEndDate = new Date(eventEndDate);
    if (!event.allDay) {
      const endHasTime =
        eventEndFull.getHours() !== 0 ||
        eventEndFull.getMinutes() !== 0 ||
        eventEndFull.getSeconds() !== 0;
      if (!endHasTime) {
        // End time is 00:00:00, check duration
        const durationMs = eventEndFull.getTime() - eventStartFull.getTime();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (durationMs > 0 && durationMs < ONE_DAY_MS) {
          // Duration is less than 24 hours, set end date to previous day
          adjustedEventEndDate = new Date(eventEndDate);
          adjustedEventEndDate.setDate(adjustedEventEndDate.getDate() - 1);
        }
      }
    }

    // Check if it spans multiple days (using adjusted end date)
    const isMultiDay = daysDifference(eventStartDate, adjustedEventEndDate) > 0;

    // For single-day all-day events, also create segment for display in WeekView's all-day area
    if (!isMultiDay && event.allDay) {
      // Check if event is within the current week
      if (eventStartDate < weekStart || eventStartDate > weekEnd) {
        return;
      }

      // Calculate dayIndex within the current week (0=Monday, 6=Sunday)
      const dayIndex = Math.floor(
        (eventStartDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (dayIndex >= 0 && dayIndex <= daysInWeek - 1) {
        segments.push({
          id: `${event.id}-week-${weekStart.getTime()}`,
          originalEventId: event.id,
          event,
          startDayIndex: dayIndex,
          endDayIndex: dayIndex,
          segmentType: 'single',
          totalDays: 1,
          segmentIndex: 0,
          isFirstSegment: true,
          isLastSegment: true,
        });
      }
      return;
    }

    // Only process multi-day events (all-day or regular)
    if (!isMultiDay) {
      return;
    }

    // For all-day events, set end time to end of day
    // For regular events, if end time is not midnight 00:00, that day should be included; if 00:00, subtract 1ms to point to previous day
    const eventStart = eventStartDate;
    let eventEnd: Date;
    if (event.allDay) {
      eventEnd = new Date(eventEndDate);
      eventEnd.setHours(23, 59, 59, 999);
    } else {
      // For regular events, if original end time's hours, minutes, and seconds are all 0, the event ended at the start of the day
      // In this case, the end date should be decreased by 1 day
      const endHasTime =
        eventEndFull.getHours() !== 0 ||
        eventEndFull.getMinutes() !== 0 ||
        eventEndFull.getSeconds() !== 0;
      if (endHasTime) {
        // Has specific time, use end of day
        eventEnd = new Date(eventEndDate);
        eventEnd.setHours(23, 59, 59, 999);
      } else {
        // No specific time (00:00:00), subtract 1 millisecond to point to previous day
        eventEnd = new Date(eventEndDate);
        eventEnd.setTime(eventEnd.getTime() - 1);
      }
    }

    // Check if event intersects with the current week
    if (eventEnd < weekStart || eventStart > weekEnd) {
      return;
    }

    // Calculate actual start and end dates within the current week
    const weekEventStart = eventStart < weekStart ? weekStart : eventStart;
    const weekEventEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

    // Calculate weekday index for start and end (0=Monday, 6=Sunday)
    const startDayIndex = Math.max(
      0,
      Math.floor(
        (weekEventStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)
      )
    );
    const endDayIndex = Math.min(
      daysInWeek - 1,
      Math.floor(
        (weekEventEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)
      )
    );

    // Determine segment type
    const isFirstSegment = eventStart >= weekStart;
    const isLastSegment = eventEnd <= weekEnd;
    const isWeekBoundary = startDayIndex === 0 || endDayIndex === daysInWeek - 1;

    let segmentType: MultiDayEventSegment['segmentType'];

    if (isFirstSegment && isLastSegment) {
      segmentType = 'single';
    } else if (isFirstSegment) {
      segmentType =
        isWeekBoundary && endDayIndex === daysInWeek - 1 ? 'start-week-end' : 'start';
    } else if (isLastSegment) {
      segmentType =
        isWeekBoundary && startDayIndex === 0 ? 'end-week-start' : 'end';
    } else {
      segmentType = 'middle';
    }

    const totalDays = daysDifference(eventStart, eventEnd) + 1;

    segments.push({
      id: `${event.id}-week-${weekStart.getTime()}`,
      originalEventId: event.id,
      event,
      startDayIndex,
      endDayIndex,
      segmentType,
      totalDays,
      segmentIndex: 0, // Can be calculated as needed
      isFirstSegment,
      isLastSegment,
    });
  });

  return segments;
};

// Check if a regular event spans multiple days and return time segment information for each day
export const analyzeMultiDayRegularEvent = (
  event: Event,
  weekStart: Date,
  daysInWeek: number = 7
): {
  dayIndex: number;
  startHour: number;
  endHour: number;
  isFirst: boolean;
  isLast: boolean;
}[] => {
  if (event.allDay) return [];

  const eventStart = temporalToDate(event.start);
  const eventEnd = temporalToDate(event.end);

  // Get the date portion (without time)
  const startDate = new Date(eventStart);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(eventEnd);
  endDate.setHours(0, 0, 0, 0);

  // Check if it spans multiple days
  const daySpan = daysDifference(startDate, endDate);
  if (daySpan === 0) return [];

  const endHasExplicitTime =
    eventEnd.getHours() !== 0 ||
    eventEnd.getMinutes() !== 0 ||
    eventEnd.getSeconds() !== 0 ||
    eventEnd.getMilliseconds() !== 0;

  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const durationMs = eventEnd.getTime() - eventStart.getTime();

  if (
    !event.allDay &&
    daySpan === 1 &&
    !endHasExplicitTime &&
    durationMs < DAY_IN_MS
  ) {
    return [];
  }

  const lastDayOffset = endHasExplicitTime ? daySpan : Math.max(0, daySpan - 1);

  // Generate segments for each day
  const segments: {
    dayIndex: number;
    startHour: number;
    endHour: number;
    isFirst: boolean;
    isLast: boolean;
  }[] = [];

  for (let i = 0; i <= lastDayOffset; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    // Calculate the index of the current date in the week
    const dayIndex = Math.floor(
      (currentDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Skip dates not in the current week
    if (dayIndex < 0 || dayIndex > daysInWeek - 1) continue;

    const isFirst = i === 0;
    const isLast = i === lastDayOffset;

    // Calculate start and end hours for the day
    const startHour = isFirst
      ? eventStart.getHours() + eventStart.getMinutes() / 60
      : 0;
    const endHour = isLast
      ? endHasExplicitTime
        ? eventEnd.getHours() + eventEnd.getMinutes() / 60
        : 24
      : 24;

    segments.push({
      dayIndex,
      startHour,
      endHour,
      isFirst,
      isLast,
    });
  }

  return segments;
};
