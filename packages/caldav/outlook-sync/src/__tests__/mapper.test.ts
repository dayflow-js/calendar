import type { Event } from '@dayflow/core';
import { mapDayFlowEventToOutlook } from '@outlook-sync/mapper/fromEvent';
import { mapOutlookCalendarToDayFlow } from '@outlook-sync/mapper/toCalendar';
import {
  mapOutlookEventToDayFlow,
  normalizeTimezone,
  parseOutlookDateTime,
} from '@outlook-sync/mapper/toEvent';
import type { OutlookCalendar, OutlookEvent } from '@outlook-sync/types/api';
import { Temporal } from 'temporal-polyfill';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<OutlookEvent> = {}): OutlookEvent {
  return {
    id: 'evt-1',
    subject: 'Team Meeting',
    start: { dateTime: '2025-06-15T10:00:00', timeZone: 'UTC' },
    end: { dateTime: '2025-06-15T11:00:00', timeZone: 'UTC' },
    isAllDay: false,
    isCancelled: false,
    isOrganizer: true,
    type: 'singleInstance',
    changeKey: 'ck1',
    '@odata.etag': 'W/"abc123"',
    ...overrides,
  };
}

function makeCalendar(
  overrides: Partial<OutlookCalendar> = {}
): OutlookCalendar {
  return {
    id: 'cal-1',
    name: 'Work',
    color: 'lightBlue',
    isDefaultCalendar: false,
    canEdit: true,
    canShare: false,
    canViewPrivateItems: false,
    ...overrides,
  };
}

// ─── normalizeTimezone ────────────────────────────────────────────────────────

describe('normalizeTimezone', () => {
  it('passes through IANA names unchanged', () => {
    expect(normalizeTimezone('America/New_York')).toBe('America/New_York');
    expect(normalizeTimezone('Europe/London')).toBe('Europe/London');
    expect(normalizeTimezone('UTC')).toBe('UTC');
  });

  it('maps common Windows names to IANA', () => {
    expect(normalizeTimezone('Eastern Standard Time')).toBe('America/New_York');
    expect(normalizeTimezone('Pacific Standard Time')).toBe(
      'America/Los_Angeles'
    );
    expect(normalizeTimezone('China Standard Time')).toBe('Asia/Shanghai');
    expect(normalizeTimezone('Tokyo Standard Time')).toBe('Asia/Tokyo');
    expect(normalizeTimezone('AUS Eastern Standard Time')).toBe(
      'Australia/Sydney'
    );
    expect(normalizeTimezone('GMT Standard Time')).toBe('Europe/London');
    expect(normalizeTimezone('India Standard Time')).toBe('Asia/Calcutta');
    expect(normalizeTimezone('Central Standard Time')).toBe('America/Chicago');
    expect(normalizeTimezone('Romance Standard Time')).toBe('Europe/Paris');
  });

  it('falls back to UTC for unknown Windows names', () => {
    expect(normalizeTimezone('Unknown Timezone')).toBe('UTC');
  });
});

// ─── parseOutlookDateTime ─────────────────────────────────────────────────────

describe('parseOutlookDateTime', () => {
  it('parses timed event as ZonedDateTime', () => {
    const result = parseOutlookDateTime(
      { dateTime: '2025-06-15T10:00:00', timeZone: 'UTC' },
      false
    );
    expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
    const zdt = result as Temporal.ZonedDateTime;
    expect(zdt.year).toBe(2025);
    expect(zdt.month).toBe(6);
    expect(zdt.day).toBe(15);
    expect(zdt.hour).toBe(10);
  });

  it('parses all-day event as PlainDate from date portion', () => {
    const result = parseOutlookDateTime(
      { dateTime: '2025-06-15T00:00:00.0000000', timeZone: 'UTC' },
      true
    );
    expect(result).toBeInstanceOf(Temporal.PlainDate);
    const pd = result as Temporal.PlainDate;
    expect(pd.toString()).toBe('2025-06-15');
  });

  it('strips sub-second precision before parsing', () => {
    const result = parseOutlookDateTime(
      { dateTime: '2025-06-15T10:00:00.0000000', timeZone: 'America/New_York' },
      false
    );
    expect(result).toBeInstanceOf(Temporal.ZonedDateTime);
  });

  it('normalizes Windows timezone in timed events', () => {
    const result = parseOutlookDateTime(
      { dateTime: '2025-06-15T10:00:00', timeZone: 'Eastern Standard Time' },
      false
    ) as Temporal.ZonedDateTime;
    expect(result.timeZoneId).toBe('America/New_York');
  });

  it('returns null for invalid dateTime', () => {
    const result = parseOutlookDateTime(
      { dateTime: 'not-a-date', timeZone: 'UTC' },
      false
    );
    expect(result).toBeNull();
  });
});

// ─── mapOutlookEventToDayFlow ─────────────────────────────────────────────────

