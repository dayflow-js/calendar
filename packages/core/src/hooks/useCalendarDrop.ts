import { useCallback } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { useLocale } from '@/locale';
import { Event, CalendarColors, ICalendarApp } from '@/types';

export interface CalendarDropData {
  calendarId: string;
  calendarName: string;
  calendarColors: CalendarColors;
  calendarIcon?: string;
}

export interface CalendarDropOptions {
  app: ICalendarApp;
  onEventCreated?: (event: Event) => void;
}

export interface CalendarDropReturn {
  handleDrop: (
    e: DragEvent,
    dropDate: Date,
    dropHour?: number,
    isAllDay?: boolean
  ) => Event | null;
  handleDragOver: (e: DragEvent) => void;
}

/**
 * Hook to handle dropping calendar from sidebar to create events
 */
export function useCalendarDrop(
  options: CalendarDropOptions
): CalendarDropReturn {
  const { app, onEventCreated } = options;
  const { t } = useLocale();

  const handleDragOver = useCallback((e: DragEvent) => {
    // Check if the drag data is from a calendar
    if (
      e.dataTransfer &&
      e.dataTransfer.types.includes('application/x-dayflow-calendar')
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(
    (
      e: DragEvent,
      dropDate: Date,
      dropHour?: number,
      isAllDay?: boolean
    ): Event | null => {
      e.preventDefault();

      if (!e.dataTransfer) return null;

      // Get calendar data from drag event
      const dragDataStr = e.dataTransfer.getData(
        'application/x-dayflow-calendar'
      );
      if (!dragDataStr) {
        return null;
      }

      try {
        const dragData: CalendarDropData = JSON.parse(dragDataStr);

        // Create event based on drop location
        let start: Temporal.PlainDateTime;
        let end: Temporal.PlainDateTime;
        let allDay = false;

        if (isAllDay) {
          // For All-day area - create all-day event (same day, not spanning to next day)
          start = Temporal.PlainDateTime.from({
            year: dropDate.getFullYear(),
            month: dropDate.getMonth() + 1,
            day: dropDate.getDate(),
            hour: 0,
            minute: 0,
          });
          // Set end to the same day at end of day (23:59:59)
          end = Temporal.PlainDateTime.from({
            year: dropDate.getFullYear(),
            month: dropDate.getMonth() + 1,
            day: dropDate.getDate(),
            hour: 23,
            minute: 59,
            second: 59,
          });
          allDay = true;
        } else if (dropHour === undefined) {
          // For Month view - create timed event 9:00-10:00
          start = Temporal.PlainDateTime.from({
            year: dropDate.getFullYear(),
            month: dropDate.getMonth() + 1,
            day: dropDate.getDate(),
            hour: 9,
            minute: 0,
          });
          end = start.add({ hours: 1 });
        } else {
          // For Day/Week view with specific hour
          start = Temporal.PlainDateTime.from({
            year: dropDate.getFullYear(),
            month: dropDate.getMonth() + 1,
            day: dropDate.getDate(),
            hour: dropHour,
            minute: 0,
          });
          // Default 1 hour span
          end = start.add({ hours: 1 });
        }

        // Generate unique event ID
        const eventId = `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        // Create new event
        const newEvent: Event = {
          id: eventId,
          title: allDay
            ? t('newAllDayCalendarEvent', {
                calendarName: dragData.calendarName,
              })
            : t('newCalendarEvent', { calendarName: dragData.calendarName }),
          description: '',
          start,
          end,
          calendarId: dragData.calendarId,
          allDay,
        };

        // Add event to calendar
        app.addEvent(newEvent);

        // Trigger callback
        onEventCreated?.(newEvent);

        return newEvent;
      } catch (error) {
        console.error('Error creating event from calendar drop:', error);
        return null;
      }
    },
    [app, onEventCreated]
  );

  return {
    handleDrop,
    handleDragOver,
  };
}
