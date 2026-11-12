import { Temporal } from 'temporal-polyfill';

import { dateToCalendarDate } from '@/calendar/calendarSystem';
import {
  generateDayData,
  generateWeekData,
  generateWeekRange,
} from '@/utils/calendarDataUtils';
import { monthNames, shortMonthNames } from '@/utils/dateConstants';

/** Every local day from `start`, `count` days long (DST-safe: steps by date). */
const eachDay = (start: Date, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

const persianMonth = (date: Date, month: 'long' | 'short') =>
  date.toLocaleDateString('en-US-u-ca-persian', { month });

describe('generateDayData', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('gregorian fast path', () => {
    it('matches the calendar-system conversion for every day of a leap and a common year', () => {
      // 2024 is a leap year; the range also crosses DST transitions in zones that have them.
      for (const date of eachDay(new Date(2024, 0, 1), 731)) {
        const parts = dateToCalendarDate(date, 'gregorian');
        const data = generateDayData(date, 'gregorian');
        expect(data.day).toBe(parts.day);
        expect(data.month).toBe(parts.month - 1);
        expect(data.year).toBe(parts.year);
        expect(data.monthName).toBe(monthNames[parts.month - 1]);
        expect(data.shortMonthName).toBe(shortMonthNames[parts.month - 1]);
      }
    });

    it('uses gregorian when no calendar system is given', () => {
      const date = new Date(2024, 1, 29);
      expect(generateDayData(date)).toEqual(generateDayData(date, 'gregorian'));
    });

    it('clones the input date and accepts timestamps and strings', () => {
      const date = new Date(2026, 4, 12, 15, 30);
      const data = generateDayData(date, 'gregorian');
      expect(data.date).not.toBe(date);
      expect(data.date.getTime()).toBe(date.getTime());

      expect(generateDayData(date.getTime(), 'gregorian')).toMatchObject({
        day: 12,
        month: 4,
        year: 2026,
      });
      expect(generateDayData('2026-05-12T10:00:00', 'gregorian')).toMatchObject(
        { day: 12, month: 4, year: 2026 }
      );
    });

    it('skips Temporal and Intl entirely', () => {
      const temporal = vi.spyOn(Temporal.PlainDate, 'from');
      const intl = vi.spyOn(Intl, 'DateTimeFormat');
      const toLocale = vi.spyOn(Date.prototype, 'toLocaleDateString');
      try {
        for (const date of eachDay(new Date(2026, 0, 1), 60)) {
          generateDayData(date, 'gregorian');
        }
        expect(temporal).not.toHaveBeenCalled();
        expect(intl).not.toHaveBeenCalled();
        expect(toLocale).not.toHaveBeenCalled();
      } finally {
        temporal.mockRestore();
        intl.mockRestore();
        toLocale.mockRestore();
      }
    });
  });

  describe('jalali', () => {
    it('matches the Persian calendar for every day of a leap and a common year', () => {
      // 1403 is a Persian leap year (30 Esfand = 2025-03-20); 1404 starts 2025-03-21.
      for (const date of eachDay(new Date(2024, 2, 20), 731)) {
        const parts = dateToCalendarDate(date, 'jalali');
        const data = generateDayData(date, 'jalali');
        expect(data.day).toBe(parts.day);
        expect(data.month).toBe(parts.month - 1);
        expect(data.year).toBe(parts.year);
      }
    });

    it('names all twelve Persian months like toLocaleDateString does', () => {
      const seen = new Set<string>();
      for (const date of eachDay(new Date(2025, 2, 21), 365)) {
        const data = generateDayData(date, 'jalali');
        expect(data.monthName).toBe(persianMonth(date, 'long'));
        expect(data.shortMonthName).toBe(persianMonth(date, 'short'));
        seen.add(data.monthName);
      }
      expect(seen.size).toBe(12);
      expect([...seen][0]).toBe('Farvardin');
    });

    it('reuses its month formatters across calls', () => {
      generateDayData(new Date(2025, 2, 21), 'jalali'); // warm the cache
      const intl = vi.spyOn(Intl, 'DateTimeFormat');
      // toLocaleDateString builds a fresh formatter internally on every call
      const toLocale = vi.spyOn(Date.prototype, 'toLocaleDateString');
      try {
        for (const date of eachDay(new Date(2025, 2, 21), 200)) {
          generateDayData(date, 'jalali');
        }
        expect(intl).not.toHaveBeenCalled();
        expect(toLocale).not.toHaveBeenCalled();
      } finally {
        intl.mockRestore();
        toLocale.mockRestore();
      }
    });
  });

  describe('isToday', () => {
    it.each(['gregorian', 'jalali'] as const)(
      'flags only the current local day in %s mode, whatever the time',
      system => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 4, 12, 23, 59, 59));

        expect(generateDayData(new Date(2026, 4, 12), system).isToday).toBe(
          true
        );
        expect(
          generateDayData(new Date(2026, 4, 12, 0, 0, 1), system).isToday
        ).toBe(true);
        expect(generateDayData(new Date(2026, 4, 11), system).isToday).toBe(
          false
        );
        expect(generateDayData(new Date(2026, 4, 13), system).isToday).toBe(
          false
        );
        // Same day and month in another year
        expect(generateDayData(new Date(2025, 4, 12), system).isToday).toBe(
          false
        );
      }
    );
  });
});

