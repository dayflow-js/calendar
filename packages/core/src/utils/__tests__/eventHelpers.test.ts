import { Temporal } from 'temporal-polyfill';

import { createAllDayEvent } from '@/utils/eventHelpers';

describe('eventHelpers', () => {
  describe('createAllDayEvent', () => {
    it('creates an all-day event from the object API and preserves calendarId', () => {
      const event = createAllDayEvent({
        id: 'conference',
        title: 'Conference',
        start: new Date(2026, 5, 7),
        calendarId: 'work',
      });

      expect(event).toEqual({
        id: 'conference',
        title: 'Conference',
        description: undefined,
        start: Temporal.PlainDate.from('2026-06-07'),
        end: Temporal.PlainDate.from('2026-06-07'),
        allDay: true,
        calendarId: 'work',
        meta: undefined,
      });
    });

    it('supports multi-day all-day events from the object API', () => {
      const event = createAllDayEvent({
        id: 'retreat',
        title: 'Team Retreat',
        start: Temporal.PlainDate.from('2026-06-07'),
        end: Temporal.PlainDate.from('2026-06-09'),
      });

      expect(event.start).toEqual(Temporal.PlainDate.from('2026-06-07'));
      expect(event.end).toEqual(Temporal.PlainDate.from('2026-06-09'));
      expect(event.allDay).toBe(true);
    });

    it('keeps the legacy positional signature working with calendarId', () => {
      const event = createAllDayEvent(
        'legacy',
        'Legacy Conference',
        new Date(2026, 5, 7),
        new Date(2026, 5, 8),
        'travel'
      );

      expect(event.calendarId).toBe('travel');
      expect(event.start).toEqual(Temporal.PlainDate.from('2026-06-07'));
      expect(event.end).toEqual(Temporal.PlainDate.from('2026-06-08'));
    });

    it('supports legacy positional options objects', () => {
      const event = createAllDayEvent(
        'legacy-options',
        'Legacy Options',
        new Date(2026, 5, 7),
        {
          calendarId: 'personal',
          description: 'Old callsite with options',
          meta: { source: 'test' },
        }
      );

      expect(event.calendarId).toBe('personal');
      expect(event.description).toBe('Old callsite with options');
      expect(event.meta).toEqual({ source: 'test' });
    });
  });
});
