import { Temporal } from 'temporal-polyfill';

import type { Event, EventKind, TaskPriority } from '@/types';
import { isPlainDate } from '@/utils/temporal';

const PRIORITY_MARKS: Record<TaskPriority, string> = {
  none: '',
  low: '!',
  medium: '!!',
  high: '!!!',
};

export const isTask = (event: Pick<Event, 'kind'>): boolean =>
  event.kind === 'task';

export const isTaskCompleted = (event: Pick<Event, 'kind' | 'task'>): boolean =>
  isTask(event) && !!event.task?.completed;

export const getTaskPriority = (event: Pick<Event, 'task'>): TaskPriority =>
  event.task?.priority ?? 'none';

/** Reminders-style priority prefix: `!`, `!!`, `!!!`, or an empty string. */
export const getTaskPriorityMark = (event: Pick<Event, 'kind' | 'task'>) =>
  isTask(event) ? PRIORITY_MARKS[getTaskPriority(event)] : '';

/**
 * Switch an item between event and task.
 * A task is due at `start`, so its `end` collapses onto `start`. Turning a
 * task back into an event gives it one hour, or a single day when all-day.
 * Task fields are cleared with explicit `undefined` because `updateEvent`
 * merges updates into the stored event.
 */
export const convertEventKind = (event: Event, kind: EventKind): Event => {
  if ((event.kind ?? 'event') === kind) return event;

  if (kind === 'task') {
    return { ...event, kind: 'task', end: event.start };
  }

  return {
    ...event,
    kind: undefined,
    task: undefined,
    end: isPlainDate(event.start)
      ? event.start
      : (event.start.add({ hours: 1 }) as Event['end']),
  };
};

export const setTaskCompleted = (
  event: Event,
  completed: boolean,
  timeZone: string = Temporal.Now.timeZoneId()
): Event => ({
  ...event,
  task: {
    ...event.task,
    completed,
    completedAt: completed
      ? Temporal.Now.zonedDateTimeISO(timeZone)
      : undefined,
  },
});

export const setTaskPriority = (
  event: Event,
  priority: TaskPriority
): Event => ({
  ...event,
  task: { ...event.task, priority },
});
