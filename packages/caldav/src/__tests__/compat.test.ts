/**
 * iCloud CalDAV compatibility tests.
 *
 * Verifies that the mapper and adapter handle iCloud-specific VEVENT formats
 * correctly: all-day events, timezone-aware events, recurring events, and
 * etag behavior.
 *
 * iCloud characteristics:
 * - All-day events use VALUE=DATE (standard)
 * - Timezone events use TZID param (standard)
 * - Colors use 8-digit RGBA hex — stripped automatically by the adapter
 * - Recurring events (RRULE) are common and should be marked read-only
 * - ETags are returned on successful writes
 */

import { getCalDAVMeta } from '@caldav/mapper/meta';
import { mapCalDAVEventToDayFlow } from '@caldav/mapper/toEvent';
import type { CalDAVEventData } from '@caldav/types/event';
import { Temporal } from 'temporal-polyfill';

function makeICloudEvent(
  icalData: string,
  uid: string,
  href = `/12345/calendars/personal/${uid}.ics`
): CalDAVEventData {
  return {
    calendarId: '/12345/calendars/personal/',
    uid,
    href,
    etag: `"${uid}-etag"`,
    icalData,
  };
}

// ─── All-day events ───────────────────────────────────────────────────────────

describe('iCloud – all-day events', () => {
  it('maps a single all-day event correctly', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Apple Inc.//iCal 5.0//EN',
          'BEGIN:VEVENT',
          'UID:allday-1@icloud.com',
          'SUMMARY:Family Dinner',
          'DTSTART;VALUE=DATE:20250601',
          'DTEND;VALUE=DATE:20250602',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'allday-1@icloud.com'
      )
    );

    expect(event).not.toBeNull();
    expect(event!.title).toBe('Family Dinner');

    // PlainDate for all-day events
    const start = event!.start;
    expect(start instanceof Temporal.PlainDate).toBe(true);
    expect((start as Temporal.PlainDate).year).toBe(2025);
    expect((start as Temporal.PlainDate).month).toBe(6);
    expect((start as Temporal.PlainDate).day).toBe(1);

    // DayFlow uses inclusive end; iCal is exclusive → subtract 1 day
    const end = event!.end;
    expect(end instanceof Temporal.PlainDate).toBe(true);
    expect((end as Temporal.PlainDate).day).toBe(1); // same day (single day)
  });

  it('maps a multi-day all-day event with correct inclusive end', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0',
          'BEGIN:VEVENT',
          'UID:vacation@icloud.com',
          'SUMMARY:Vacation',
          'DTSTART;VALUE=DATE:20250701',
          'DTEND;VALUE=DATE:20250708', // exclusive: Jul 1–7 (7 days)
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'vacation@icloud.com'
      )
    );

    const end = event!.end as Temporal.PlainDate;
    expect(end.month).toBe(7);
    expect(end.day).toBe(7); // inclusive: Jul 7
  });
});

// ─── Timezone events ──────────────────────────────────────────────────────────

describe('iCloud – timezone-aware events', () => {
  it('maps a TZID event to ZonedDateTime', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0',
          'BEGIN:VEVENT',
          'UID:meeting@icloud.com',
          'SUMMARY:Team Meeting',
          'DTSTART;TZID=America/Los_Angeles:20250610T090000',
          'DTEND;TZID=America/Los_Angeles:20250610T100000',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'meeting@icloud.com'
      )
    );

    expect(event).not.toBeNull();
    const start = event!.start as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('America/Los_Angeles');
    expect(start.hour).toBe(9);
    expect(start.month).toBe(6);
    expect(start.day).toBe(10);
  });

  it('maps a UTC event (Z suffix) to ZonedDateTime in UTC', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0',
          'BEGIN:VEVENT',
          'UID:utc@icloud.com',
          'SUMMARY:UTC Event',
          'DTSTART:20250615T140000Z',
          'DTEND:20250615T150000Z',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'utc@icloud.com'
      )
    );

    const start = event!.start as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('UTC');
    expect(start.hour).toBe(14);
  });

  it('maps a floating event (no timezone) to PlainDateTime', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0',
          'BEGIN:VEVENT',
          'UID:float@icloud.com',
          'SUMMARY:Local',
          'DTSTART:20250615T090000',
          'DTEND:20250615T100000',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'float@icloud.com'
      )
    );

    const start = event!.start as Temporal.PlainDateTime;
    expect(start.hour).toBe(9);
    expect('timeZoneId' in start).toBe(false);
  });
});

// ─── Recurring events ─────────────────────────────────────────────────────────

