import { LayoutWeekEvent, ParallelGroup } from '../types';
import { eventsOverlap, getStartHour, getEndHour } from '../utils';
import { LAYOUT_CONFIG } from '../constants';

/**
 * Group overlapping events using BFS
 */
export function groupOverlappingEvents(
  events: LayoutWeekEvent[]
): LayoutWeekEvent[][] {
  const groups: LayoutWeekEvent[][] = [];
  const processed = new Set<string>();

  for (const event of events) {
    if (processed.has(event.id)) continue;

    const group = [event];
    const queue = [event];
    processed.add(event.id);

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const otherEvent of events) {
        if (processed.has(otherEvent.id)) continue;

        if (eventsOverlap(current, otherEvent)) {
          group.push(otherEvent);
          queue.push(otherEvent);
          processed.add(otherEvent.id);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Analyze parallel groups - group by start time
 */
export function analyzeParallelGroups(
  sortedEvents: LayoutWeekEvent[]
): ParallelGroup[] {
  const groups: ParallelGroup[] = [];
  const processed = new Set<string>();

  for (const event of sortedEvents) {
    if (processed.has(event.id)) continue;

    // Create new parallel group
    const groupEvents: LayoutWeekEvent[] = [event];
    processed.add(event.id);

    // Find events with similar start times (within threshold)
    for (const otherEvent of sortedEvents) {
      if (processed.has(otherEvent.id)) continue;

      const timeDiff = Math.abs(getStartHour(event) - getStartHour(otherEvent));
      if (timeDiff <= LAYOUT_CONFIG.PARALLEL_THRESHOLD) {
        groupEvents.push(otherEvent);
        processed.add(otherEvent.id);
      }
    }

    groupEvents.sort((a, b) => getStartHour(a) - getStartHour(b));

    const group: ParallelGroup = {
      events: groupEvents,
      startHour: Math.min(...groupEvents.map(e => getStartHour(e))),
      endHour: Math.max(...groupEvents.map(e => getEndHour(e))),
    };

    groups.push(group);
  }
  groups.sort((a, b) => a.startHour - b.startHour);

  return groups;
}
