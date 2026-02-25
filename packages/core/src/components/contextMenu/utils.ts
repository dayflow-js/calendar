import { Temporal } from 'temporal-polyfill';

import { Event, ViewType, ICalendarApp } from '@/types';
import {
  generateUniKey,
  temporalToDate,
  dateToZonedDateTime,
  dateToPlainDate,
} from '@/utils';
import { clipboardStore } from '@/utils/clipboardStore';

/**
 * Handle pasting an event from the clipboard store or system clipboard
 */
export const handlePasteEvent = async (
  app: ICalendarApp,
  date: Date,
  viewType?: ViewType
): Promise<void> => {
  if (!clipboardStore.hasEvent()) return;

  try {
    // Prefer the internal store for consistency and speed
    let eventData = clipboardStore.getEvent();

    if (!eventData) {
      // Fallback to system clipboard if internal store is somehow empty but text is there
      const text = await navigator.clipboard.readText();
      if (text) {
        eventData = JSON.parse(text);
      }
    }

    if (eventData && typeof eventData === 'object' && 'title' in eventData) {
      const typedEvent = eventData as Event;
      // Calculate duration of original event using utility to handle Temporal objects
      const originalStart = temporalToDate(typedEvent.start as unknown as Date);
      const originalEnd = temporalToDate(typedEvent.end as unknown as Date);
      const duration = originalEnd.getTime() - originalStart.getTime();

      // Clean up internal fields that shouldn't be copied
      const cleanEventData = eventData;

      // Target dates
      const targetStartDate = new Date(date);

      // Preserve time logic:
      // If pasting into Month/Year view, or if the click was exactly at midnight (00:00)
      // and the original event had a non-midnight time, preserve the original time.
      const isMonthOrYear =
        viewType === ViewType.MONTH || viewType === ViewType.YEAR;
      const isClickedAtMidnight =
        targetStartDate.getHours() === 0 && targetStartDate.getMinutes() === 0;
      const originalHadTime =
        originalStart.getHours() !== 0 || originalStart.getMinutes() !== 0;

      if (
        !typedEvent.allDay &&
        (isMonthOrYear || (isClickedAtMidnight && originalHadTime))
      ) {
        targetStartDate.setHours(
          originalStart.getHours(),
          originalStart.getMinutes(),
          originalStart.getSeconds(),
          originalStart.getMilliseconds()
        );
      }

      const targetEndDate = new Date(
        targetStartDate.getTime() + (duration > 0 ? duration : 3600000)
      );

      const newEvent: Event = {
        ...cleanEventData,
        title: typedEvent.title,
        id: generateUniKey(),
        // Use Temporal objects consistently
        start: typedEvent.allDay
          ? dateToPlainDate(targetStartDate)
          : dateToZonedDateTime(targetStartDate, Temporal.Now.timeZoneId()),
        end: typedEvent.allDay
          ? dateToPlainDate(targetEndDate)
          : dateToZonedDateTime(targetEndDate, Temporal.Now.timeZoneId()),
        // Ensure it belongs to a valid calendar
        calendarId:
          typedEvent.calendarId &&
          app.getCalendarRegistry().has(typedEvent.calendarId)
            ? typedEvent.calendarId
            : app.getCalendarRegistry().getDefaultCalendarId() || 'default',
      };

      app.addEvent(newEvent);
    }
  } catch (err) {
    console.error('Failed to paste event:', err);
  }
};
