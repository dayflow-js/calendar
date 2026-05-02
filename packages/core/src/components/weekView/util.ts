import { EventLayoutCalculator } from '@/components/eventLayout';
import {
  analyzeMultiDayRegularEvent,
  analyzeMultiDayEventsForWeek,
  MultiDayEventSegment,
} from '@/components/monthView/util';
import { Event, EventLayout } from '@/types';
import { createDateWithHour, getDateByDayIndex } from '@/utils';
import { createAllDayDisplayComparator } from '@/utils/allDaySort';
import { extractHourFromDate, getEventEndHour } from '@/utils/helpers';
import {
  dateToZonedDateTime,
  temporalToDate,
  temporalToVisualDate,
} from '@/utils/temporalTypeGuards';

// ... existing code ...

// Build the projected event list for a single day plus the source-event refs
// that contributed (for cache-key comparison).
const buildDayEventsForLayout = (
  currentWeekEvents: Event[],
  day: number,
  currentWeekStart: Date,
  daysToShow: number,
  appTimeZone?: string
): { events: Event[]; sources: Event[] } => {
  const dayEventsForLayout: Event[] = [];
  const sourceRefs: Event[] = [];

  currentWeekEvents.forEach(event => {
    if (event.allDay) return;

    const segments = analyzeMultiDayRegularEvent(
      event,
      currentWeekStart,
      daysToShow,
      appTimeZone
    );

    if (segments.length > 0) {
      const segment = segments.find(s => s.dayIndex === day);
      if (segment) {
        const segmentEndHour = segment.endHour >= 24 ? 23.99 : segment.endHour;

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
          _originalStartHour: extractHourFromDate(event.start),
          _originalEndHour: getEventEndHour(event),
        };
        dayEventsForLayout.push(virtualEvent);
        sourceRefs.push(event);
      }
    } else if (event.day === day) {
      const toVisual = (t: Event['start']) =>
        appTimeZone ? temporalToVisualDate(t, appTimeZone) : temporalToDate(t);
      dayEventsForLayout.push({
        ...event,
        start: dateToZonedDateTime(toVisual(event.start), appTimeZone),
        end: dateToZonedDateTime(
          toVisual(event.end ?? event.start),
          appTimeZone
        ),
        day,
        _originalStartHour: extractHourFromDate(event.start),
        _originalEndHour: getEventEndHour(event),
      });
      sourceRefs.push(event);
    }
  });

  return { events: dayEventsForLayout, sources: sourceRefs };
};

// Per-week-context layout cache. Each entry stores the source-event refs that
// contributed to a day plus the resulting layouts. On the next render, if the
// day's source refs match (element-wise), we reuse the cached layouts. During
// drag/resize only one event ref changes, so 5/7 of days hit the cache.
type LayoutCacheEntry = {
  contextKey: string;
  perDay: Map<number, { sources: Event[]; layouts: Map<string, EventLayout> }>;
};
let layoutCacheEntry: LayoutCacheEntry | null = null;