describe('mapOutlookEventToDayFlow', () => {
  it('maps a basic timed event', () => {
    const result = mapOutlookEventToDayFlow(makeEvent(), 'cal-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('evt-1');
    expect(result!.title).toBe('Team Meeting');
    expect(result!.calendarId).toBe('cal-1');
    expect(result!.allDay).toBe(false);
    expect(result!.start).toBeInstanceOf(Temporal.ZonedDateTime);
    expect(result!.end).toBeInstanceOf(Temporal.ZonedDateTime);
  });

  it('returns null for cancelled events', () => {
    const result = mapOutlookEventToDayFlow(
      makeEvent({ isCancelled: true }),
      'cal-1'
    );
    expect(result).toBeNull();
  });

  it('maps all-day event with inclusive end (subtracts one day)', () => {
    const event = makeEvent({
      isAllDay: true,
      // Outlook all-day: end is exclusive midnight of next day
      start: { dateTime: '2025-06-15T00:00:00.0000000', timeZone: 'UTC' },
      end: { dateTime: '2025-06-16T00:00:00.0000000', timeZone: 'UTC' },
    });
    const result = mapOutlookEventToDayFlow(event, 'cal-1');
    expect(result).not.toBeNull();
    expect(result!.start).toBeInstanceOf(Temporal.PlainDate);
    expect((result!.start as Temporal.PlainDate).toString()).toBe('2025-06-15');
    expect((result!.end as Temporal.PlainDate).toString()).toBe('2025-06-15');
  });

  it('maps multi-day all-day event correctly', () => {
    const event = makeEvent({
      isAllDay: true,
      start: { dateTime: '2025-06-15T00:00:00.0000000', timeZone: 'UTC' },
      end: { dateTime: '2025-06-18T00:00:00.0000000', timeZone: 'UTC' },
    });
    const result = mapOutlookEventToDayFlow(event, 'cal-1');
    expect((result!.end as Temporal.PlainDate).toString()).toBe('2025-06-17');
  });

  it('clamps end to start for zero-duration all-day events', () => {
    const event = makeEvent({
      isAllDay: true,
      start: { dateTime: '2025-06-15T00:00:00.0000000', timeZone: 'UTC' },
      end: { dateTime: '2025-06-15T00:00:00.0000000', timeZone: 'UTC' },
    });
    const result = mapOutlookEventToDayFlow(event, 'cal-1');
    expect((result!.start as Temporal.PlainDate).toString()).toBe(
      (result!.end as Temporal.PlainDate).toString()
    );
  });

  it('strips HTML tags from body', () => {
    const event = makeEvent({
      body: { contentType: 'html', content: '<p>Hello <b>world</b></p>' },
    });
    const result = mapOutlookEventToDayFlow(event, 'cal-1');
    expect(result!.description).toBe('Hello world');
  });

  it('decodes HTML entities in body', () => {
    const event = makeEvent({
      body: { contentType: 'html', content: 'Q&amp;A session &mdash; done' },
    });
    const result = mapOutlookEventToDayFlow(event, 'cal-1');
    expect(result!.description).toBe('Q&A session — done');
  });

  it('decodes numeric HTML entities', () => {
    const event = makeEvent({
      body: { contentType: 'html', content: '&#169; 2025 &#x1F600;' },
    });
    const result = mapOutlookEventToDayFlow(event, 'cal-1');
    expect(result!.description).toContain('©');
  });

  it('populates outlook meta', () => {
    const result = mapOutlookEventToDayFlow(makeEvent(), 'cal-1');
    const meta = result!.meta?.outlook as {
      eventId: string;
      calendarId: string;
      etag: string;
      isRecurring: boolean;
    };
    expect(meta.eventId).toBe('evt-1');
    expect(meta.calendarId).toBe('cal-1');
    expect(meta.etag).toBe('W/"abc123"');
    expect(meta.isRecurring).toBe(false);
  });

  it('marks seriesMaster as recurring', () => {
    const result = mapOutlookEventToDayFlow(
      makeEvent({ type: 'seriesMaster' }),
      'cal-1'
    );
    const meta = result!.meta?.outlook as { isRecurring: boolean };
    expect(meta.isRecurring).toBe(true);
  });

  it('marks occurrence as recurring', () => {
    const result = mapOutlookEventToDayFlow(
      makeEvent({ type: 'occurrence' }),
      'cal-1'
    );
    const meta = result!.meta?.outlook as { isRecurring: boolean };
    expect(meta.isRecurring).toBe(true);
  });

  it('propagates location', () => {
    const event = makeEvent({ location: { displayName: 'Conference Room A' } });
    const result = mapOutlookEventToDayFlow(event, 'cal-1');
    expect(result!.meta?.location).toBe('Conference Room A');
  });

  it('maps Teams online meeting details', () => {
    const event = makeEvent({
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
      onlineMeeting: {
        conferenceId: '123 456 789',
        joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc',
      },
    });
    expect(mapOutlookEventToDayFlow(event, 'cal-1')?.conference).toEqual({
      provider: 'microsoft-teams',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/abc',
      meetingId: '123 456 789',
    });
  });

  it('returns null for invalid start date', () => {
    const event = makeEvent({
      start: { dateTime: 'INVALID', timeZone: 'UTC' },
    });
    expect(mapOutlookEventToDayFlow(event, 'cal-1')).toBeNull();
  });
});

// ─── mapDayFlowEventToOutlook ─────────────────────────────────────────────────

describe('mapDayFlowEventToOutlook', () => {
  const makeBaseEvent = (overrides: Partial<Event> = {}): Event => ({
    id: 'dayflow-1',
    title: 'Sprint Review',
    start: Temporal.ZonedDateTime.from('2025-06-15T14:00:00[America/New_York]'),
    end: Temporal.ZonedDateTime.from('2025-06-15T15:00:00[America/New_York]'),
    calendarId: 'cal-1',
    ...overrides,
  });

  it('maps basic timed event', () => {
    const result = mapDayFlowEventToOutlook(makeBaseEvent());
    expect(result.subject).toBe('Sprint Review');
    expect(result.isAllDay).toBe(false);
    expect(result.start.timeZone).toBe('America/New_York');
    expect(result.end.timeZone).toBe('America/New_York');
  });

  it('maps all-day event with exclusive end', () => {
    const result = mapDayFlowEventToOutlook(
      makeBaseEvent({
        start: Temporal.PlainDate.from('2025-06-15'),
        end: Temporal.PlainDate.from('2025-06-15'),
        allDay: true,
      })
    );
    expect(result.isAllDay).toBe(true);
    // start stays as the same date
    expect(result.start.dateTime).toContain('2025-06-15');
    // end should be exclusive: next day
    expect(result.end.dateTime).toContain('2025-06-16');
  });

  it('maps multi-day all-day event with exclusive end', () => {
    const result = mapDayFlowEventToOutlook(
      makeBaseEvent({
        start: Temporal.PlainDate.from('2025-06-15'),
        end: Temporal.PlainDate.from('2025-06-17'),
        allDay: true,
      })
    );
    expect(result.end.dateTime).toContain('2025-06-18');
  });

  it('includes description as plain text body', () => {
    const result = mapDayFlowEventToOutlook(
      makeBaseEvent({ description: 'Review sprint items' })
    );
    expect(result.body?.content).toBe('Review sprint items');
    expect(result.body?.contentType).toBe('text');
  });

  it('omits body when description is empty', () => {
    const result = mapDayFlowEventToOutlook(makeBaseEvent());
    expect(result.body).toBeUndefined();
  });

  it('includes location when present in meta', () => {
    const result = mapDayFlowEventToOutlook(
      makeBaseEvent({ meta: { location: 'Board Room' } })
    );
    expect(result.location?.displayName).toBe('Board Room');
  });

  it('omits location when meta.location is not a string', () => {
    const result = mapDayFlowEventToOutlook(makeBaseEvent({ meta: {} }));
    expect(result.location).toBeUndefined();
  });
});

// ─── mapOutlookCalendarToDayFlow ──────────────────────────────────────────────

describe('mapOutlookCalendarToDayFlow', () => {
  it('maps basic calendar', () => {
    const result = mapOutlookCalendarToDayFlow(makeCalendar());
    expect(result.id).toBe('cal-1');
    expect(result.name).toBe('Work');
    expect(result.source).toBe('Outlook');
    expect(result.readOnly).toBe(false);
  });

  it('marks readOnly when canEdit is false', () => {
    const result = mapOutlookCalendarToDayFlow(
      makeCalendar({ canEdit: false })
    );
    expect(result.readOnly).toBe(true);
  });

  it('produces colors from the named color', () => {
    const result = mapOutlookCalendarToDayFlow(
      makeCalendar({ color: 'lightGreen' })
    );
    expect(result.colors).toBeDefined();
    expect(typeof result.colors).toBe('object');
  });

  it('handles auto color', () => {
    const result = mapOutlookCalendarToDayFlow(makeCalendar({ color: 'auto' }));
    expect(result.colors).toBeDefined();
  });

  it('sets subscription url with calendar id', () => {
    const result = mapOutlookCalendarToDayFlow(makeCalendar());
    expect(result.subscription?.url).toBe('outlook:cal-1');
  });

  it('propagates isDefaultCalendar in subscription meta', () => {
    const result = mapOutlookCalendarToDayFlow(
      makeCalendar({ isDefaultCalendar: true })
    );
    const meta = result.subscription?.meta?.outlook as { isDefault: boolean };
    expect(meta.isDefault).toBe(true);
  });
});
