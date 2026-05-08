import type { Event } from '@dayflow/core';
import type { GoogleEventInput, GoogleDateTime } from '@google-sync/types/api';
import { Temporal } from 'temporal-polyfill';

function isPlainDate(
  dt: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): boolean {
  return !('hour' in dt);
}

function formatGoogleDateTime(
  dt: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  startDt?: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): GoogleDateTime {
  if (isPlainDate(dt)) {
    const pd = dt as Temporal.PlainDate;
    // DayFlow end is inclusive for all-day; Google end is exclusive
    const googleEnd =
      startDt && isPlainDate(startDt) ? pd.add({ days: 1 }) : pd;
    return { date: googleEnd.toString() };
  }

  if ('timeZoneId' in dt) {
    const zdt = dt as Temporal.ZonedDateTime;
    return {
      dateTime: `${zdt.toPlainDateTime().toString({ smallestUnit: 'second' })}${zdt.offset}`,
      timeZone: zdt.timeZoneId,
    };
  }

  // PlainDateTime — no timezone info, emit as local ISO
  const pdt = dt as Temporal.PlainDateTime;
  return { dateTime: pdt.toString({ smallestUnit: 'second' }) };
}

/**
 * Map a DayFlow Event to a Google Calendar EventInput for create/update.
 */
export function mapDayFlowEventToGoogle(event: Event): GoogleEventInput {
  return {
    summary: event.title,
    description: event.description,
    location:
      typeof event.meta?.location === 'string'
        ? event.meta.location
        : undefined,
    start: formatGoogleDateTime(event.start),
    end: formatGoogleDateTime(event.end, event.start),
  };
}
