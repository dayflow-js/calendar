import { Temporal } from 'temporal-polyfill';

/** Display calendar. Event dates and recurrence rules retain their ISO identity. */
export type CalendarSystem = 'gregorian' | 'jalali';

export interface CalendarDate {
  year: number;
  /** One-based calendar month. */
  month: number;
  day: number;
}

const calendarIds = { gregorian: 'iso8601', jalali: 'persian' } as const;

function toPlainDate(date: Date, system: CalendarSystem) {
  // Views use local Date fields as wall-calendar dates, independently of the
  // timezone used to project event instants into those fields.
  return Temporal.PlainDate.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }).withCalendar(calendarIds[system]);
}

function fromPlainDate(date: Temporal.PlainDate): Date {
  const iso = date.withCalendar('iso8601');
  const result = new Date(0);
  result.setFullYear(iso.year, iso.month - 1, iso.day);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function dateToCalendarDate(
  date: Date,
  system: CalendarSystem = 'gregorian'
): CalendarDate {
  const value = toPlainDate(date, system);
  return { year: value.year, month: value.month, day: value.day };
}

export function calendarDateToDate(
  date: CalendarDate,
  system: CalendarSystem = 'gregorian'
): Date {
  return fromPlainDate(
    Temporal.PlainDate.from(
      { ...date, calendar: calendarIds[system] },
      { overflow: 'reject' }
    )
  );
}

export function daysInCalendarMonth(
  year: number,
  month: number,
  system: CalendarSystem = 'gregorian'
): number {
  return Temporal.PlainDate.from(
    { year, month, day: 1, calendar: calendarIds[system] },
    { overflow: 'reject' }
  ).daysInMonth;
}

export function startOfCalendarMonth(
  date: Date,
  system: CalendarSystem = 'gregorian'
): Date {
  return fromPlainDate(toPlainDate(date, system).with({ day: 1 }));
}

/** Move by calendar months, constraining the day to the target month's length. */
export function addCalendarMonths(
  date: Date,
  months: number,
  system: CalendarSystem = 'gregorian'
): Date {
  const result = fromPlainDate(toPlainDate(date, system).add({ months }));
  result.setHours(
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
  return result;
}

/** Preserve existing locale behavior unless Jalali explicitly overrides it. */
export function calendarLocale(locale: string, system: CalendarSystem): string {
  if (system === 'gregorian') return locale;

  return new Intl.Locale(locale, {
    calendar: 'persian',
  }).toString();
}

/** Build a local date using zero-based month and overflowing day offsets. */
export function createCalendarDate(
  year: number,
  monthIndex: number,
  day: number,
  system: CalendarSystem = 'gregorian'
): Date {
  return fromPlainDate(
    Temporal.PlainDate.from({
      year,
      month: 1,
      day: 1,
      calendar: calendarIds[system],
    })
      .add({ months: monthIndex })
      .add({ days: day - 1 })
  );
}