describe('generateWeekData', () => {
  it.each(['gregorian', 'jalali'] as const)(
    'returns seven consecutive days in %s mode',
    system => {
      const start = new Date(2025, 2, 15);
      const week = generateWeekData(start, system);
      expect(week.days).toHaveLength(7);
      week.days.forEach((day, i) => {
        const expected = new Date(2025, 2, 15 + i);
        expect(day.date.getTime()).toBe(expected.getTime());
        expect(day).toMatchObject(
          (({ date: _date, isToday: _today, ...rest }) => rest)(
            generateDayData(expected, system)
          )
        );
      });
    }
  );

  it('crosses the Persian new year inside one week', () => {
    // 2025-03-17 .. 2025-03-23 spans 27 Esfand 1403 .. 3 Farvardin 1404
    const week = generateWeekData(new Date(2025, 2, 17), 'jalali');
    expect(week.days.map(d => [d.year, d.month + 1, d.day])).toEqual([
      [1403, 12, 27],
      [1403, 12, 28],
      [1403, 12, 29],
      [1403, 12, 30],
      [1404, 1, 1],
      [1404, 1, 2],
      [1404, 1, 3],
    ]);
    expect(week.days[3]?.monthName).toBe('Esfand');
    expect(week.days[4]?.monthName).toBe('Farvardin');
  });

  it('crosses a gregorian year boundary inside one week', () => {
    const week = generateWeekData(new Date(2025, 11, 29), 'gregorian');
    expect(week.days.map(d => [d.year, d.month, d.day])).toEqual([
      [2025, 11, 29],
      [2025, 11, 30],
      [2025, 11, 31],
      [2026, 0, 1],
      [2026, 0, 2],
      [2026, 0, 3],
      [2026, 0, 4],
    ]);
  });
});

describe('generateWeekRange', () => {
  it.each(['gregorian', 'jalali'] as const)(
    'builds contiguous weeks starting on startOfWeek in %s mode',
    system => {
      const weeks = generateWeekRange(new Date(2025, 2, 21), 10, 6, system);
      expect(weeks).toHaveLength(10);
      const days = weeks.flatMap(w => w.days);
      expect(days[0]?.date.getDay()).toBe(6);
      for (let i = 1; i < days.length; i++) {
        const prev = days[i - 1]!.date;
        const next = new Date(prev);
        next.setDate(prev.getDate() + 1);
        expect(days[i]!.date.getTime()).toBe(next.getTime());
      }
      expect(
        days.some(d => d.date.getTime() === new Date(2025, 2, 21).getTime())
      ).toBe(true);
    }
  );
});
