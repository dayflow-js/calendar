import { parseICalDate, parseICalendar } from '@caldav/ics/parse';
import { formatICalDate, toICalendar } from '@caldav/ics/serialize';
import { Temporal } from 'temporal-polyfill';

// ─── parseICalendar ──────────────────────────────────────────────────────────

const VCAL_WRAPPER = (vevent: string) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${vevent}\r\nEND:VCALENDAR`;

describe('parseICalendar', () => {
  it('returns empty array for text with no VEVENT', () => {
    expect(parseICalendar('BEGIN:VCALENDAR\r\nEND:VCALENDAR')).toHaveLength(0);
  });

  it('parses a minimal timed event', () => {
    const ical = VCAL_WRAPPER(
      [
        'BEGIN:VEVENT',
        'UID:event-1@test',
        'SUMMARY:Meeting',
        'DTSTART:20250101T100000Z',
        'DTEND:20250101T110000Z',
        'END:VEVENT',
      ].join('\r\n')
    );

    const [vevent] = parseICalendar(ical);
    expect(vevent.uid).toBe('event-1@test');
    expect(vevent.summary).toBe('Meeting');
    expect(vevent.dtstart?.value).toBe('20250101T100000Z');
    expect(vevent.dtend?.value).toBe('20250101T110000Z');
  });

  it('parses an all-day event', () => {
    const ical = VCAL_WRAPPER(
      [
        'BEGIN:VEVENT',
        'UID:allday-1@test',
        'SUMMARY:Holiday',
        'DTSTART;VALUE=DATE:20250101',
        'DTEND;VALUE=DATE:20250102',
        'END:VEVENT',
      ].join('\r\n')
    );

    const [vevent] = parseICalendar(ical);
    expect(vevent.dtstart?.params.VALUE).toBe('DATE');
    expect(vevent.dtstart?.value).toBe('20250101');
    expect(vevent.dtend?.value).toBe('20250102');
  });

  it('parses a timezone-aware event', () => {
    const ical = VCAL_WRAPPER(
      [
        'BEGIN:VEVENT',
        'UID:tz-1@test',
        'SUMMARY:Call',
        'DTSTART;TZID=America/New_York:20250101T100000',
        'DTEND;TZID=America/New_York:20250101T110000',
        'END:VEVENT',
      ].join('\r\n')
    );

    const [vevent] = parseICalendar(ical);
    expect(vevent.dtstart?.params.TZID).toBe('America/New_York');
    expect(vevent.dtstart?.value).toBe('20250101T100000');
  });

  it('parses description and location', () => {
    const ical = VCAL_WRAPPER(
      [
        'BEGIN:VEVENT',
        'UID:desc-1@test',
        'SUMMARY:Event',
        'DESCRIPTION:Notes here',
        'LOCATION:Room A',
        'DTSTART:20250101T100000Z',
        'DTEND:20250101T110000Z',
        'END:VEVENT',
      ].join('\r\n')
    );

    const [vevent] = parseICalendar(ical);
    expect(vevent.description).toBe('Notes here');
    expect(vevent.location).toBe('Room A');
  });

  it('detects recurring events via RRULE', () => {
    const ical = VCAL_WRAPPER(
      [
        'BEGIN:VEVENT',
        'UID:recurring-1@test',
        'SUMMARY:Weekly Meeting',
        'DTSTART:20250101T100000Z',
        'DTEND:20250101T110000Z',
        'RRULE:FREQ=WEEKLY;BYDAY=MO',
        'END:VEVENT',
      ].join('\r\n')
    );

    const [vevent] = parseICalendar(ical);
    expect(vevent.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
  });

  it('unescapes special characters in text properties', () => {
    const ical = VCAL_WRAPPER(
      [
        'BEGIN:VEVENT',
        'UID:escape-1@test',
        'SUMMARY:Meeting\\; Q4',
        'DESCRIPTION:Line 1\\nLine 2',
        'DTSTART:20250101T100000Z',
        'DTEND:20250101T110000Z',
        'END:VEVENT',
      ].join('\r\n')
    );

    const [vevent] = parseICalendar(ical);
    expect(vevent.summary).toBe('Meeting; Q4');
    expect(vevent.description).toBe('Line 1\nLine 2');
  });

  it('unfolds long lines before parsing', () => {
    const longSummary = 'A'.repeat(60) + 'B'.repeat(60);
    const ical = VCAL_WRAPPER(
      [
        'BEGIN:VEVENT',
        'UID:fold-1@test',
        `SUMMARY:${'A'.repeat(60)}`,
        ` ${'B'.repeat(60)}`,
        'DTSTART:20250101T100000Z',
        'DTEND:20250101T110000Z',
        'END:VEVENT',
      ].join('\r\n')
    );

    const [vevent] = parseICalendar(ical);
    expect(vevent.summary).toBe(longSummary);
  });

  it('parses multiple VEVENTs', () => {
    const ical = VCAL_WRAPPER(
      [
        'BEGIN:VEVENT',
        'UID:e1@test',
        'SUMMARY:First',
        'DTSTART:20250101T100000Z',
        'DTEND:20250101T110000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:e2@test',
        'SUMMARY:Second',
        'DTSTART:20250102T100000Z',
        'DTEND:20250102T110000Z',
        'END:VEVENT',
      ].join('\r\n')
    );

    const vevents = parseICalendar(ical);
    expect(vevents).toHaveLength(2);
    expect(vevents[0].uid).toBe('e1@test');
    expect(vevents[1].uid).toBe('e2@test');
  });
});

// ─── parseICalDate ───────────────────────────────────────────────────────────

describe('parseICalDate', () => {
  it('parses DATE value to PlainDate', () => {
    const result = parseICalDate({
      value: '20250101',
      params: { VALUE: 'DATE' },
    });
    expect(result instanceof Temporal.PlainDate).toBe(true);
    const pd = result as Temporal.PlainDate;
    expect(pd.year).toBe(2025);
    expect(pd.month).toBe(1);
    expect(pd.day).toBe(1);
  });

  it('parses bare 8-digit value as PlainDate', () => {
    const result = parseICalDate({ value: '20251225', params: {} });
    expect(result instanceof Temporal.PlainDate).toBe(true);
    expect((result as Temporal.PlainDate).day).toBe(25);
  });

  it('parses UTC DATE-TIME to ZonedDateTime in UTC', () => {
    const result = parseICalDate({ value: '20250101T100000Z', params: {} });
    const zdt = result as Temporal.ZonedDateTime;
    expect(zdt.timeZoneId).toBe('UTC');
    expect(zdt.hour).toBe(10);
    expect(zdt.minute).toBe(0);
  });

  it('parses TZID DATE-TIME to ZonedDateTime with named timezone', () => {
    const result = parseICalDate({
      value: '20250101T100000',
      params: { TZID: 'America/New_York' },
    });
    const zdt = result as Temporal.ZonedDateTime;
    expect(zdt.timeZoneId).toBe('America/New_York');
    expect(zdt.hour).toBe(10);
  });

  it('parses floating DATE-TIME to PlainDateTime', () => {
    const result = parseICalDate({ value: '20250101T143000', params: {} });
    const pdt = result as Temporal.PlainDateTime;
    expect(pdt.hour).toBe(14);
    expect(pdt.minute).toBe(30);
    expect('timeZoneId' in pdt).toBe(false);
  });
});

// ─── formatICalDate ──────────────────────────────────────────────────────────

describe('formatICalDate', () => {
  it('formats PlainDate with VALUE=DATE param', () => {
    const pd = Temporal.PlainDate.from('2025-06-15');
    const { value, params } = formatICalDate(pd);
    expect(value).toBe('20250615');
    expect(params.VALUE).toBe('DATE');
  });

  it('formats PlainDateTime as floating value', () => {
    const pdt = Temporal.PlainDateTime.from('2025-06-15T09:30:00');
    const { value, params } = formatICalDate(pdt);
    expect(value).toBe('20250615T093000');
    expect(params.TZID).toBeUndefined();
  });

  it('formats ZonedDateTime in UTC with Z suffix', () => {
    const zdt = Temporal.ZonedDateTime.from('2025-06-15T09:30:00+00:00[UTC]');
    const { value, params } = formatICalDate(zdt);
    expect(value).toBe('20250615T093000Z');
    expect(Object.keys(params)).toHaveLength(0);
  });

  it('formats ZonedDateTime with named timezone as TZID param', () => {
    const zdt = Temporal.ZonedDateTime.from(
      '2025-06-15T09:30:00-04:00[America/New_York]'
    );
    const { value, params } = formatICalDate(zdt);
    expect(value).toBe('20250615T093000');
    expect(params.TZID).toBe('America/New_York');
  });
});

// ─── toICalendar ─────────────────────────────────────────────────────────────

describe('toICalendar', () => {
  it('produces a valid VCALENDAR wrapping a timed VEVENT', () => {
    const ical = toICalendar({
      uid: 'test-uid@dayflow',
      summary: 'Team Standup',
      dtstart: Temporal.ZonedDateTime.from('2025-01-15T09:00:00+00:00[UTC]'),
      dtend: Temporal.ZonedDateTime.from('2025-01-15T09:30:00+00:00[UTC]'),
    });

    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('END:VCALENDAR');
    expect(ical).toContain('BEGIN:VEVENT');
    expect(ical).toContain('END:VEVENT');
    expect(ical).toContain('UID:test-uid@dayflow');
    expect(ical).toContain('SUMMARY:Team Standup');
    expect(ical).toContain('DTSTART:20250115T090000Z');
    expect(ical).toContain('DTEND:20250115T093000Z');
  });

  it('produces a valid all-day VEVENT', () => {
    const ical = toICalendar({
      uid: 'allday@dayflow',
      summary: 'Holiday',
      dtstart: Temporal.PlainDate.from('2025-01-01'),
      dtend: Temporal.PlainDate.from('2025-01-02'),
    });

    expect(ical).toContain('DTSTART;VALUE=DATE:20250101');
    expect(ical).toContain('DTEND;VALUE=DATE:20250102');
  });

  it('includes DESCRIPTION and LOCATION when provided', () => {
    const ical = toICalendar({
      uid: 'desc@dayflow',
      summary: 'Event',
      description: 'Detailed notes',
      location: 'Room B',
      dtstart: Temporal.PlainDateTime.from('2025-01-15T10:00:00'),
      dtend: Temporal.PlainDateTime.from('2025-01-15T11:00:00'),
    });

    expect(ical).toContain('DESCRIPTION:Detailed notes');
    expect(ical).toContain('LOCATION:Room B');
  });

  it('escapes special characters in SUMMARY', () => {
    const ical = toICalendar({
      uid: 'escape@dayflow',
      summary: 'Q4 Review; Final',
      dtstart: Temporal.PlainDateTime.from('2025-01-15T10:00:00'),
      dtend: Temporal.PlainDateTime.from('2025-01-15T11:00:00'),
    });

    expect(ical).toContain('SUMMARY:Q4 Review\\; Final');
  });

  it('uses CRLF line endings', () => {
    const ical = toICalendar({
      uid: 'crlf@dayflow',
      summary: 'Test',
      dtstart: Temporal.PlainDate.from('2025-01-01'),
      dtend: Temporal.PlainDate.from('2025-01-02'),
    });

    expect(ical).toContain('\r\n');
    expect(ical.endsWith('\r\n')).toBe(true);
  });

  it('produces output that round-trips through the parser', () => {
    const uid = 'roundtrip@dayflow';
    const ical = toICalendar({
      uid,
      summary: 'Round Trip',
      description: 'Some notes',
      dtstart: Temporal.ZonedDateTime.from('2025-03-10T14:00:00+00:00[UTC]'),
      dtend: Temporal.ZonedDateTime.from('2025-03-10T15:00:00+00:00[UTC]'),
    });

    const [vevent] = parseICalendar(ical);
    expect(vevent.uid).toBe(uid);
    expect(vevent.summary).toBe('Round Trip');
    expect(vevent.description).toBe('Some notes');
    expect(vevent.dtstart?.value).toBe('20250310T140000Z');
  });
});