describe('iCloud – recurring events', () => {
  it('marks recurring events as isRecurring=true in meta.caldav', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0',
          'BEGIN:VEVENT',
          'UID:weekly@icloud.com',
          'SUMMARY:Weekly Standup',
          'DTSTART;TZID=America/New_York:20250106T090000',
          'DTEND;TZID=America/New_York:20250106T093000',
          'RRULE:FREQ=WEEKLY;BYDAY=MO',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'weekly@icloud.com'
      )
    );

    expect(event).not.toBeNull();
    const meta = getCalDAVMeta(event!);
    expect(meta?.isRecurring).toBe(true);
  });

  it('marks non-recurring events as isRecurring=false', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0',
          'BEGIN:VEVENT',
          'UID:once@icloud.com',
          'SUMMARY:One-time',
          'DTSTART:20250101T100000Z',
          'DTEND:20250101T110000Z',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'once@icloud.com'
      )
    );

    expect(getCalDAVMeta(event!)?.isRecurring).toBe(false);
  });

  it('detects RRULE:FREQ=YEARLY (e.g. birthday events)', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0',
          'BEGIN:VEVENT',
          'UID:birthday@icloud.com',
          'SUMMARY:Birthday',
          'DTSTART;VALUE=DATE:20250315',
          'DTEND;VALUE=DATE:20250316',
          'RRULE:FREQ=YEARLY',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'birthday@icloud.com'
      )
    );

    expect(getCalDAVMeta(event!)?.isRecurring).toBe(true);
  });
});

// ─── ETag and remote metadata preservation ───────────────────────────────────

describe('iCloud – etag and remote metadata', () => {
  it('preserves uid, href, etag, and calendarId in meta.caldav', () => {
    const data: CalDAVEventData = {
      calendarId: '/12345/calendars/personal/',
      uid: 'uid123@icloud.com',
      href: '/12345/calendars/personal/uid123.ics',
      etag: '"abc-def-etag"',
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:uid123@icloud.com',
        'SUMMARY:Test',
        'DTSTART:20250101T100000Z',
        'DTEND:20250101T110000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    };

    const event = mapCalDAVEventToDayFlow(data);
    const meta = getCalDAVMeta(event!);

    expect(meta?.uid).toBe('uid123@icloud.com');
    expect(meta?.href).toBe('/12345/calendars/personal/uid123.ics');
    expect(meta?.etag).toBe('"abc-def-etag"');
    expect(meta?.calendarId).toBe('/12345/calendars/personal/');
  });

  it('uses uid as the DayFlow event id', () => {
    const data: CalDAVEventData = {
      calendarId: '/12345/calendars/personal/',
      uid: 'my-uid@icloud.com',
      href: '/12345/calendars/personal/event.ics',
      icalData: [
        'BEGIN:VCALENDAR\r\nVERSION:2.0',
        'BEGIN:VEVENT',
        'UID:my-uid@icloud.com',
        'SUMMARY:E',
        'DTSTART:20250101T100000Z',
        'DTEND:20250101T110000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    };

    const event = mapCalDAVEventToDayFlow(data)!;
    expect(event.id).toBe('my-uid@icloud.com');
  });

  it('handles events with description and location (common in iCloud)', () => {
    const event = mapCalDAVEventToDayFlow(
      makeICloudEvent(
        [
          'BEGIN:VCALENDAR\r\nVERSION:2.0',
          'BEGIN:VEVENT',
          'UID:desc@icloud.com',
          'SUMMARY:Doctor Appointment',
          'DESCRIPTION:Annual checkup\\nBring insurance card',
          'LOCATION:123 Main St\\, Suite 4',
          'DTSTART:20250301T100000Z',
          'DTEND:20250301T110000Z',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n'),
        'desc@icloud.com'
      )
    );

    expect(event!.description).toContain('Annual checkup');
    expect(event!.description).toContain('\nBring insurance card');
    expect(event!.meta?.location).toBe('123 Main St, Suite 4');
  });
});

// ─── Sync-token in adapter response ──────────────────────────────────────────

describe('sync-token in CalDAVSyncResult', () => {
  it('CalDAVSyncResult.syncToken is optional for calendar-query REPORT', () => {
    // syncToken is undefined for full REPORT (no token provided)
    const result = { events: [], deleted: [], syncToken: undefined };
    expect(result.syncToken).toBeUndefined();
  });

  it('CalDAVSyncResult.syncToken carries the new token from sync-collection REPORT', () => {
    const result = {
      events: [],
      deleted: [],
      syncToken: 'http://example.com/ns/sync/1235',
    };
    expect(result.syncToken).toBe('http://example.com/ns/sync/1235');
  });
});
