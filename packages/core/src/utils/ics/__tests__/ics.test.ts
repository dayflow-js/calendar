import { parseICS } from '../icsParser';
import { generateICS } from '../icsGenerator';
import { Event } from '../../../types/event';
import { Temporal } from 'temporal-polyfill';

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
      expect((result.events[0].start as Temporal.ZonedDateTime).hour).toBe(0);
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
      expect(ics).toContain('CATEGORIES:Work\,Meeting'); // Escaped comma
      expect(ics).toContain('END:VCALENDAR');
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
      expect((parsedEvent.start as any).minute).toBe(
        (mockEvent.start as any).minute
      );
    });
  });
});
