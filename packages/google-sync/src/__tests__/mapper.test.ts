import type { Event } from '@dayflow/core';
import { mapDayFlowEventToGoogle } from '@google-sync/mapper/fromEvent';
import { mapGoogleCalendarToDayFlow } from '@google-sync/mapper/toCalendar';
import { mapGoogleEventToDayFlow } from '@google-sync/mapper/toEvent';
import type {
  GoogleCalendarEvent,
  GoogleCalendarListEntry,
} from '@google-sync/types/api';
import { Temporal } from 'temporal-polyfill';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGoogleEvent(
  overrides: Partial<GoogleCalendarEvent> = {}
): GoogleCalendarEvent {
  return {
    id: 'event-1',
    summary: 'Team meeting',
    description: 'Weekly sync',
    location: 'Room A',
    start: {
      dateTime: '2025-06-10T10:00:00-05:00',
      timeZone: 'America/Chicago',
    },
    end: { dateTime: '2025-06-10T11:00:00-05:00', timeZone: 'America/Chicago' },
    etag: '"abc123"',
    status: 'confirmed',
    ...overrides,
  };
}

function makeDayFlowEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    title: 'Team meeting',
    start: Temporal.ZonedDateTime.from(
      '2025-06-10T10:00:00-05:00[America/Chicago]'
    ),
    end: Temporal.ZonedDateTime.from(
      '2025-06-10T11:00:00-05:00[America/Chicago]'
    ),
    allDay: false,
    calendarId: 'cal-1',
    meta: {
      google: {
        eventId: 'event-1',
        calendarId: 'cal-1',
        etag: '"abc123"',
        isRecurring: false,
      },
    },
    ...overrides,
  };
}

// ─── mapGoogleEventToDayFlow ──────────────────────────────────────────────────

describe('mapGoogleEventToDayFlow', () => {
  it('maps a timed event with timezone', () => {
    const event = mapGoogleEventToDayFlow(makeGoogleEvent(), 'cal-1');
    expect(event).not.toBeNull();
    expect(event!.id).toBe('event-1');
    expect(event!.title).toBe('Team meeting');
    expect(event!.description).toBe('Weekly sync');
    expect(event!.meta?.location).toBe('Room A');
    expect(event!.allDay).toBe(false);
    expect(event!.calendarId).toBe('cal-1');
  });

  it('maps timezone correctly', () => {
    const event = mapGoogleEventToDayFlow(makeGoogleEvent(), 'cal-1');
    const start = event!.start as Temporal.ZonedDateTime;
    expect(start.timeZoneId).toBe('America/Chicago');
    expect(start.hour).toBe(10);
  });

  it('maps an all-day event and adjusts exclusive DTEND by -1 day', () => {
    const google = makeGoogleEvent({
      start: { date: '2025-06-10' },
      end: { date: '2025-06-11' }, // Google exclusive end
    });
    const event = mapGoogleEventToDayFlow(google, 'cal-1');
    expect(event!.allDay).toBe(true);
    const start = event!.start as Temporal.PlainDate;
    const end = event!.end as Temporal.PlainDate;
    expect(start.toString()).toBe('2025-06-10');
    expect(end.toString()).toBe('2025-06-10'); // DayFlow inclusive end
  });

  it('maps a multi-day all-day event', () => {
    const google = makeGoogleEvent({
      start: { date: '2025-06-10' },
      end: { date: '2025-06-13' }, // exclusive — 3 days
    });
    const event = mapGoogleEventToDayFlow(google, 'cal-1');
    const end = event!.end as Temporal.PlainDate;
    expect(end.toString()).toBe('2025-06-12'); // inclusive
  });

  it('sets meta.google with eventId, calendarId, etag', () => {
    const event = mapGoogleEventToDayFlow(makeGoogleEvent(), 'cal-1');
    const meta = event!.meta!.google as {
      eventId: string;
      calendarId: string;
      etag: string;
    };
    expect(meta.eventId).toBe('event-1');
    expect(meta.calendarId).toBe('cal-1');
    expect(meta.etag).toBe('"abc123"');
  });

  it('marks recurring events via recurringEventId', () => {
    const google = makeGoogleEvent({ recurringEventId: 'series-1' });
    const event = mapGoogleEventToDayFlow(google, 'cal-1');
    const meta = event!.meta!.google as { isRecurring: boolean };
    expect(meta.isRecurring).toBe(true);
  });

  it('marks recurring events via recurrence field', () => {
    const google = makeGoogleEvent({ recurrence: ['RRULE:FREQ=WEEKLY'] });
    const event = mapGoogleEventToDayFlow(google, 'cal-1');
    const meta = event!.meta!.google as { isRecurring: boolean };
    expect(meta.isRecurring).toBe(true);
  });

  it('returns null for cancelled events', () => {
    const google = makeGoogleEvent({ status: 'cancelled' });
    expect(mapGoogleEventToDayFlow(google, 'cal-1')).toBeNull();
  });

  it('handles UTC Z suffix', () => {
    const google = makeGoogleEvent({
      start: { dateTime: '2025-06-10T15:00:00Z' },
      end: { dateTime: '2025-06-10T16:00:00Z' },
    });
    const event = mapGoogleEventToDayFlow(google, 'cal-1');
    expect(event).not.toBeNull();
    const start = event!.start as Temporal.ZonedDateTime;
    expect(start.hour).toBe(15);
  });
});

