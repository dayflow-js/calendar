import { Temporal } from 'temporal-polyfill';

import { CalendarApp } from '@/core/CalendarApp';
import { createDayView } from '@/factories/createDayView';
import { createMonthView } from '@/factories/createMonthView';
import { createWeekView } from '@/factories/createWeekView';
import { ViewType } from '@/types';

describe('CalendarApp', () => {
  describe('Event Management', () => {
    it('should add an event', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        defaultView: ViewType.WEEK,
      });

      const event = {
        id: 'test-1',
        title: 'Test Event',
        start: Temporal.Now.plainDateISO(),
        end: Temporal.Now.plainDateISO(),
      };

      app.addEvent(event);
      const events = app.getAllEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    it('should update an event', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [
          {
            id: 'test-1',
            title: 'Original Title',
            start: Temporal.Now.plainDateISO(),
            end: Temporal.Now.plainDateISO(),
          },
        ],
        defaultView: ViewType.WEEK,
      });

      app.updateEvent('test-1', { title: 'Updated Title' });
      const events = app.getAllEvents();

      expect(events[0].title).toBe('Updated Title');
    });

    it('should delete an event', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [
          {
            id: 'test-1',
            title: 'Test Event',
            start: Temporal.Now.plainDateISO(),
            end: Temporal.Now.plainDateISO(),
          },
        ],
        defaultView: ViewType.WEEK,
      });

      app.deleteEvent('test-1');
      const events = app.getAllEvents();

      expect(events).toHaveLength(0);
    });

    it('should throw error when updating non-existent event', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        defaultView: ViewType.WEEK,
      });

      expect(() => {
        app.updateEvent('non-existent', { title: 'New Title' });
      }).toThrow('Event with id non-existent not found');
    });
  });

  describe('View Management', () => {
    it('should change view', () => {
      const app = new CalendarApp({
        views: [createMonthView(), createWeekView(), createDayView()],
        plugins: [],
        events: [],
        defaultView: ViewType.WEEK,
      });

      app.changeView(ViewType.MONTH);
      expect(app.state.currentView).toBe(ViewType.MONTH);
    });

    it('should navigate to today', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        defaultView: ViewType.WEEK,
      });

      const today = new Date();
      app.goToToday();

      const appDate = app.state.currentDate;
      expect(appDate.getFullYear()).toBe(today.getFullYear());
      expect(appDate.getMonth()).toBe(today.getMonth());
      expect(appDate.getDate()).toBe(today.getDate());
    });
  });

  describe('Dynamic Configuration', () => {
    it('should update views via updateConfig', () => {
      const app = new CalendarApp({
        views: [createMonthView()],
        plugins: [],
        events: [],
      });

      expect(app.state.views.has(ViewType.MONTH)).toBe(true);
      expect(app.state.views.has(ViewType.WEEK)).toBe(false);

      app.updateConfig({
        views: [createMonthView(), createWeekView()],
      });

      expect(app.state.views.has(ViewType.MONTH)).toBe(true);
      expect(app.state.views.has(ViewType.WEEK)).toBe(true);
    });
  });

  describe('Locale Management', () => {
    it('should default to en-US locale', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
      });

      expect(app.state.locale).toBe('en-US');
    });

    it('should accept any provided locale string', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        locale: 'ja',
      });

      expect(app.state.locale).toBe('ja');
    });

    it('should accept arbitrary locale string (validation handled by consumer)', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        locale: 'fr-CA',
      });

      expect(app.state.locale).toBe('fr-CA');
    });

    it('should accept Locale object', () => {
      const customLocale = {
        code: 'custom',
        messages: { today: 'Today Custom' },
      };
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        locale: customLocale,
      });

      expect(app.state.locale).toBe(customLocale);
    });

    it('should fallback to en-US for invalid locale string', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        locale: '!!!',
      });

      expect(app.state.locale).toBe('en-US');
    });

    it('should fallback to en-US for Locale object with invalid code', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        locale: { code: '!!invalid!!', messages: {} },
      });

      expect((app.state.locale as unknown as { code: string }).code).toBe(
        'en-US'
      );
    });
  });
});
