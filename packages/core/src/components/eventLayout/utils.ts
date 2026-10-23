import { Event } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils/helpers';

import { LAYOUT_CONFIG } from './constants';
import { LayoutWeekEvent } from './types';

export function toLayoutEvent(event: Event): LayoutWeekEvent {
  if (event.allDay) {
    return {
      ...event,
      parentId: undefined,
      children: [],
      _startHour: 0,
      _endHour: 0,
    };
  }

  const startHour = extractHourFromDate(event.start);
  return {
    ...event,
    parentId: undefined,
    children: [],
    _startHour: startHour,
    // Events are drawn at least MIN_VISUAL_DURATION tall, so lay them out with
    // that span too; otherwise zero-length tasks at the same time stack.
    _endHour: Math.max(
      getEventEndHour(event),
      startHour + LAYOUT_CONFIG.MIN_VISUAL_DURATION
    ),
  };
}

export function getStartHour(event: LayoutWeekEvent): number {
  return event._startHour ?? extractHourFromDate(event.start);
}

export function getEndHour(event: LayoutWeekEvent): number {
  return event._endHour ?? getEventEndHour(event);
}

export function getOriginalStartHour(event: LayoutWeekEvent): number {
  return event._originalStartHour ?? getStartHour(event);
}

export function getOriginalEndHour(event: LayoutWeekEvent): number {
  return event._originalEndHour ?? getEndHour(event);
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(
  event1: LayoutWeekEvent,
  event2: LayoutWeekEvent
): boolean {
  if (event1.day !== event2.day || event1.allDay || event2.allDay) return false;
  return (
    getStartHour(event1) < getEndHour(event2) &&
    getStartHour(event2) < getEndHour(event1)
  );
}

/**
 * Check one-way parallel relationship of extended events
 * @param extendedEvent Potential extended event
 * @param otherEvent Other event
 */
export function isExtendedEventParallel(
  extendedEvent: LayoutWeekEvent,
  otherEvent: LayoutWeekEvent
): boolean {
  const duration = getEndHour(extendedEvent) - getStartHour(extendedEvent);

  // Only consider as extended event if duration exceeds 1.25 hours
  if (duration < 1.25) return false;

  // Calculate the start time of extended event's "latter half" (latter half starts at 40% position)
  const lateStartThreshold = getStartHour(extendedEvent) + duration * 0.4;

  // Other event must start in the latter half and overlap with extended event
  const isInLateStart = getStartHour(otherEvent) >= lateStartThreshold;
  const hasOverlap = eventsOverlap(extendedEvent, otherEvent);

  return isInLateStart && hasOverlap;
}

/**
 * Check parallel relationship of extended events
 */
export function checkExtendedEventParallel(
  event1: LayoutWeekEvent,
  event2: LayoutWeekEvent
): boolean {
  // Ensure events overlap
  if (!eventsOverlap(event1, event2)) return false;

  // Check if event1 is an extended event, event2 starts in its latter half
  if (isExtendedEventParallel(event1, event2)) {
    return true;
  }

  // Check if event2 is an extended event, event1 starts in its latter half
  if (isExtendedEventParallel(event2, event1)) {
    return true;
  }

  return false;
}

/**
 * Check if two events should be displayed in parallel
 */
export function shouldBeParallel(
  event1: LayoutWeekEvent,
  event2: LayoutWeekEvent,
  config: typeof LAYOUT_CONFIG = LAYOUT_CONFIG
): boolean {
  if (!eventsOverlap(event1, event2)) return false;

  const startTimeDiff = Math.abs(
    getOriginalStartHour(event1) - getOriginalStartHour(event2)
  );

  // Strictly within threshold, directly parallel
  if (startTimeDiff <= config.PARALLEL_THRESHOLD) {
    return true;
  }

  // Between threshold and nested threshold, consider load balancing
  if (
    startTimeDiff > config.PARALLEL_THRESHOLD &&
    startTimeDiff < config.NESTED_THRESHOLD
  ) {
    return true; // For load balancing, also consider as parallel
  }

  // Check if one is an extended event
  return checkExtendedEventParallel(event1, event2);
}

/**
 * Check if parent event can contain child event
 */
export function canEventContain(
  parent: LayoutWeekEvent,
  child: LayoutWeekEvent
): boolean {
  const strictContain =
    getOriginalStartHour(parent) <= getOriginalStartHour(child) &&
    getOriginalEndHour(parent) >= getOriginalEndHour(child);
  const overlapNesting =
    getOriginalStartHour(parent) <= getOriginalStartHour(child) &&
    getOriginalStartHour(child) < getOriginalEndHour(parent) &&
    eventsOverlap(parent, child);

  return strictContain || overlapNesting;
}
