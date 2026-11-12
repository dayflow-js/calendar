import type { Event } from '@/types';
import { isPlainDate } from '@/utils/temporal';
import { temporalToVisualDate } from '@/utils/temporalTypeGuards';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RecurrenceEnd =
  | { type: 'never' }
  | { type: 'on-date'; date: string }
  | { type: 'after'; occurrences: number };

export interface EventRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  end: RecurrenceEnd;
  /** RRULE parts not managed by the default editor, such as BYDAY. */
  extraParts: string[];
}

const FREQUENCIES: ReadonlySet<RecurrenceFrequency> = new Set([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);

const clampPositiveInteger = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(999, Math.max(1, Math.trunc(value)));
};

const toDateInputValue = (value: string): string => {
  const compactDate = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compactDate) {
    return `${compactDate[1]}-${compactDate[2]}-${compactDate[3]}`;
  }

  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return isoDate?.[1] ?? '';
};

const toRRuleDate = (value: string): string => value.replaceAll('-', '');

export const getEventRecurrenceRule = (event: Event): string | null => {
  const rule = event.meta?.recurrenceRule;
  if (typeof rule !== 'string' || rule.trim() === '') return null;
  return rule.trim().replace(/^RRULE:/i, '');
};

export const parseEventRecurrence = (event: Event): EventRecurrence | null => {
  const rule = getEventRecurrenceRule(event);
  if (!rule) return null;

  let frequency: RecurrenceFrequency | null = null;
  let interval = 1;
  let end: RecurrenceEnd = { type: 'never' };
  const extraParts: string[] = [];

  for (const rawPart of rule.split(';')) {
    const part = rawPart.trim();
    if (!part) continue;
    const separator = part.indexOf('=');
    const key = separator >= 0 ? part.slice(0, separator).toUpperCase() : '';
    const value = separator >= 0 ? part.slice(separator + 1) : '';

    if (
      key === 'FREQ' &&
      FREQUENCIES.has(value.toUpperCase() as RecurrenceFrequency)
    ) {
      frequency = value.toUpperCase() as RecurrenceFrequency;
    } else if (key === 'INTERVAL') {
      interval = clampPositiveInteger(Number(value), 1);
    } else if (key === 'UNTIL') {
      const date = toDateInputValue(value);
      if (date) end = { type: 'on-date', date };
    } else if (key === 'COUNT') {
      end = {
        type: 'after',
        occurrences: clampPositiveInteger(Number(value), 10),
      };
    } else {
      extraParts.push(part);
    }
  }

  if (!frequency) return null;

  return { frequency, interval, end, extraParts };
};

export const serializeEventRecurrence = (
  recurrence: EventRecurrence
): string => {
  const parts = [`FREQ=${recurrence.frequency}`];
  const interval = clampPositiveInteger(recurrence.interval, 1);
  if (interval > 1) parts.push(`INTERVAL=${interval}`);

  if (recurrence.end.type === 'on-date' && recurrence.end.date) {
    parts.push(`UNTIL=${toRRuleDate(recurrence.end.date)}`);
  } else if (recurrence.end.type === 'after') {
    parts.push(`COUNT=${clampPositiveInteger(recurrence.end.occurrences, 10)}`);
  }

  parts.push(...recurrence.extraParts);
  return parts.join(';');
};

export const setEventRecurrence = (
  event: Event,
  recurrence: EventRecurrence | null
): Event => {
  const meta = { ...event.meta };

  if (recurrence) {
    meta.recurring = true;
    meta.recurrenceRule = serializeEventRecurrence(recurrence);
  } else {
    delete meta.recurring;
    delete meta.recurrenceRule;
  }

  return {
    ...event,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  };
};

type EventTemporal = Event['start'];

const getPlainDate = (value: EventTemporal) =>
  isPlainDate(value) ? value : value.toPlainDate();

const getRecurrenceDuration = (
  frequency: RecurrenceFrequency,
  amount: number
) => {
  switch (frequency) {
    case 'DAILY':
      return { days: amount };
    case 'WEEKLY':
      return { weeks: amount };
    case 'MONTHLY':
      return { months: amount };
    case 'YEARLY':
      return { years: amount };
    default:
      return { days: amount };
  }
};

const addRecurrenceDuration = (
  value: EventTemporal,
  frequency: RecurrenceFrequency,
  amount: number,
  overflow: 'constrain' | 'reject' = 'reject'
): EventTemporal =>
  value.add(getRecurrenceDuration(frequency, amount), {
    overflow,
  }) as EventTemporal;

// Completion is stored on the series master and only applies to its own date.
const getOccurrenceTask = (event: Event): Event['task'] =>
  event.task?.completed
    ? { ...event.task, completed: false, completedAt: undefined }
    : event.task;

