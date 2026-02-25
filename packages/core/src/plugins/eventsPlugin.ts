// Event management plugin
import {
  CalendarPlugin,
  ICalendarApp,
  Event,
  EventsService,
  EventsPluginConfig,
} from '@/types';
import { recalculateEventDays } from '@/utils';
import { temporalToDate } from '@/utils/temporal';

export const defaultEventsConfig: EventsPluginConfig = {
  enableAutoRecalculate: true,
  enableValidation: true,
  defaultEvents: [],
  maxEventsPerDay: 50,
};

// Utility function to get current week start time
function getCurrentWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function createEventsPlugin(
  config: EventsPluginConfig = {}
): CalendarPlugin {
  const finalConfig = { ...defaultEventsConfig, ...config };
  let app: ICalendarApp;

  const eventsService: EventsService = {
    getAll: () => app.getAllEvents(),

    getById: (id: string) => app.getAllEvents().find(event => event.id === id),

    add: (event: Event) => {
      // Validate event
      if (finalConfig.enableValidation) {
        const errors = eventsService.validateEvent(event);
        if (errors.length > 0) {
          throw new Error(`Event validation failed: ${errors.join(', ')}`);
        }
      }

      // Check daily event count limit
      if (finalConfig.maxEventsPerDay && event.day !== undefined) {
        const dayEvents = eventsService.getByDay(
          event.day,
          app.getCurrentDate()
        );
        if (dayEvents.length >= finalConfig.maxEventsPerDay) {
          throw new Error(
            `Maximum events per day (${finalConfig.maxEventsPerDay}) exceeded`
          );
        }
      }

      app.addEvent(event);

      // Automatically recalculate day field
      if (finalConfig.enableAutoRecalculate) {
        const currentWeekStart = getCurrentWeekStart(app.getCurrentDate());
        const recalculatedEvents = recalculateEventDays(
          app.getAllEvents(),
          currentWeekStart
        );
        // Update day field for all events
        app.state.events = recalculatedEvents;
      }
    },

    update: (id: string, updates: Partial<Event>) => {
      const existingEvent = eventsService.getById(id);
      if (!existingEvent) {
        throw new Error(`Event with id ${id} not found`);
      }

      const updatedEvent = { ...existingEvent, ...updates };

      // Validate updated event
      if (finalConfig.enableValidation) {
        const errors = eventsService.validateEvent(updatedEvent);
        if (errors.length > 0) {
          throw new Error(`Event validation failed: ${errors.join(', ')}`);
        }
      }

      app.updateEvent(id, updates);

      // Automatically recalculate day field
      if (finalConfig.enableAutoRecalculate) {
        const currentWeekStart = getCurrentWeekStart(app.getCurrentDate());
        const recalculatedEvents = recalculateEventDays(
          app.getAllEvents(),
          currentWeekStart
        );
        app.state.events = recalculatedEvents;
      }

      return app.getAllEvents().find(e => e.id === id)!;
    },

    delete: (id: string) => {
      app.deleteEvent(id);
    },

    getByDate: (date: Date) =>
      app.getAllEvents().filter(event => {
        const eventDate = temporalToDate(event.start);
        eventDate.setHours(0, 0, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === targetDate.getTime();
      }),

    getByDateRange: (startDate: Date, endDate: Date) =>
      app.getAllEvents().filter(event => {
        // Check if event start or end time is within range
        const eventStart = temporalToDate(event.start);
        const eventEnd = temporalToDate(event.end);
        return (
          (eventStart >= startDate && eventStart <= endDate) ||
          (eventEnd >= startDate && eventEnd <= endDate) ||
          (eventStart <= startDate && eventEnd >= endDate)
        );
      }),

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getByDay: (dayIndex: number, _weekStart: Date) =>
      app.getAllEvents().filter(event => event.day === dayIndex),

    getAllDayEvents: (dayIndex: number, events: Event[]) =>
      events.filter(event => event.day === dayIndex && event.allDay),

    recalculateEventDays: (events: Event[], weekStart: Date) =>
      recalculateEventDays(events, weekStart),

    validateEvent: (event: Partial<Event>) => {
      const errors: string[] = [];

      if (!event.title || event.title.trim() === '') {
        errors.push('Event title is required');
      }

      if (!event.start) {
        errors.push('Event start time is required');
      }

      if (!event.end) {
        errors.push('Event end time is required');
      }

      if (
        event.start &&
        event.end &&
        !event.allDay &&
        event.start >= event.end
      ) {
        errors.push('Start time must be before end time');
      }

      // ID must be a string
      if (event.id && typeof event.id !== 'string') {
        errors.push('Event ID must be a string');
      }

      // Commented out day range check, because month view needs to support cross-week events,
      // day value may exceed 0-6 range
      // if (event.day !== undefined && (event.day < 0 || event.day > 6)) {
      //   errors.push('Day must be between 0 and 6');
      // }

      return errors;
    },

    filterEvents: (events: Event[], filter: (event: Event) => boolean) =>
      events.filter(filter),
  };

  return {
    name: 'events',
    config: finalConfig,
    install: (calendarApp: ICalendarApp) => {
      app = calendarApp;
    },
    api: eventsService,
  };
}
