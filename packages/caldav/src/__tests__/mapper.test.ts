import { parseICalendar } from '@caldav/ics/parse';
import { mapDayFlowEventToCalDAV } from '@caldav/mapper/fromEvent';
import { getCalDAVMeta } from '@caldav/mapper/meta';
import { mapCalDAVEventToDayFlow } from '@caldav/mapper/toEvent';
import type { CalDAVEventData } from '@caldav/types/event';
import type { Event } from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEventData(
  overrides: Partial<CalDAVEventData> = {}
): CalDAVEventData {
  return {
    calendarId: 'cal-1',
    uid: 'test-uid@example.com',
    href: '/caldav/user/cal-1/test.ics',
    etag: '"abc123"',
    icalData: [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:test-uid@example.com',
      'SUMMARY:Test Event',
      'DTSTART:20250115T100000Z',
      'DTEND:20250115T110000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n'),
    ...overrides,
  };
}

// ─── mapCalDAVEventToDayFlow ─────────────────────────────────────────────────

describe('mapCalDAVEventToDayFlow', () => {
  it('maps a basic timed event', () => {
    const event = mapCalDAVEventToDayFlow(makeEventData());
    expect(event).not.toBeNull();
    expect(event!.id).toBe('test-uid@example.com');
    expect(event!.title).toBe('Test Event');
    expect(event!.calendarId).toBe('cal-1');
  });

  it('maps start time as ZonedDateTime UTC for Z-suffix DTSTART', () => {
    const event = mapCalDAVEventToDayFlow(makeEventData());
    const zdt = event!.start as Temporal.ZonedDateTime;
    expect(zdt.timeZoneId).toBe('UTC');
    expect(zdt.hour).toBe(10);
    expect(zdt.minute).toBe(0);
  });

  it('maps an all-day event and adjusts DTEND to inclusive', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:allday@example.com',
        'SUMMARY:Holiday',
        'DTSTART;VALUE=DATE:20250101',
        'DTEND;VALUE=DATE:20250103', // exclusive (Jan 1–2)
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
      uid: 'allday@example.com',
    });

    const event = mapCalDAVEventToDayFlow(data);
    expect(event).not.toBeNull();
    const end = event!.end as Temporal.PlainDate;
    expect(end instanceof Temporal.PlainDate).toBe(true);
    // iCal exclusive Jan 3 → DayFlow inclusive Jan 2
    expect(end.day).toBe(2);
  });

  it('maps a single-day all-day event (DTEND = DTSTART + 1)', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:single-day@example.com',
        'SUMMARY:One Day',
        'DTSTART;VALUE=DATE:20250601',
        'DTEND;VALUE=DATE:20250602',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
      uid: 'single-day@example.com',
    });

    const event = mapCalDAVEventToDayFlow(data);
    const start = event!.start as Temporal.PlainDate;
    const end = event!.end as Temporal.PlainDate;
    // Single day: start == end (inclusive)
    expect(Temporal.PlainDate.compare(start, end)).toBe(0);
  });

  it('maps a timezone-aware event', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:tz@example.com',
        'SUMMARY:Zoned Event',
        'DTSTART;TZID=America/New_York:20250115T100000',
        'DTEND;TZID=America/New_York:20250115T110000',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
      uid: 'tz@example.com',
    });

    const event = mapCalDAVEventToDayFlow(data);
    const zdt = event!.start as Temporal.ZonedDateTime;
    expect(zdt.timeZoneId).toBe('America/New_York');
    expect(zdt.hour).toBe(10);
  });

  it('uses DURATION when DTEND is absent', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:duration@example.com',
        'SUMMARY:Duration Event',
        'DTSTART:20250115T100000Z',
        'DURATION:PT90M',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
      uid: 'duration@example.com',
    });

    const event = mapCalDAVEventToDayFlow(data);
    expect(event).not.toBeNull();
    const end = event!.end as Temporal.ZonedDateTime;
    expect(end.hour).toBe(11);
    expect(end.minute).toBe(30);
  });

  it('maps a floating (no timezone) event', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:float@example.com',
        'SUMMARY:Floating',
        'DTSTART:20250115T140000',
        'DTEND:20250115T150000',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
      uid: 'float@example.com',
    });

    const event = mapCalDAVEventToDayFlow(data);
    const pdt = event!.start as Temporal.PlainDateTime;
    expect(pdt.hour).toBe(14);
    expect('timeZoneId' in pdt).toBe(false);
  });

  it('preserves uid, href, etag, and calendarId in event.meta.caldav', () => {
    const event = mapCalDAVEventToDayFlow(makeEventData());
    const meta = getCalDAVMeta(event!);
    expect(meta).not.toBeNull();
    expect(meta!.uid).toBe('test-uid@example.com');
    expect(meta!.href).toBe('/caldav/user/cal-1/test.ics');
    expect(meta!.etag).toBe('"abc123"');
    expect(meta!.calendarId).toBe('cal-1');
  });

  it('marks non-recurring events as isRecurring=false', () => {
    const event = mapCalDAVEventToDayFlow(makeEventData());
    expect(getCalDAVMeta(event!)!.isRecurring).toBe(false);
  });

  it('marks recurring events as isRecurring=true', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:recurring@example.com',
        'SUMMARY:Weekly',
        'DTSTART:20250115T100000Z',
        'DTEND:20250115T110000Z',
        'RRULE:FREQ=WEEKLY',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
      uid: 'recurring@example.com',
    });

    const event = mapCalDAVEventToDayFlow(data);
    expect(getCalDAVMeta(event!)!.isRecurring).toBe(true);
  });

  it('maps description from VEVENT', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:desc@example.com',
        'SUMMARY:Event',
        'DESCRIPTION:Notes for the event',
        'DTSTART:20250115T100000Z',
        'DTEND:20250115T110000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
      uid: 'desc@example.com',
    });

    const event = mapCalDAVEventToDayFlow(data);
    expect(event!.description).toBe('Notes for the event');
  });

  it('stores location in event.meta.location', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:loc@example.com',
        'SUMMARY:Event',
        'LOCATION:Conference Room A',
        'DTSTART:20250115T100000Z',
        'DTEND:20250115T110000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
      uid: 'loc@example.com',
    });

    const event = mapCalDAVEventToDayFlow(data);
    expect(event!.meta?.location).toBe('Conference Room A');
  });

  it('returns null for invalid iCal data', () => {
    const data = makeEventData({ icalData: 'not valid ical' });
    const event = mapCalDAVEventToDayFlow(data);
    expect(event).toBeNull();
  });

  it('returns null for VEVENT without UID', () => {
    const data = makeEventData({
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'SUMMARY:No UID',
        'DTSTART:20250115T100000Z',
        'DTEND:20250115T110000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    });
    expect(mapCalDAVEventToDayFlow(data)).toBeNull();
  });
});

