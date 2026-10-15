import { describe, expect, it } from 'vitest';

import { formatDateLabel, formatDateRangeLabel } from '@/locale/intl';

import {
  calendarDateToDate,
  dateToCalendarDate,
  daysInCalendarMonth,
} from '../calendarSystem';

describe('calendar system conversions', () => {
  it.each(['en-US-u-ca-persian', 'fa-IR-u-ca-persian'])(
    'omits the Jalali era while preserving localized fields in %s',
    locale => {
      const date = new Date(2026, 7, 23);
      const options = { month: 'long', year: 'numeric' } as const;
      const label = formatDateLabel(date, locale, options);
      const parts = new Intl.DateTimeFormat(locale, options).formatToParts(
        date
      );

      for (const part of parts.filter(field => field.type !== 'literal')) {
        if (part.type === 'era') expect(label).not.toContain(part.value);
        else expect(label).toContain(part.value);
      }
      if (locale.startsWith('en')) expect(label).toBe('Shahrivar 1405');
      expect(label).toBe(label.trim());
    }
  );

  it('omits Jalali eras from date ranges and preserves Gregorian formatting', () => {
    const start = new Date(2025, 2, 21);
    const end = new Date(2026, 2, 21);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    } as const;
    expect(
      formatDateRangeLabel(start, end, 'en-US-u-ca-persian', options)
    ).toMatch(/^Farvardin 1, 1404\s+–\s+Farvardin 1, 1405$/);
    const gregorian = new Intl.DateTimeFormat('en-US', options);
    expect(formatDateLabel(start, 'en-US', options)).toBe(
      gregorian.format(start)
    );
    expect(formatDateRangeLabel(start, end, 'en-US', options)).toBe(
      gregorian.formatRange(start, end)
    );
  });

  it('preserves Gregorian dates', () => {
    const date = new Date(2025, 2, 20);

    expect(dateToCalendarDate(date)).toEqual({ year: 2025, month: 3, day: 20 });
    expect(calendarDateToDate({ year: 2025, month: 3, day: 20 })).toEqual(date);
  });

  it('converts a known Persian New Year date', () => {
    const date = calendarDateToDate({ year: 1404, month: 1, day: 1 }, 'jalali');

    expect(dateToCalendarDate(date, 'jalali')).toEqual({
      year: 1404,
      month: 1,
      day: 1,
    });
    expect(date).toEqual(new Date(2025, 2, 21));
  });

  it('returns Jalali month lengths, including leap-year behavior', () => {
    expect(daysInCalendarMonth(1404, 1, 'jalali')).toBe(31);
    expect(daysInCalendarMonth(1404, 7, 'jalali')).toBe(30);
    expect(daysInCalendarMonth(1403, 12, 'jalali')).toBe(30);
    expect(daysInCalendarMonth(1404, 12, 'jalali')).toBe(29);
  });
});
