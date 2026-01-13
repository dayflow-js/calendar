import { CalendarApp } from '../CalendarApp';
import { ViewType } from '@/types';
import { Temporal } from 'temporal-polyfill';
import { createMonthView } from '@/factories/createMonthView';
import { createWeekView } from '@/factories/createWeekView';
import { createDayView } from '@/factories/createDayView';

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

  describe('Locale Management', () => {
    it('should default to en-US locale', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
      });

      expect(app.state.locale).toBe('en-US');
    });

    it('should use provided locale', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        locale: 'ja-JP',
      });

      expect(app.state.locale).toBe('ja-JP');
    });
  });
});