const createOccurrence = (
  event: Event,
  recurrence: EventRecurrence,
  occurrenceIndex: number
): Event | null => {
  if (occurrenceIndex === 0) return event;

  const amount = occurrenceIndex * recurrence.interval;
  try {
    const start = addRecurrenceDuration(
      event.start,
      recurrence.frequency,
      amount
    );
    const end = addRecurrenceDuration(event.end, recurrence.frequency, amount);
    const recurrenceKey = getPlainDate(start).toString();

    return {
      ...event,
      id: `${event.id}::repeat-${recurrenceKey}`,
      start,
      end,
      task: getOccurrenceTask(event),
      _recurrenceMasterId: event.id,
      _recurrenceKey: recurrenceKey,
    };
  } catch {
    // RRULE skips invalid calendar dates (for example, the 31st in April).
    return null;
  }
};

const createDayShiftedOccurrence = (event: Event, dayOffset: number): Event => {
  if (dayOffset === 0) return event;

  const start = event.start.add({ days: dayOffset }) as EventTemporal;
  const end = event.end.add({ days: dayOffset }) as EventTemporal;
  const recurrenceKey = getPlainDate(start).toString();
  return {
    ...event,
    id: `${event.id}::repeat-${recurrenceKey}`,
    start,
    end,
    task: getOccurrenceTask(event),
    _recurrenceMasterId: event.id,
    _recurrenceKey: recurrenceKey,
  };
};

const WEEKDAY_NUMBER_BY_CODE: Record<string, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};

const getWeeklyByDayNumbers = (recurrence: EventRecurrence): number[] => {
  const byDay = recurrence.extraParts.find(part =>
    part.toUpperCase().startsWith('BYDAY=')
  );
  if (!byDay) return [];

  return [
    ...new Set(
      byDay
        .slice(byDay.indexOf('=') + 1)
        .toUpperCase()
        .split(',')
        .map(code => WEEKDAY_NUMBER_BY_CODE[code])
        .filter((day): day is number => day !== undefined)
    ),
  ].toSorted((a, b) => a - b);
};

/**
 * Expand recurrence masters into render-only occurrences for a bounded range.
 * Non-recurring events are returned unchanged. The original event remains the
 * canonical series master; generated IDs encode the master ID before `::`.
 */
export const expandRecurringEvents = (
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date,
  timeZone?: string
): Event[] => {
  const expanded: Event[] = [];

  for (const event of events) {
    const recurrence = parseEventRecurrence(event);
    if (!recurrence) {
      expanded.push(event);
      continue;
    }

    const maxOccurrences =
      recurrence.end.type === 'after'
        ? recurrence.end.occurrences
        : Number.POSITIVE_INFINITY;
    const until =
      recurrence.end.type === 'on-date' ? recurrence.end.date : null;
    let validOccurrenceCount = 0;

    const weeklyDays =
      recurrence.frequency === 'WEEKLY'
        ? getWeeklyByDayNumbers(recurrence)
        : [];
    if (weeklyDays.length > 0) {
      const masterDay = getPlainDate(event.start).dayOfWeek;
      let reachedEnd = false;

      for (let cycle = 0; cycle < 10000 && !reachedEnd; cycle++) {
        const dayOffsets =
          cycle === 0
            ? [
                0,
                ...weeklyDays
                  .map(day => day - masterDay)
                  .filter(offset => offset > 0),
              ]
            : weeklyDays.map(
                day => cycle * recurrence.interval * 7 + day - masterDay
              );

        for (const dayOffset of [...new Set(dayOffsets)].toSorted(
          (a, b) => a - b
        )) {
          if (validOccurrenceCount >= maxOccurrences) {
            reachedEnd = true;
            break;
          }

          const occurrence = createDayShiftedOccurrence(event, dayOffset);
          const occurrenceDate = getPlainDate(occurrence.start).toString();
          const occurrenceStart = temporalToVisualDate(
            occurrence.start,
            timeZone
          ).getTime();

          if (until && occurrenceDate > until) {
            reachedEnd = true;
            break;
          }
          if (occurrenceStart > rangeEnd.getTime()) {
            reachedEnd = true;
            break;
          }

          validOccurrenceCount++;
          const occurrenceEnd = temporalToVisualDate(
            occurrence.end,
            timeZone
          ).getTime();
          if (
            occurrenceEnd >= rangeStart.getTime() &&
            occurrenceStart <= rangeEnd.getTime()
          ) {
            expanded.push(occurrence);
          }
        }
      }
      continue;
    }

    for (let index = 0; index < 10000; index++) {
      if (validOccurrenceCount >= maxOccurrences) break;
      const approximateStart = addRecurrenceDuration(
        event.start,
        recurrence.frequency,
        index * recurrence.interval,
        'constrain'
      );
      const approximateDate = getPlainDate(approximateStart).toString();

      if (until && approximateDate > until) break;
      if (
        temporalToVisualDate(approximateStart, timeZone).getTime() >
        rangeEnd.getTime()
      ) {
        break;
      }

      const occurrence = createOccurrence(event, recurrence, index);
      if (!occurrence) continue;
      validOccurrenceCount++;

      const occurrenceStart = temporalToVisualDate(
        occurrence.start,
        timeZone
      ).getTime();
      const occurrenceEnd = temporalToVisualDate(
        occurrence.end,
        timeZone
      ).getTime();

      if (
        occurrenceEnd >= rangeStart.getTime() &&
        occurrenceStart <= rangeEnd.getTime()
      ) {
        expanded.push(occurrence);
      }
    }
  }

  return expanded;
};
