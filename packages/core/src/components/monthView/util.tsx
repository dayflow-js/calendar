import { Temporal } from 'temporal-polyfill';

import {
  CalendarDays,
  Gift,
  Heart,
  MapPin,
  Star,
} from '@/components/common/Icons';
import { eventIcon } from '@/styles/classNames';
import { Event } from '@/types';
import { daysDifference, temporalToVisualDate } from '@/utils';
import { createAllDayDisplayComparator } from '@/utils/allDaySort';
import { extractHourFromDate } from '@/utils/helpers';
import { logger } from '@/utils/logger';

export interface MultiDayEventSegment {
  id: string;
  originalEventId: string;
  event: Event;
  startDayIndex: number;
  endDayIndex: number;
  segmentType:
    | 'start'
    | 'middle'
    | 'end'
    | 'single'
    | 'start-week-end'
    | 'end-week-start';
  totalDays: number;
  segmentIndex: number;
  isFirstSegment: boolean;
  isLastSegment: boolean;
  yPosition?: number;
}

export interface MonthDayLayoutData {
  totalSlotsNeeded: number;
  hasMore: boolean;
  limit: number;
  timedEventsOnly: Event[];
  gapLayers: number[];
  occupiedLayers: Set<number>;
  maxOccupiedLayer: number;
  segmentIsHidden: Set<string>;
}

const ROW_HEIGHT = 16;

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
    return <Gift className={eventIcon} />;
  }
  if (
    title.includes('birthday') ||
    title.includes('anniversary') ||
    title.includes('生日')
  ) {
    return <Heart className={eventIcon} />;
  }
  if (
    title.includes('conference') ||
    title.includes('meeting') ||
    title.includes('会议') ||
    title.includes('研讨')
  ) {
    return <Star className={eventIcon} />;
  }
  if (
    title.includes('trip') ||
    title.includes('travel') ||
    title.includes('旅行')
  ) {
    return <MapPin className={eventIcon} />;
  }

  return <CalendarDays className={eventIcon} />;
};

// Per-event cache for analyzeMultiDayEventsForWeek. Keyed by event reference,
// inner key encodes the week context. During drag/resize 99%+ of events keep
// their references so this turns the per-tick scan from O(N) date math into
// nearly free Map lookups.
const weekEventSegmentsCache = new WeakMap<
  Event,
  Map<string, MultiDayEventSegment[]>
>();