// ─── mapDayFlowEventToGoogle ──────────────────────────────────────────────────

describe('mapDayFlowEventToGoogle', () => {
  it('maps a timed ZonedDateTime event', () => {
    const input = mapDayFlowEventToGoogle(makeDayFlowEvent());
    expect(input.summary).toBe('Team meeting');
    expect(input.start.timeZone).toBe('America/Chicago');
    expect(input.start.dateTime).toBeDefined();
    expect(input.end.dateTime).toBeDefined();
  });

  it('maps an all-day PlainDate event and adds 1 day to end', () => {
    const event = makeDayFlowEvent({
      start: Temporal.PlainDate.from('2025-06-10'),
      end: Temporal.PlainDate.from('2025-06-10'), // inclusive
      allDay: true,
    });
    const input = mapDayFlowEventToGoogle(event);
    expect(input.start.date).toBe('2025-06-10');
    expect(input.end.date).toBe('2025-06-11'); // exclusive for Google
  });

  it('maps a multi-day all-day event', () => {
    const event = makeDayFlowEvent({
      start: Temporal.PlainDate.from('2025-06-10'),
      end: Temporal.PlainDate.from('2025-06-12'), // inclusive
      allDay: true,
    });
    const input = mapDayFlowEventToGoogle(event);
    expect(input.start.date).toBe('2025-06-10');
    expect(input.end.date).toBe('2025-06-13'); // exclusive
  });

  it('includes description and location when present', () => {
    const event = makeDayFlowEvent({
      description: 'Weekly sync',
      meta: {
        ...makeDayFlowEvent().meta,
        location: 'Room A',
      },
    });
    const input = mapDayFlowEventToGoogle(event);
    expect(input.description).toBe('Weekly sync');
    expect(input.location).toBe('Room A');
  });

  it('omits description and location when absent', () => {
    const event = makeDayFlowEvent({ description: undefined, meta: undefined });
    const input = mapDayFlowEventToGoogle(event);
    expect(input.description).toBeUndefined();
    expect(input.location).toBeUndefined();
  });
});

// ─── mapGoogleCalendarToDayFlow ───────────────────────────────────────────────

function makeEntry(
  overrides: Partial<GoogleCalendarListEntry> = {}
): GoogleCalendarListEntry {
  return {
    id: 'cal-1',
    summary: 'Work',
    accessRole: 'owner',
    ...overrides,
  };
}

describe('mapGoogleCalendarToDayFlow', () => {
  it('maps basic calendar fields', () => {
    const cal = mapGoogleCalendarToDayFlow(makeEntry());
    expect(cal.id).toBe('cal-1');
    expect(cal.name).toBe('Work');
    expect(cal.source).toBe('Google');
  });

  it('sets readOnly=false for owner', () => {
    const cal = mapGoogleCalendarToDayFlow(makeEntry({ accessRole: 'owner' }));
    expect(cal.readOnly).toBe(false);
  });

  it('sets readOnly=false for writer', () => {
    const cal = mapGoogleCalendarToDayFlow(makeEntry({ accessRole: 'writer' }));
    expect(cal.readOnly).toBe(false);
  });

  it('sets readOnly=true for reader', () => {
    const cal = mapGoogleCalendarToDayFlow(makeEntry({ accessRole: 'reader' }));
    expect(cal.readOnly).toBe(true);
  });

  it('sets readOnly=true for freeBusyReader', () => {
    const cal = mapGoogleCalendarToDayFlow(
      makeEntry({ accessRole: 'freeBusyReader' })
    );
    expect(cal.readOnly).toBe(true);
  });

  it('provides a colors object', () => {
    const cal = mapGoogleCalendarToDayFlow(makeEntry());
    expect(cal.colors).toBeDefined();
    expect(typeof cal.colors.eventColor).toBe('string');
  });

  it('preserves google meta', () => {
    const cal = mapGoogleCalendarToDayFlow(makeEntry({ primary: true }));
    const meta = cal.subscription!.meta!.google as {
      primary: boolean;
      accessRole: string;
    };
    expect(meta.primary).toBe(true);
    expect(meta.accessRole).toBe('owner');
  });
});
