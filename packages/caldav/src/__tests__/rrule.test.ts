import { expandRRule, parseRRule } from '@caldav/ics/rrule';
import { Temporal } from 'temporal-polyfill';

// ─── parseRRule ───────────────────────────────────────────────────────────────

describe('parseRRule', () => {
  it('parses FREQ=WEEKLY', () => {
    const r = parseRRule('FREQ=WEEKLY');
    expect(r?.freq).toBe('WEEKLY');
    expect(r?.interval).toBe(1);
    expect(r?.byDay).toBeUndefined();
    expect(r?.count).toBeUndefined();
    expect(r?.until).toBeUndefined();
  });

  it('parses FREQ=DAILY with INTERVAL', () => {
    const r = parseRRule('FREQ=DAILY;INTERVAL=2');
    expect(r?.freq).toBe('DAILY');
    expect(r?.interval).toBe(2);
  });

  it('parses FREQ=WEEKLY with BYDAY', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(r?.byDay).toEqual([1, 3, 5]);
  });

  it('parses UNTIL date', () => {
    const r = parseRRule('FREQ=DAILY;UNTIL=20250131');
    expect(r?.until?.toString()).toBe('2025-01-31');
  });

  it('parses UNTIL datetime (strips time)', () => {
    const r = parseRRule('FREQ=DAILY;UNTIL=20250131T235959Z');
    expect(r?.until?.toString()).toBe('2025-01-31');
  });

  it('parses COUNT', () => {
    const r = parseRRule('FREQ=WEEKLY;COUNT=10');
    expect(r?.count).toBe(10);
  });

  it('parses FREQ=MONTHLY', () => {
    expect(parseRRule('FREQ=MONTHLY')?.freq).toBe('MONTHLY');
  });

  it('parses FREQ=YEARLY', () => {
    expect(parseRRule('FREQ=YEARLY')?.freq).toBe('YEARLY');
  });

  it('returns null for unsupported FREQ', () => {
    expect(parseRRule('FREQ=HOURLY')).toBeNull();
    expect(parseRRule('FREQ=MINUTELY')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(parseRRule('')).toBeNull();
    expect(parseRRule('NO_FREQ_HERE')).toBeNull();
  });

  it('returns null for invalid numeric fields', () => {
    expect(parseRRule('FREQ=DAILY;INTERVAL=0')).toBeNull();
    expect(parseRRule('FREQ=DAILY;INTERVAL=abc')).toBeNull();
    expect(parseRRule('FREQ=DAILY;COUNT=abc')).toBeNull();
  });

  it('strips ordinal from BYDAY (e.g. 1MO)', () => {
    const r = parseRRule('FREQ=MONTHLY;BYDAY=1MO');
    expect(r?.byDay).toEqual([1]); // MO=1
  });
});

// ─── expandRRule ──────────────────────────────────────────────────────────────