// Analyze multi-day events and generate segments for the current week (supports all-day events and multi-day regular events)
export const analyzeMultiDayEventsForWeek = (
  events: Event[],
  weekStart: Date,
  daysInWeek: number = 7,
  secondaryTimeZone?: string
): MultiDayEventSegment[] => {
  const segments: MultiDayEventSegment[] = [];

  const weekStartMs = weekStart.getTime();
  const contextKey = `${weekStartMs}|${daysInWeek}|${secondaryTimeZone ?? ''}`;

  // Get the date range of the current week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + (daysInWeek - 1));
  weekEnd.setHours(23, 59, 59, 999);

  events.forEach(event => {
    // Cache lookup — unchanged refs reuse computed segments
    let perEvent = weekEventSegmentsCache.get(event);
    if (perEvent) {
      const cached = perEvent.get(contextKey);
      if (cached) {
        for (let i = 0; i < cached.length; i++) segments.push(cached[i]);
        return;
      }
    }
    const eventOutput: MultiDayEventSegment[] = [];
    const pushSegment = (seg: MultiDayEventSegment) => {
      eventOutput.push(seg);
      segments.push(seg);
    };
    const finishEvent = () => {
      if (!perEvent) {
        perEvent = new Map();
        weekEventSegmentsCache.set(event, perEvent);
      }
      perEvent.set(contextKey, eventOutput);
    };
    // Use start and end as the event's start and end times
    const eventStartFull = temporalToVisualDate(event.start, secondaryTimeZone);
    const eventEndFull = event.end
      ? temporalToVisualDate(event.end, secondaryTimeZone)
      : eventStartFull;

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
        finishEvent();
        return;
      }

      // Calculate dayIndex within the current week (0=Monday, 6=Sunday)
      const dayIndex = Math.floor(
        (eventStartDate.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (dayIndex >= 0 && dayIndex <= daysInWeek - 1) {
        pushSegment({
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
      finishEvent();
      return;
    }

    // Only process multi-day events (all-day or regular)
    if (!isMultiDay) {
      finishEvent();
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
      finishEvent();
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
    const isWeekBoundary =
      startDayIndex === 0 || endDayIndex === daysInWeek - 1;

    let segmentType: MultiDayEventSegment['segmentType'];

    if (isFirstSegment && isLastSegment) {
      segmentType = 'single';
    } else if (isFirstSegment) {
      segmentType =
        isWeekBoundary && endDayIndex === daysInWeek - 1
          ? 'start-week-end'
          : 'start';
    } else if (isLastSegment) {
      segmentType =
        isWeekBoundary && startDayIndex === 0 ? 'end-week-start' : 'end';
    } else {
      segmentType = 'middle';
    }

    const totalDays = daysDifference(eventStart, eventEnd) + 1;

    pushSegment({
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
    finishEvent();
  });

  return segments;
};

export const organizeMultiDaySegments = (
  multiDaySegments: MultiDayEventSegment[],
  comparator?: (a: Event, b: Event) => number
) => {
  const compareEvents = comparator
    ? comparator
    : createAllDayDisplayComparator(
        multiDaySegments.map(segment => segment.event),
        (() => {
          const calendarOrder = new Map<string | undefined, number>();
          multiDaySegments.forEach(segment => {
            const id = segment.event.calendarId;
            if (!calendarOrder.has(id)) {
              calendarOrder.set(id, calendarOrder.size);
            }
          });

          return (a: Event, b: Event) =>
            (calendarOrder.get(a.calendarId) ?? 0) -
            (calendarOrder.get(b.calendarId) ?? 0);
        })()
      );

  const sortedSegments = [...multiDaySegments].toSorted((a, b) => {
    if (compareEvents) {
      const displayPriority = compareEvents(a.event, b.event);
      if (displayPriority !== 0) {
        return displayPriority;
      }
    }

    const aDays = a.endDayIndex - a.startDayIndex + 1;
    const bDays = b.endDayIndex - b.startDayIndex + 1;

    if (a.startDayIndex > b.startDayIndex) {
      return 1;
    }

    if (aDays !== bDays) {
      return bDays - aDays;
    }

    return a.startDayIndex - b.startDayIndex;
  });

  const segmentsWithPosition: MultiDayEventSegment[] = [];

  sortedSegments.forEach(segment => {
    let yPosition = 0;
    let positionFound = false;

    while (!positionFound) {
      let hasConflict = false;
      for (const existingSegment of segmentsWithPosition) {
        const yConflict =
          Math.abs((existingSegment.yPosition ?? 0) - yPosition) < ROW_HEIGHT;
        const timeConflict = !(
          segment.endDayIndex < existingSegment.startDayIndex ||
          segment.startDayIndex > existingSegment.endDayIndex
        );
        if (yConflict && timeConflict) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        yPosition += ROW_HEIGHT;
      } else {
        positionFound = true;
      }
    }

    segmentsWithPosition.push({ ...segment, yPosition });
  });

  const layers: MultiDayEventSegment[][] = [];

  segmentsWithPosition.forEach(segment => {
    const layerIndex = Math.floor((segment.yPosition ?? 0) / ROW_HEIGHT);

    if (!layers[layerIndex]) {
      layers[layerIndex] = [];
    }

    layers[layerIndex].push(segment);
  });

  layers.forEach(layer => {
    layer.sort((a, b) => {
      if (compareEvents) {
        const displayPriority = compareEvents(a.event, b.event);
        if (displayPriority !== 0) {
          return displayPriority;
        }
      }

      return a.startDayIndex - b.startDayIndex;
    });
  });

  return layers;
};

export const constructRenderEvents = (
  events: Event[],
  weekStart: Date,
  appTimeZone?: string
): Event[] => {
  const renderEvents: Event[] = [];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  events.forEach(event => {
    if (!event.start || !event.end) {
      logger.warn('Event missing start or end date:', event);
      return;
    }

    const start = temporalToVisualDate(event.start, appTimeZone);
    const end = event.end
      ? temporalToVisualDate(event.end, appTimeZone)
      : start;
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    let adjustedEndDate = new Date(endDate);
    if (!event.allDay) {
      const endHasTime =
        end.getHours() !== 0 ||
        end.getMinutes() !== 0 ||
        end.getSeconds() !== 0;
      if (!endHasTime) {
        const durationMs = end.getTime() - start.getTime();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        if (durationMs > 0 && durationMs < ONE_DAY_MS) {
          adjustedEndDate = new Date(endDate);
          adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
        }
      }
    }

    const isMultiDay =
      startDate.toDateString() !== adjustedEndDate.toDateString();

    if (isMultiDay && !event.allDay) {
      return;
    }

    if (isMultiDay && event.allDay) {
      let current = new Date(start);
      if (current < weekStart) {
        current = new Date(weekStart);
        current.setHours(0, 0, 0, 0);
      }

      const loopEnd = end > weekEnd ? weekEnd : end;

      for (
        let t = start.getTime();
        t <= loopEnd.getTime();
        t += 24 * 60 * 60 * 1000
      ) {
        const currentLoopDate = new Date(t);
        if (currentLoopDate < weekStart) continue;

        const currentTemporal = Temporal.PlainDate.from({
          year: currentLoopDate.getFullYear(),
          month: currentLoopDate.getMonth() + 1,
          day: currentLoopDate.getDate(),
        });

        renderEvents.push({
          ...event,
          start: currentTemporal,
          end: currentTemporal,
          day: current.getDay(),
        });
      }
    } else {
      renderEvents.push({
        ...event,
        start: event.start,
        end: event.end,
        day: start.getDay(),
      });
    }
  });

  return renderEvents;
};

export const sortDayEvents = (events: Event[]): Event[] =>
  [...events].toSorted((a, b) => {
    if (a.allDay !== b.allDay) {
      return a.allDay ? -1 : 1;
    }

    if (a.allDay && b.allDay) return 0;

    return extractHourFromDate(a.start) - extractHourFromDate(b.start);
  });

export const createDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type RegularEventSegment = {
  dayIndex: number;
  startHour: number;
  endHour: number;
  isFirst: boolean;
  isLast: boolean;
};

// Per-event cache: keys combine (weekStart, daysInWeek, tz) so identical event
// references reuse results across calls within the same and subsequent renders.
// WeakMap lets entries get GC'd when events are replaced (immutable updates).
const regularSegmentsCache = new WeakMap<
  Event,
  Map<string, RegularEventSegment[]>
>();

// Check if a regular event spans multiple days and return time segment information for each day
export const analyzeMultiDayRegularEvent = (
  event: Event,
  weekStart: Date,
  daysInWeek: number = 7,
  secondaryTimeZone?: string
): RegularEventSegment[] => {
  if (event.allDay) return [];

  const cacheKey = `${weekStart.getTime()}|${daysInWeek}|${secondaryTimeZone ?? ''}`;
  let perEvent = regularSegmentsCache.get(event);
  if (perEvent) {
    const cached = perEvent.get(cacheKey);
    if (cached) return cached;
  }

  const eventStart = temporalToVisualDate(event.start, secondaryTimeZone);
  const eventEnd = event.end
    ? temporalToVisualDate(event.end, secondaryTimeZone)
    : eventStart;

  // Get the date portion (without time)
  const startDate = new Date(eventStart);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(eventEnd);
  endDate.setHours(0, 0, 0, 0);

  const cacheResult = (value: RegularEventSegment[]) => {
    if (!perEvent) {
      perEvent = new Map();
      regularSegmentsCache.set(event, perEvent);
    }
    perEvent.set(cacheKey, value);
    return value;
  };

  // Check if it spans multiple days
  const daySpan = daysDifference(startDate, endDate);
  if (daySpan === 0) return cacheResult([]);

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
    return cacheResult([]);
  }

  const lastDayOffset = endHasExplicitTime ? daySpan : Math.max(0, daySpan - 1);

  // Generate segments for each day
  const segments: RegularEventSegment[] = [];

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

  return cacheResult(segments);
};