// ─── mapDayFlowEventToCalDAV ─────────────────────────────────────────────────

describe('mapDayFlowEventToCalDAV', () => {
  function makeEvent(overrides: Partial<Event> = {}): Event {
    return {
      id: 'local-1',
      title: 'Local Event',
      start: Temporal.ZonedDateTime.from('2025-06-10T09:00:00+00:00[UTC]'),
      end: Temporal.ZonedDateTime.from('2025-06-10T10:00:00+00:00[UTC]'),
      calendarId: 'cal-1',
      ...overrides,
    };
  }

  it('produces valid VCALENDAR text', () => {
    const ical = mapDayFlowEventToCalDAV(makeEvent());
    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('BEGIN:VEVENT');
    expect(ical).toContain('SUMMARY:Local Event');
    expect(ical).toContain('END:VEVENT');
    expect(ical).toContain('END:VCALENDAR');
  });

  it('reuses existing meta.caldav.uid for updates', () => {
    const event = makeEvent({
      meta: {
        caldav: {
          uid: 'existing-uid@example.com',
          href: '/cal/existing.ics',
          calendarId: 'cal-1',
          isRecurring: false,
        },
      },
    });

    const ical = mapDayFlowEventToCalDAV(event);
    expect(ical).toContain('UID:existing-uid@example.com');
  });

  it('generates a new UID for events without meta.caldav', () => {
    const ical = mapDayFlowEventToCalDAV(makeEvent());
    const [vevent] = parseICalendar(ical);
    expect(vevent.uid).toBeDefined();
    expect(vevent.uid!.length).toBeGreaterThan(0);
  });

  it('serializes a timed event with UTC DTSTART', () => {
    const ical = mapDayFlowEventToCalDAV(makeEvent());
    expect(ical).toContain('DTSTART:20250610T090000Z');
    expect(ical).toContain('DTEND:20250610T100000Z');
  });

  it('serializes an all-day event with exclusive DTEND (+1 day)', () => {
    const event = makeEvent({
      start: Temporal.PlainDate.from('2025-07-01'),
      end: Temporal.PlainDate.from('2025-07-01'), // DayFlow inclusive
    });

    const ical = mapDayFlowEventToCalDAV(event);
    expect(ical).toContain('DTSTART;VALUE=DATE:20250701');
    // DayFlow inclusive → iCal exclusive (+1 day)
    expect(ical).toContain('DTEND;VALUE=DATE:20250702');
  });

  it('serializes a multi-day all-day event with correct exclusive DTEND', () => {
    const event = makeEvent({
      start: Temporal.PlainDate.from('2025-07-01'),
      end: Temporal.PlainDate.from('2025-07-03'), // DayFlow inclusive July 3
    });

    const ical = mapDayFlowEventToCalDAV(event);
    // DayFlow Jul 3 inclusive → iCal Jul 4 exclusive
    expect(ical).toContain('DTEND;VALUE=DATE:20250704');
  });

  it('serializes description when present', () => {
    const event = makeEvent({ description: 'Detailed notes' });
    const ical = mapDayFlowEventToCalDAV(event);
    expect(ical).toContain('DESCRIPTION:Detailed notes');
  });

  it('serializes location from meta.location when present', () => {
    const event = makeEvent({ meta: { location: 'Room 42' } });
    const ical = mapDayFlowEventToCalDAV(event);
    expect(ical).toContain('LOCATION:Room 42');
  });

  it('produces output that round-trips through mapCalDAVEventToDayFlow', () => {
    const original = makeEvent({
      title: 'Round Trip',
      description: 'Notes',
      meta: {
        caldav: {
          uid: 'rt@example.com',
          href: '/cal/rt.ics',
          calendarId: 'cal-1',
          isRecurring: false,
        },
      },
    });

    const ical = mapDayFlowEventToCalDAV(original);

    const data: CalDAVEventData = {
      calendarId: 'cal-1',
      uid: 'rt@example.com',
      href: '/cal/rt.ics',
      icalData: ical,
    };

    const restored = mapCalDAVEventToDayFlow(data);
    expect(restored).not.toBeNull();
    expect(restored!.title).toBe('Round Trip');
    expect(restored!.description).toBe('Notes');
    expect(getCalDAVMeta(restored!)!.uid).toBe('rt@example.com');
  });

  it('serializes a timezone-aware event with TZID parameter', () => {
    const event = makeEvent({
      start: Temporal.ZonedDateTime.from(
        '2025-06-10T09:00:00-04:00[America/New_York]'
      ),
      end: Temporal.ZonedDateTime.from(
        '2025-06-10T10:00:00-04:00[America/New_York]'
      ),
    });

    const ical = mapDayFlowEventToCalDAV(event);
    expect(ical).toContain('DTSTART;TZID=America/New_York:20250610T090000');
    expect(ical).toContain('DTEND;TZID=America/New_York:20250610T100000');
  });

  it('rejects recurring CalDAV events because MVP write support is read-only', () => {
    const event = makeEvent({
      meta: {
        caldav: {
          uid: 'recurring@example.com',
          href: '/cal/recurring.ics',
          calendarId: 'cal-1',
          isRecurring: true,
        },
      },
    });

    expect(() => mapDayFlowEventToCalDAV(event)).toThrow(/recurring events/);
  });
});