describe('expandRRule – DAILY', () => {
  const dtstart = Temporal.PlainDate.from('2025-01-01');
  const rangeStart = Temporal.PlainDate.from('2025-01-01');
  const rangeEnd = Temporal.PlainDate.from('2025-01-08'); // exclusive

  it('generates one occurrence per day', () => {
    const occurrences = expandRRule(
      'FREQ=DAILY',
      dtstart,
      rangeStart,
      rangeEnd
    );
    expect(occurrences).toHaveLength(7);
    expect((occurrences[0] as Temporal.PlainDate).toString()).toBe(
      '2025-01-01'
    );
    expect((occurrences[6] as Temporal.PlainDate).toString()).toBe(
      '2025-01-07'
    );
  });

  it('respects INTERVAL=2 (every other day)', () => {
    const occurrences = expandRRule(
      'FREQ=DAILY;INTERVAL=2',
      dtstart,
      rangeStart,
      rangeEnd
    );
    expect(occurrences).toHaveLength(4);
    expect((occurrences[0] as Temporal.PlainDate).toString()).toBe(
      '2025-01-01'
    );
    expect((occurrences[1] as Temporal.PlainDate).toString()).toBe(
      '2025-01-03'
    );
  });

  it('respects COUNT', () => {
    const range = Temporal.PlainDate.from('2026-01-01');
    const occurrences = expandRRule(
      'FREQ=DAILY;COUNT=3',
      dtstart,
      rangeStart,
      range
    );
    expect(occurrences).toHaveLength(3);
  });

  it('respects UNTIL', () => {
    const occurrences = expandRRule(
      'FREQ=DAILY;UNTIL=20250103',
      dtstart,
      rangeStart,
      rangeEnd
    );
    expect(occurrences).toHaveLength(3); // Jan 1, 2, 3
  });

  it('filters occurrences before rangeStart', () => {
    const laterRange = Temporal.PlainDate.from('2025-01-04');
    const occurrences = expandRRule(
      'FREQ=DAILY',
      dtstart,
      laterRange,
      rangeEnd
    );
    const dates = (occurrences as Temporal.PlainDate[]).map(d => d.toString());
    expect(dates).toContain('2025-01-04');
    expect(dates).not.toContain('2025-01-01');
  });

  it('returns empty array for range entirely before dtstart', () => {
    const beforeStart = Temporal.PlainDate.from('2024-12-01');
    const beforeEnd = Temporal.PlainDate.from('2024-12-31');
    const occurrences = expandRRule(
      'FREQ=DAILY',
      dtstart,
      beforeStart,
      beforeEnd
    );
    expect(occurrences).toHaveLength(0);
  });
});

describe('expandRRule – WEEKLY', () => {
  const dtstart = Temporal.PlainDate.from('2025-01-06'); // Monday
  const rangeStart = Temporal.PlainDate.from('2025-01-06');
  const rangeEnd = Temporal.PlainDate.from('2025-01-27'); // exclusive

  it('generates weekly occurrences (same weekday)', () => {
    const occurrences = expandRRule(
      'FREQ=WEEKLY',
      dtstart,
      rangeStart,
      rangeEnd
    );
    const dates = (occurrences as Temporal.PlainDate[]).map(d => d.toString());
    expect(dates).toEqual(['2025-01-06', '2025-01-13', '2025-01-20']);
  });

  it('generates BYDAY=MO,WE,FR occurrences', () => {
    const occurrences = expandRRule(
      'FREQ=WEEKLY;BYDAY=MO,WE,FR',
      dtstart,
      rangeStart,
      rangeEnd
    );
    const dates = (occurrences as Temporal.PlainDate[]).map(d => d.toString());
    expect(dates).toContain('2025-01-06'); // MO
    expect(dates).toContain('2025-01-08'); // WE
    expect(dates).toContain('2025-01-10'); // FR
    expect(dates).toContain('2025-01-13'); // MO (next week)
    expect(dates).not.toContain('2025-01-07'); // TU
    expect(dates).not.toContain('2025-01-09'); // TH
  });

  it('generates single BYDAY occurrence when it differs from DTSTART weekday', () => {
    const occurrences = expandRRule(
      'FREQ=WEEKLY;BYDAY=WE',
      dtstart,
      rangeStart,
      rangeEnd
    );
    const dates = (occurrences as Temporal.PlainDate[]).map(d => d.toString());
    expect(dates).toEqual(['2025-01-08', '2025-01-15', '2025-01-22']);
  });

  it('respects INTERVAL with BYDAY', () => {
    const occurrences = expandRRule(
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE',
      dtstart,
      rangeStart,
      Temporal.PlainDate.from('2025-02-10')
    );
    const dates = (occurrences as Temporal.PlainDate[]).map(d => d.toString());
    expect(dates).toEqual([
      '2025-01-06',
      '2025-01-08',
      '2025-01-20',
      '2025-01-22',
      '2025-02-03',
      '2025-02-05',
    ]);
  });

  it('respects COUNT for weekly', () => {
    const farRange = Temporal.PlainDate.from('2026-01-01');
    const occurrences = expandRRule(
      'FREQ=WEEKLY;COUNT=4',
      dtstart,
      rangeStart,
      farRange
    );
    expect(occurrences).toHaveLength(4);
  });
});

