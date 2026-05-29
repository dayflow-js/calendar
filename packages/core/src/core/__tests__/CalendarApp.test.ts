import { Temporal } from 'temporal-polyfill';

import { CalendarApp } from '@/core/CalendarApp';
import { createDayView } from '@/factories/createDayView';
import { createMonthView } from '@/factories/createMonthView';
import { createWeekView } from '@/factories/createWeekView';
import { createYearView } from '@/factories/createYearView';
import { ViewType } from '@/types';

const component = () => null;

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
      expect(events[0]).toEqual({
        ...event,
        calendarId: 'blue',
      });
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

    it('updates an event once and preserves the assigned calendarId', async () => {
      const onEventUpdate = jest.fn();
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [
          {
            id: 'test-update-once',
            title: 'Original Title',
            start: Temporal.Now.plainDateISO(),
            end: Temporal.Now.plainDateISO(),
          },
        ],
        calendars: [
          {
            id: 'work',
            name: 'Work',
            colors: {
              eventColor: '#000',
              eventSelectedColor: '#111',
              lineColor: '#222',
              textColor: '#333',
            },
          },
        ],
        defaultCalendar: 'work',
        callbacks: { onEventUpdate },
      });

      await app.updateEvent('test-update-once', { title: 'Updated Title' });

      expect(app.getAllEvents()).toEqual([
        expect.objectContaining({
          id: 'test-update-once',
          title: 'Updated Title',
          calendarId: 'work',
        }),
      ]);
      expect(onEventUpdate).toHaveBeenCalledTimes(1);
      expect(onEventUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-update-once',
          title: 'Updated Title',
          calendarId: 'work',
        })
      );
    });

    it('should delete an event', async () => {
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

      await app.deleteEvent('test-1');
      const events = app.getAllEvents();

      expect(events).toHaveLength(0);
    });

    it('should throw error when updating non-existent event', async () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        defaultView: ViewType.WEEK,
      });

      await expect(
        app.updateEvent('non-existent', { title: 'New Title' })
      ).rejects.toThrow('Event with id non-existent not found');
    });

    it('allows programmatic event changes while readOnly is true', async () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        defaultView: ViewType.WEEK,
        readOnly: true,
      });

      const event = {
        id: 'readonly-1',
        title: 'Read-only Event',
        start: Temporal.Now.plainDateISO(),
        end: Temporal.Now.plainDateISO(),
      };

      app.addEvent(event);
      await app.updateEvent(event.id, { title: 'Updated in Read-only' });
      await app.deleteEvent(event.id);

      expect(app.getAllEvents()).toHaveLength(0);
    });

    it('shows initial events without calendarId by assigning the default calendar', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [
          {
            id: 'initial-no-calendar',
            title: 'Initial Event',
            start: Temporal.Now.plainDateISO(),
            end: Temporal.Now.plainDateISO(),
          },
        ],
        calendars: [
          {
            id: 'work',
            name: 'Work',
            colors: {
              eventColor: '#000',
              eventSelectedColor: '#111',
              lineColor: '#222',
              textColor: '#333',
            },
          },
        ],
        defaultCalendar: 'work',
      });

      expect(app.getAllEvents()).toEqual([
        expect.objectContaining({
          id: 'initial-no-calendar',
          calendarId: 'work',
        }),
      ]);
      expect(app.getEvents()).toEqual([
        expect.objectContaining({
          id: 'initial-no-calendar',
          calendarId: 'work',
        }),
      ]);
    });

    it('applies batched programmatic changes while readOnly is true', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        defaultView: ViewType.WEEK,
        readOnly: true,
      });

      const event = {
        id: 'readonly-batch',
        title: 'Batch Event',
        start: Temporal.Now.plainDateISO(),
        end: Temporal.Now.plainDateISO(),
      };

      app.applyEventsChanges({ add: [event] });
      app.applyEventsChanges({
        update: [{ id: event.id, updates: { title: 'Batch Updated' } }],
      });

      expect(app.getAllEvents()).toEqual([
        { ...event, title: 'Batch Updated', calendarId: 'blue' },
      ]);

      app.applyEventsChanges({ delete: [event.id] });
      expect(app.getAllEvents()).toHaveLength(0);
    });

    it('exposes a consistent canMutateFromUI helper', () => {
      const editableApp = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        readOnly: false,
      });
      const readOnlyApp = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        readOnly: true,
      });
      const partialReadOnlyApp = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        readOnly: { draggable: false, viewable: true },
      });

      expect(editableApp.canMutateFromUI()).toBe(true);
      expect(readOnlyApp.canMutateFromUI()).toBe(false);
      expect(partialReadOnlyApp.canMutateFromUI()).toBe(false);
    });

    it('canMutateFromUI should respect per-calendar read-only status', () => {
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [
          {
            id: 'event-1',
            title: 'Subscribed Event',
            start: Temporal.Now.plainDateISO(),
            end: Temporal.Now.plainDateISO(),
            calendarId: 'sub-cal',
          },
          {
            id: 'event-2',
            title: 'Regular Event',
            start: Temporal.Now.plainDateISO(),
            end: Temporal.Now.plainDateISO(),
            calendarId: 'reg-cal',
          },
        ],
        calendars: [
          {
            id: 'sub-cal',
            name: 'Subscribed',
            colors: {
              eventColor: '#000',
              eventSelectedColor: '#000',
              lineColor: '#000',
              textColor: '#000',
            },
            subscription: {
              url: 'http://example.com/cal.ics',
              status: 'ready',
            },
          },
          {
            id: 'reg-cal',
            name: 'Regular',
            colors: {
              eventColor: '#000',
              eventSelectedColor: '#000',
              lineColor: '#000',
              textColor: '#000',
            },
          },
        ],
        readOnly: false,
      });

      // Default subscribed calendar is read-only
      expect(app.canMutateFromUI('sub-cal')).toBe(false);
      expect(app.canMutateFromUI('event-1')).toBe(false);

      // Regular calendar is editable
      expect(app.canMutateFromUI('reg-cal')).toBe(true);
      expect(app.canMutateFromUI('event-2')).toBe(true);

      // Explicit read-only on regular calendar
      app.updateCalendar('reg-cal', { readOnly: true });
      expect(app.canMutateFromUI('reg-cal')).toBe(false);
      expect(app.canMutateFromUI('event-2')).toBe(false);

      // Explicit override for subscribed calendar
      app.updateCalendar('sub-cal', { readOnly: false });
      expect(app.canMutateFromUI('sub-cal')).toBe(true);
      expect(app.canMutateFromUI('event-1')).toBe(true);

      // Global read-only overrides everything
      app.updateConfig({ readOnly: true });
      expect(app.canMutateFromUI('sub-cal')).toBe(false);
      expect(app.canMutateFromUI('reg-cal')).toBe(false);
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

  describe('Config Updates', () => {
    it('defaults eventDetailTrigger to dbClick and updates it dynamically', () => {
      const onRender = jest.fn();
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        callbacks: { onRender },
      });

      expect(app.getEventDetailTrigger()).toBe('dbClick');

      onRender.mockClear();
      app.updateConfig({ eventDetailTrigger: 'click' });
      expect(app.getEventDetailTrigger()).toBe('click');
      expect(onRender).toHaveBeenCalledTimes(1);

      onRender.mockClear();
      app.updateConfig({ eventDetailTrigger: 'dbClick' });
      expect(app.getEventDetailTrigger()).toBe('dbClick');
      expect(onRender).toHaveBeenCalledTimes(1);
    });

    it('updates day/week secondaryTimeZone and month/year visualTimeZone independently', () => {
      const app = new CalendarApp({
        views: [
          createDayView(),
          createWeekView(),
          createMonthView(),
          createYearView(),
        ],
        plugins: [],
        events: [],
      });

      app.updateConfig({
        views: [
          createDayView({ secondaryTimeZone: 'Asia/Tokyo' }),
          createWeekView({ secondaryTimeZone: 'Asia/Tokyo' }),
          createMonthView({}),
          createYearView({}),
        ],
      });

      expect(app.getViewConfig(ViewType.DAY)).toMatchObject({
        secondaryTimeZone: 'Asia/Tokyo',
      });
      expect(app.getViewConfig(ViewType.WEEK)).toMatchObject({
        secondaryTimeZone: 'Asia/Tokyo',
      });

      app.updateConfig({
        views: [
          createDayView({ secondaryTimeZone: 'America/New_York' }),
          createWeekView({ secondaryTimeZone: 'America/New_York' }),
          createMonthView({}),
          createYearView({}),
        ],
      });

      expect(app.getViewConfig(ViewType.DAY)).toMatchObject({
        secondaryTimeZone: 'America/New_York',
      });
      expect(app.getViewConfig(ViewType.WEEK)).toMatchObject({
        secondaryTimeZone: 'America/New_York',
      });
    });

    it('keeps navigation and app.state in sync after repeated view config updates', () => {
      const app = new CalendarApp({
        views: [
          createDayView(),
          createWeekView(),
          createMonthView(),
          createYearView(),
        ],
        plugins: [],
        events: [],
        defaultView: ViewType.MONTH,
      });

      app.updateConfig({
        views: [
          createDayView({ secondaryTimeZone: 'Asia/Tokyo' }),
          createWeekView({ secondaryTimeZone: 'Asia/Tokyo' }),
          createMonthView(),
          createYearView(),
        ],
      });

      app.updateConfig({
        views: [
          createDayView({ secondaryTimeZone: 'America/New_York' }),
          createWeekView({ secondaryTimeZone: 'America/New_York' }),
          createMonthView(),
          createYearView(),
        ],
      });

      app.changeView(ViewType.WEEK);

      expect(app.state.currentView).toBe(ViewType.WEEK);
      expect(app.getCurrentView().type).toBe(ViewType.WEEK);
      expect(app.getViewConfig(ViewType.WEEK)).toMatchObject({
        secondaryTimeZone: 'America/New_York',
      });
    });

    it('does not trigger a render when allDaySortComparator is unchanged', () => {
      const onRender = jest.fn();
      const comparator = jest.fn(() => 0);
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        callbacks: { onRender },
        allDaySortComparator: comparator,
      });

      onRender.mockClear();
      app.updateConfig({ allDaySortComparator: comparator });

      expect(onRender).not.toHaveBeenCalled();
    });

    it('triggers a render when allDaySortComparator changes', () => {
      const onRender = jest.fn();
      const comparatorA = jest.fn(() => 0);
      const comparatorB = jest.fn(() => 0);
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        callbacks: { onRender },
        allDaySortComparator: comparatorA,
      });

      onRender.mockClear();
      app.updateConfig({ allDaySortComparator: comparatorB });

      expect(onRender).toHaveBeenCalledTimes(1);
      expect(app.state.allDaySortComparator).toBe(comparatorB);
    });

    it('updates view config function references without forcing a render', () => {
      const onRender = jest.fn();
      const resolverA = jest.fn(() => 'a');
      const resolverB = jest.fn(() => 'b');
      const app = new CalendarApp({
        views: [
          {
            type: 'resource-grid',
            component,
            config: { getResourceId: resolverA },
          },
        ],
        plugins: [],
        events: [],
        callbacks: { onRender },
      });

      onRender.mockClear();
      app.updateConfig({
        views: [
          {
            type: 'resource-grid',
            component,
            config: { getResourceId: resolverB },
          },
        ],
      });

      expect(onRender).not.toHaveBeenCalled();
      expect(
        (
          app.getViewConfig('resource-grid') as {
            getResourceId?: typeof resolverB;
          }
        ).getResourceId
      ).toBe(resolverB);
    });

    it('replaces callbacks instead of retaining removed handlers', () => {
      const onEventClick = jest.fn();
      const app = new CalendarApp({
        views: [],
        plugins: [],
        events: [],
        callbacks: { onEventClick },
      });
      const event = {
        id: 'callback-event',
        title: 'Callback Event',
        start: Temporal.Now.plainDateISO(),
        end: Temporal.Now.plainDateISO(),
      };

      app.onEventClick(event);
      app.updateConfig({ callbacks: {} });
      app.onEventClick(event);

      expect(onEventClick).toHaveBeenCalledTimes(1);
    });
  });
});