const sameRefs = (a: Event[], b: Event[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

// Calculate event layouts for the entire week
export const calculateEventLayouts = (
  currentWeekEvents: Event[],
  currentWeekStart: Date,
  daysToShow: number = 7,
  appTimeZone?: string
): Map<number, Map<string, EventLayout>> => {
  const contextKey = `${currentWeekStart.getTime()}|${daysToShow}|${appTimeZone ?? ''}`;
  if (!layoutCacheEntry || layoutCacheEntry.contextKey !== contextKey) {
    layoutCacheEntry = { contextKey, perDay: new Map() };
  }
  const cache = layoutCacheEntry.perDay;

  const allLayouts = new Map<number, Map<string, EventLayout>>();

  for (let day = 0; day < daysToShow; day++) {
    const { events: dayEvents, sources } = buildDayEventsForLayout(
      currentWeekEvents,
      day,
      currentWeekStart,
      daysToShow,
      appTimeZone
    );

    const cached = cache.get(day);
    if (cached && sameRefs(cached.sources, sources)) {
      allLayouts.set(day, cached.layouts);
      continue;
    }

    const dayLayouts = EventLayoutCalculator.calculateDayEventLayouts(
      dayEvents,
      { viewType: 'week' }
    );
    cache.set(day, { sources, layouts: dayLayouts });
    allLayouts.set(day, dayLayouts);
  }

  return allLayouts;
};

export const getWeekStart = (date: Date, startOfWeek: number = 1): Date => {
  const day = date.getDay();
  const diff = (day - startOfWeek + 7) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Per-event cache for filter/day classification. Keyed by event reference;
// inner key encodes the week context so events from different weeks coexist.
// During drag/resize 99%+ of events are unchanged refs so this turns the
// per-tick filter from O(N) toDate calls into ~1 actual computation.
const weekFilterCache = new WeakMap<
  Event,
  Map<string, { inWeek: boolean; day: number }>
>();

const classifyEventForWeek = (
  event: Event,
  contextKey: string,
  weekStartMs: number,
  weekEndMs: number,
  daysToShow: number,
  appTimeZone?: string
): { inWeek: boolean; day: number } => {
  let perEvent = weekFilterCache.get(event);
  if (perEvent) {
    const cached = perEvent.get(contextKey);
    if (cached) return cached;
  }

  const toDate = (temporal: Event['start']) =>
    appTimeZone
      ? temporalToVisualDate(temporal, appTimeZone)
      : temporalToDate(temporal);

  const eventStart = toDate(event.start);
  const startDayMs = new Date(eventStart).setHours(0, 0, 0, 0);
  const eventEnd = toDate(event.end ?? event.start);
  const endDayMs = new Date(eventEnd).setHours(23, 59, 59, 999);

  const inWeek = endDayMs >= weekStartMs && startDayMs <= weekEndMs;
  const dayDiff = Math.floor(
    (startDayMs - weekStartMs) / (24 * 60 * 60 * 1000)
  );
  const day = Math.max(0, Math.min(daysToShow - 1, dayDiff));

  const result = { inWeek, day };
  if (!perEvent) {
    perEvent = new Map();
    weekFilterCache.set(event, perEvent);
  }
  perEvent.set(contextKey, result);
  return result;
};

// Filter events for the current week
export const filterWeekEvents = (
  events: Event[],
  currentWeekStart: Date,
  daysToShow: number = 7,
  appTimeZone?: string
): Event[] => {
  const weekStartMs = currentWeekStart.getTime();
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + (daysToShow - 1));
  weekEnd.setHours(23, 59, 59, 999);
  const weekEndMs = weekEnd.getTime();
  const contextKey = `${weekStartMs}|${daysToShow}|${appTimeZone ?? ''}`;

  const result: Event[] = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const { inWeek, day } = classifyEventForWeek(
      event,
      contextKey,
      weekStartMs,
      weekEndMs,
      daysToShow,
      appTimeZone
    );
    if (!inWeek) continue;

    // Preserve reference when day is already correct so downstream WeakMap
    // caches (e.g. analyzeMultiDayRegularEvent) can hit on repeated renders.
    result.push(event.day === day ? event : { ...event, day });
  }
  return result;
};

// Organize all-day segments
export const organizeAllDaySegments = (
  currentWeekEvents: Event[],
  currentWeekStart: Date,
  daysToShow: number = 7,
  comparator?: (a: Event, b: Event) => number
) => {
  const multiDaySegments = analyzeMultiDayEventsForWeek(
    currentWeekEvents,
    currentWeekStart,
    daysToShow
  );
  const segments = multiDaySegments.filter(
    (seg: MultiDayEventSegment) => seg.event.allDay
  );

  if (comparator) {
    segments.sort((a: MultiDayEventSegment, b: MultiDayEventSegment) =>
      comparator(a.event, b.event)
    );
  } else {
    // Default: group by calendar (first-seen order), then preserve load order
    const calendarOrder = new Map<string | undefined, number>();
    segments.forEach((seg: MultiDayEventSegment) => {
      const id = seg.event.calendarId;
      if (!calendarOrder.has(id)) calendarOrder.set(id, calendarOrder.size);
    });
    const compareByDisplayPriority = createAllDayDisplayComparator(
      segments.map(segment => segment.event),
      (left, right) =>
        (calendarOrder.get(left.calendarId) ?? 0) -
        (calendarOrder.get(right.calendarId) ?? 0)
    );
    segments.sort((a: MultiDayEventSegment, b: MultiDayEventSegment) =>
      compareByDisplayPriority(a.event, b.event)
    );
  }

  const segmentsWithRow: Array<MultiDayEventSegment & { row: number }> = [];

  segments.forEach((segment: MultiDayEventSegment) => {
    let row = 0;
    let foundRow = false;

    while (!foundRow) {
      let hasConflict = false;
      for (const existing of segmentsWithRow) {
        if (existing.row === row) {
          const conflict = !(
            segment.endDayIndex < existing.startDayIndex ||
            segment.startDayIndex > existing.endDayIndex
          );
          if (conflict) {
            hasConflict = true;
            break;
          }
        }
      }

      if (hasConflict) {
        row++;
      } else {
        foundRow = true;
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
  currentWeekEvents: Event[],
  currentWeekStart: Date,
  daysToShow: number = 7,
  appTimeZone?: string
): EventLayout | null => {
  const startDate = getDateByDayIndex(currentWeekStart, targetDay);
  const endDate = getDateByDayIndex(currentWeekStart, targetDay);
  startDate.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
  endDate.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

  const tempEvent: Event = {
    id: '-1',
    title: 'Temp',
    day: targetDay,
    start: dateToZonedDateTime(startDate, appTimeZone),
    end: dateToZonedDateTime(endDate, appTimeZone),
    calendarId: 'blue',
    allDay: false,
  };

  const allLayouts = calculateEventLayouts(
    [...currentWeekEvents, tempEvent],
    currentWeekStart,
    daysToShow,
    appTimeZone
  );
  return allLayouts.get(targetDay)?.get('-1') || null;
};

// Calculate drag layout — only computes the target day for performance
export const calculateDragLayout = (
  draggedEvent: Event,
  targetDay: number,
  targetStartHour: number,
  targetEndHour: number,
  currentWeekEvents: Event[],
  currentWeekStart: Date,
  daysToShow: number = 7,
  appTimeZone?: string
): EventLayout | null => {
  const tempEvents = currentWeekEvents.map(e => {
    if (e.id !== draggedEvent.id) return e;

    const eventDateForCalc = getDateByDayIndex(currentWeekStart, targetDay);
    const newStartDate = createDateWithHour(
      eventDateForCalc,
      targetStartHour
    ) as Date;
    const newEndDate = createDateWithHour(
      eventDateForCalc,
      targetEndHour
    ) as Date;
    const newStart = dateToZonedDateTime(newStartDate, appTimeZone);
    const newEnd = dateToZonedDateTime(newEndDate, appTimeZone);

    return { ...e, day: targetDay, start: newStart, end: newEnd };
  });

  const dayLayouts = EventLayoutCalculator.calculateDayEventLayouts(
    buildDayEventsForLayout(
      tempEvents,
      targetDay,
      currentWeekStart,
      daysToShow,
      appTimeZone
    ).events,
    { viewType: 'week' }
  );
  return dayLayouts.get(draggedEvent.id) || null;
};
