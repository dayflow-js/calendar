import { Temporal } from 'temporal-polyfill';

import { Event } from '@/types/event';
import { generateICS } from '@/utils/ics/icsGenerator';
import { parseICS } from '@/utils/ics/icsParser';
import { expandRecurringEvents } from '@/utils/recurrence';

const withTzid = (tzid: string) => `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:tz@example.com
DTSTART;TZID=${tzid}:20261120T090000
DTEND;TZID=${tzid}:20261120T100000
SUMMARY:Standup
END:VEVENT
END:VCALENDAR`;

describe('ICS Utilities', () => {
  const mockDate = Temporal.PlainDateTime.from('2025-01-15T10:00:00');
  const mockEndDate = Temporal.PlainDateTime.from('2025-01-15T12:00:00');

  const mockEvent: Event = {
    id: 'test-event-1',
    title: 'Test Event',
    description: 'This is a test event',
    start: mockDate,
    end: mockEndDate,
    allDay: false,
    meta: {
      location: 'Test Location',
      categories: ['Work', 'Meeting'],
    },
  };

  const simpleICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DayFlow//DayFlow Calendar//EN
BEGIN:VEVENT
UID:test-uid-123
DTSTAMP:20250101T000000Z
DTSTART:20250115T100000
DTEND:20250115T120000
SUMMARY:Test Event
DESCRIPTION:This is a test event
LOCATION:Test Location
CATEGORIES:Work,Meeting
END:VEVENT
END:VCALENDAR`;

  describe('parseICS', () => {
    it('extracts a Teams link from an escaped, folded description', () => {
      const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:teams-meeting
DTSTART:20260903T103000
DTEND:20260903T111500
SUMMARY:Kindred IT Sync
DESCRIPTION:Microsoft Teams meeting\\nJoin: https://teams.microsoft.com/
 meet/443033989017915?foo=bar\\nAgenda: sync
END:VEVENT
END:VCALENDAR`;
      const event = parseICS(ics).events[0];
      expect(event.conference?.provider).toBe('microsoft-teams');
      expect(event.conference?.joinUrl).toBe(
        'https://teams.microsoft.com/meet/443033989017915?foo=bar'
      );
      expect(event.description).toContain('Agenda: sync');
    });

    it('should parse a simple ICS string correctly', () => {
      const result = parseICS(simpleICS, { generateNewIds: false });

      expect(result.success).toBe(true);
      expect(result.events.length).toBe(1);

      const event = result.events[0];
      expect(event.title).toBe('Test Event');
      expect(event.description).toBe('This is a test event');
      expect(event.meta?.location).toBe('Test Location');
      expect(event.meta?.categories).toEqual(['Work', 'Meeting']);
      expect(event.meta?.originalUid).toBe('test-uid-123');

      // Check dates (converted to ZonedDateTime in parser)
      // The parser uses local/default TZ for floating times.
      // We can check if fields match.
      expect(event.start.year).toBe(2025);
      expect(event.start.month).toBe(1);
      expect(event.start.day).toBe(15);
      expect((event.start as Temporal.ZonedDateTime).hour).toBe(10);
    });

    it('should handle all-day events', () => {
      const allDayICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:all-day-1
DTSTART;VALUE=DATE:20250115
SUMMARY:All Day Event
END:VEVENT
END:VCALENDAR`;

      const result = parseICS(allDayICS);
      expect(result.events[0].allDay).toBe(true);
      expect(result.events[0].start instanceof Temporal.PlainDate).toBe(true);
      expect((result.events[0].start as Temporal.PlainDate).day).toBe(15);
    });
  });

  describe('generateICS', () => {
    it('should generate ICS string containing event details', () => {
      const ics = generateICS([mockEvent]);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Test Event');
      expect(ics).toContain('DESCRIPTION:This is a test event');
      expect(ics).toContain('LOCATION:Test Location');
      expect(ics).toContain('CATEGORIES:Work,Meeting'); // Escaped comma
      expect(ics).toContain('END:VCALENDAR');
    });
  });

  describe('Recurrence', () => {
    const weeklyICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:standup@example.com
DTSTART;TZID=America/New_York:20261102T100000
DTEND;TZID=America/New_York:20261102T103000
RRULE:FREQ=WEEKLY;BYDAY=MO
SUMMARY:Weekly standup
END:VEVENT
END:VCALENDAR`;

    it('imports RRULE so the series repeats', () => {
      const { events } = parseICS(weeklyICS, {
        defaultTimeZone: 'America/New_York',
      });
      const days = expandRecurringEvents(
        events,
        new Date('2026-11-01T00:00:00Z'),
        new Date('2026-12-01T00:00:00Z'),
        'America/New_York'
      ).map(e => (e.start as Temporal.ZonedDateTime).day);
      expect(days).toEqual([2, 9, 16, 23, 30]);
    });

    it('exports RRULE', () => {
      const { events } = parseICS(weeklyICS);
      expect(generateICS(events)).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    });

    it('exports a recurring event in its own time zone', () => {
      const { events } = parseICS(weeklyICS);
      const ics = generateICS(events);
      expect(ics).toContain('DTSTART;TZID=America/New_York:20261102T100000');
      expect(ics).toContain('DTEND;TZID=America/New_York:20261102T103000');
    });
  });

  describe('TZID', () => {
    it('reads a quoted TZID', () => {
      const result = parseICS(withTzid('"America/New_York"'));
      expect(result.success).toBe(true);
      expect(
        (result.events[0].start as Temporal.ZonedDateTime).timeZoneId
      ).toBe('America/New_York');
    });

    it('keeps an event whose TZID is a Windows zone name', () => {
      const result = parseICS(withTzid('Eastern Standard Time'), {
        defaultTimeZone: 'America/New_York',
      });
      expect(result.success).toBe(true);
      const start = result.events[0].start as Temporal.ZonedDateTime;
      expect([start.timeZoneId, start.hour]).toEqual(['America/New_York', 9]);
    });
  });

  describe('Round Trip', () => {
    it('should preserve event data after generate -> parse', () => {
      // Generate
      const generatedICS = generateICS([mockEvent]);

      // Parse back
      const result = parseICS(generatedICS, { generateNewIds: false });

      expect(result.success).toBe(true);
      expect(result.events.length).toBe(1);

      const parsedEvent = result.events[0];

      expect(parsedEvent.title).toBe(mockEvent.title);
      expect(parsedEvent.description).toBe(mockEvent.description);
      expect(parsedEvent.meta?.location).toBe(mockEvent.meta?.location);

      // Date comparison might need care due to types (PlainDateTime vs ZonedDateTime)
      // But values should match
      expect(parsedEvent.start.year).toBe(mockEvent.start.year);
      expect((parsedEvent.start as unknown as { minute: number }).minute).toBe(
        (mockEvent.start as unknown as { minute: number }).minute
      );
    });
  });
});