describe('expandRRule – MONTHLY', () => {
  const dtstart = Temporal.PlainDate.from('2025-01-15');
  const rangeStart = Temporal.PlainDate.from('2025-01-01');
  const rangeEnd = Temporal.PlainDate.from('2025-06-01');

  it('generates monthly occurrences on the same day', () => {
    const occurrences = expandRRule(
      'FREQ=MONTHLY',
      dtstart,
      rangeStart,
      rangeEnd
    );
    const dates = (occurrences as Temporal.PlainDate[]).map(d => d.toString());
    expect(dates).toEqual([
      '2025-01-15',
      '2025-02-15',
      '2025-03-15',
      '2025-04-15',
      '2025-05-15',
    ]);
  });
});

describe('expandRRule – YEARLY', () => {
  const dtstart = Temporal.PlainDate.from('2025-03-15');
  const rangeStart = Temporal.PlainDate.from('2025-01-01');
  const rangeEnd = Temporal.PlainDate.from('2028-01-01');

  it('generates yearly occurrences', () => {
    const occurrences = expandRRule(
      'FREQ=YEARLY',
      dtstart,
      rangeStart,
      rangeEnd
    );
    const dates = (occurrences as Temporal.PlainDate[]).map(d => d.toString());
    expect(dates).toEqual(['2025-03-15', '2026-03-15', '2027-03-15']);
  });
});

describe('expandRRule – timed events', () => {
  it('preserves time for PlainDateTime occurrences', () => {
    const dtstart = Temporal.PlainDateTime.from('2025-01-06T09:00:00');
    const rangeStart = Temporal.PlainDate.from('2025-01-06');
    // rangeEnd is exclusive: Jan 6 and Jan 13 are both < Jan 14
    const rangeEnd = Temporal.PlainDate.from('2025-01-14');

    const occurrences = expandRRule(
      'FREQ=WEEKLY',
      dtstart,
      rangeStart,
      rangeEnd
    );
    expect(occurrences).toHaveLength(2);
    const first = occurrences[0] as Temporal.PlainDateTime;
    expect(first.hour).toBe(9);
    expect(first.minute).toBe(0);
    expect(first.day).toBe(6); // Jan 6
    const second = occurrences[1] as Temporal.PlainDateTime;
    expect(second.day).toBe(13); // Jan 13
  });

  it('preserves timezone for ZonedDateTime occurrences', () => {
    const dtstart = Temporal.ZonedDateTime.from(
      '2025-01-06T09:00:00-05:00[America/New_York]'
    );
    const rangeStart = Temporal.PlainDate.from('2025-01-06');
    // rangeEnd is exclusive: only Jan 6 is < Jan 13
    const rangeEnd = Temporal.PlainDate.from('2025-01-13');

    const occurrences = expandRRule(
      'FREQ=WEEKLY',
      dtstart,
      rangeStart,
      rangeEnd
    );
    expect(occurrences).toHaveLength(1);
    const occ = occurrences[0] as Temporal.ZonedDateTime;
    expect(occ.timeZoneId).toBe('America/New_York');
    expect(occ.hour).toBe(9);
  });

  it('returns empty array for unsupported RRULE', () => {
    const dtstart = Temporal.PlainDate.from('2025-01-01');
    const rangeStart = Temporal.PlainDate.from('2025-01-01');
    const rangeEnd = Temporal.PlainDate.from('2025-02-01');
    expect(
      expandRRule('FREQ=HOURLY', dtstart, rangeStart, rangeEnd)
    ).toHaveLength(0);
  });
});
