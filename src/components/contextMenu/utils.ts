import { Temporal } from 'temporal-polyfill';
import { Event, ViewType, CalendarApp } from '@/types';
import { generateUniKey, temporalToDate, dateToZonedDateTime, dateToPlainDate } from '@/utils';
import { clipboardStore } from '@/utils/clipboardStore';

/**
 * Handle pasting an event from the clipboard store or system clipboard
 */
export const handlePasteEvent = async (
  app: CalendarApp,
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

    if (eventData && typeof eventData === 'object' && eventData.title) {
       // Calculate duration of original event using utility to handle Temporal objects
       const originalStart = temporalToDate(eventData.start as any);
       const originalEnd = temporalToDate(eventData.end as any);
       const duration = originalEnd.getTime() - originalStart.getTime();

       // Clean up internal fields that shouldn't be copied
       const { _segmentInfo, ...cleanEventData } = eventData as any;

       // Target dates
       const targetStartDate = new Date(date);
       
       // Preserve time logic:
       // If pasting into Month/Year view, or if the click was exactly at midnight (00:00) 
       // and the original event had a non-midnight time, preserve the original time.
       const isMonthOrYear = viewType === ViewType.MONTH || viewType === ViewType.YEAR;
       const isClickedAtMidnight = targetStartDate.getHours() === 0 && targetStartDate.getMinutes() === 0;
       const originalHadTime = originalStart.getHours() !== 0 || originalStart.getMinutes() !== 0;

       if (!eventData.allDay && (isMonthOrYear || (isClickedAtMidnight && originalHadTime))) {
          targetStartDate.setHours(
            originalStart.getHours(),
            originalStart.getMinutes(),
            originalStart.getSeconds(),
            originalStart.getMilliseconds()
          );
       }

       const targetEndDate = new Date(targetStartDate.getTime() + (duration > 0 ? duration : 3600000));

       const newEvent: Event = {
         ...cleanEventData,
         id: generateUniKey(),
         // Use Temporal objects consistently
         start: eventData.allDay 
           ? dateToPlainDate(targetStartDate) 
           : dateToZonedDateTime(targetStartDate, Temporal.Now.timeZoneId()),
         end: eventData.allDay 
           ? dateToPlainDate(targetEndDate) 
           : dateToZonedDateTime(targetEndDate, Temporal.Now.timeZoneId()),
         // Ensure it belongs to a valid calendar
         calendarId: eventData.calendarId && app.getCalendarRegistry().has(eventData.calendarId) 
           ? eventData.calendarId 
           : app.getCalendarRegistry().getDefaultCalendarId() || 'default', 
       };
       
       app.addEvent(newEvent);
    }
  } catch (err) {
    console.error('Failed to paste event:', err);
  }
};
