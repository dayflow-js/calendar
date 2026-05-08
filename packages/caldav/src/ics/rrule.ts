import { Temporal } from 'temporal-polyfill';

// ─── RRULE parsing ────────────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};

export type RRuleFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type ParsedRRule = {
  freq: RRuleFreq;
  /** Recurrence interval (default: 1). */
  interval: number;
  /** Inclusive termination date. */
  until?: Temporal.PlainDate;
  /** Maximum number of occurrences. */
  count?: number;
  /** ISO day-of-week values for BYDAY (1=MO … 7=SU). */
  byDay?: number[];
};

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
}

/**
 * Parse an iCalendar RRULE string into structured components.
 *
 * Only the properties relevant to basic expansion are parsed.
 * Complex modifiers (BYHOUR, BYMINUTE, BYSETPOS, negative BYDAY offsets, etc.)
 * are silently ignored.
 *
 * Returns null for unsupported or malformed RRULE values.
 */
export function parseRRule(rrule: string): ParsedRRule | null {
  const parts: Record<string, string> = {};
  for (const segment of rrule.split(';')) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.slice(0, eq).toUpperCase()] = segment.slice(eq + 1);
  }

  const freq = parts['FREQ']?.toUpperCase() as RRuleFreq | undefined;
  if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) {
    return null;
  }

  const interval = parsePositiveInteger(parts['INTERVAL'] ?? '1');
  if (!interval) return null;

  let until: Temporal.PlainDate | undefined;
  if (parts['UNTIL']) {
    const raw = parts['UNTIL'].replace(/T.*$/, ''); // strip time component
    try {
      until = Temporal.PlainDate.from(
        `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
      );
    } catch {
      // ignore malformed UNTIL
    }
  }

  const parsedCount = parts['COUNT']
    ? parsePositiveInteger(parts['COUNT'])
    : undefined;
  if (parts['COUNT'] && !parsedCount) return null;
  const count = parsedCount ?? undefined;

  let byDay: number[] | undefined;
  if (parts['BYDAY']) {
    const days = parts['BYDAY']
      .split(',')
      .map(d => DAY_MAP[d.replaceAll(/[+\-\d]/g, '').toUpperCase()])
      .filter((d): d is number => d !== undefined);
    if (days.length > 0) byDay = days;
  }

  return { freq, interval, until, count, byDay };
}

// ─── RRULE expansion ──────────────────────────────────────────────────────────

const MAX_OCCURRENCES = 500;

function isWeeklyByDayOccurrence(
  current: Temporal.PlainDate,
  startDate: Temporal.PlainDate,
  rule: ParsedRRule
): boolean {
  if (!rule.byDay?.includes(current.dayOfWeek)) return false;
  if (Temporal.PlainDate.compare(current, startDate) < 0) return false;

  const daysSinceStart = startDate.until(current, { largestUnit: 'day' }).days;
  const weeksSinceStart = Math.floor(daysSinceStart / 7);
  return weeksSinceStart % rule.interval === 0;
}

/** Advance a PlainDate by the recurrence interval. */
function advance(
  date: Temporal.PlainDate,
  rule: ParsedRRule
): Temporal.PlainDate {
  switch (rule.freq) {
    case 'DAILY':
      return date.add({ days: rule.interval });
    case 'WEEKLY':
      return date.add({ weeks: rule.interval });
    case 'MONTHLY':
      return date.add({ months: rule.interval });
    case 'YEARLY':
      return date.add({ years: rule.interval });
    default:
      return date;
  }
}

/**
 * Shift `dtstart` to a given `targetDate`, preserving the original time and timezone.
 *
 * e.g. if dtstart is 2025-01-01T10:00:00[America/New_York] and targetDate is 2025-01-08,
 *      returns  2025-01-08T10:00:00[America/New_York].
 */
function shiftDate(
  dtstart: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  targetDate: Temporal.PlainDate
): Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime {
  if (!('hour' in dtstart)) {
    return targetDate; // PlainDate — no time component to carry over
  }

  if ('timeZoneId' in dtstart) {
    const zdt = dtstart as Temporal.ZonedDateTime;
    return Temporal.ZonedDateTime.from({
      year: targetDate.year,
      month: targetDate.month,
      day: targetDate.day,
      hour: zdt.hour,
      minute: zdt.minute,
      second: zdt.second,
      timeZone: zdt.timeZoneId,
    });
  }

  // PlainDateTime
  const pdt = dtstart as Temporal.PlainDateTime;
  return Temporal.PlainDateTime.from({
    year: targetDate.year,
    month: targetDate.month,
    day: targetDate.day,
    hour: pdt.hour,
    minute: pdt.minute,
    second: pdt.second,
  });
}

/**
 * Expand a recurring event into occurrence dates within a range.
 *
 * Supports:
 *   FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with INTERVAL
 *   BYDAY for WEEKLY (e.g. MO,WE,FR)
 *   UNTIL and COUNT termination
 *
 * Does not support BYHOUR, BYMINUTE, BYSETPOS, or negative BYDAY offsets.
 * These cases occur infrequently and are deferred to a future dedicated library.
 *
 * @param rrule      Raw RRULE string from iCal (e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR")
 * @param dtstart    Event start date (PlainDate for all-day, PlainDateTime/ZonedDateTime for timed)
 * @param rangeStart Inclusive start of the visible range (PlainDate)
 * @param rangeEnd   Exclusive end of the visible range (PlainDate)
 * @returns Array of occurrence start dates within the range. Empty if RRULE is unsupported.
 */
export function expandRRule(
  rrule: string,
  dtstart: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  rangeStart: Temporal.PlainDate,
  rangeEnd: Temporal.PlainDate
): Array<Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime> {
  const parsed = parseRRule(rrule);
  if (!parsed) return [];

  // Normalise dtstart to a PlainDate for iteration logic
  const startDate =
    'toPlainDate' in dtstart
      ? (
          dtstart as Temporal.PlainDateTime | Temporal.ZonedDateTime
        ).toPlainDate()
      : (dtstart as Temporal.PlainDate);

  const results: Array<
    Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
  > = [];
  let occurrenceCount = 0;
  let iterCount = 0;

  let current = startDate;
  const shouldScanByDay = parsed.freq === 'WEEKLY' && parsed.byDay;

  while (iterCount++ < MAX_OCCURRENCES * 10) {
    // Termination: exceeded UNTIL or COUNT
    if (parsed.until && Temporal.PlainDate.compare(current, parsed.until) > 0)
      break;
    if (parsed.count && occurrenceCount >= parsed.count) break;
    // Termination: exceeded range end
    if (Temporal.PlainDate.compare(current, rangeEnd) >= 0) break;

    // Check if current date matches the recurrence pattern
    const isOccurrence = shouldScanByDay
      ? isWeeklyByDayOccurrence(current, startDate, parsed)
      : Temporal.PlainDate.compare(current, startDate) >= 0;

    if (isOccurrence) {
      occurrenceCount++;
      // Only include occurrences within the requested range
      if (Temporal.PlainDate.compare(current, rangeStart) >= 0) {
        // Reconstruct occurrence with the same time/timezone as dtstart
        results.push(shiftDate(dtstart, current));
      }
    }

    // Advance to the next candidate date
    if (shouldScanByDay) {
      current = current.add({ days: 1 });
    } else {
      current = advance(current, parsed);
    }
  }

  return results;
}
