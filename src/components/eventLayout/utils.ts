import { Event } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils/helpers';
import { LayoutWeekEvent } from './types';

export function toLayoutEvent(event: Event): LayoutWeekEvent {
  return {
    ...event,
    parentId: undefined,
    children: [],
    // Only calculate hour values for non-all-day events
    _startHour: event.allDay ? 0 : extractHourFromDate(event.start),
    _endHour: event.allDay ? 0 : getEventEndHour(event),
  };
}

export function getStartHour(event: LayoutWeekEvent): number {
  return event._startHour ?? extractHourFromDate(event.start);
}

export function getEndHour(event: LayoutWeekEvent): number {
  return event._endHour ?? getEventEndHour(event);
}
