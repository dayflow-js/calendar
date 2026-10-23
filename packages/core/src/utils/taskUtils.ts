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

/** Full-row priority stripes; selected tasks use softened priority tones. */
export const getTaskPriorityBackground = (
  event: Pick<Event, 'task'>,
  selected = false
): string => {
  const colors: Record<TaskPriority, [string, string]> = {
    none: ['100, 116, 139', '51, 65, 85'],
    low: ['22, 163, 74', '22, 101, 52'],
    medium: ['217, 119, 6', '146, 64, 14'],
    high: ['220, 38, 38', '153, 27, 27'],
  };
  const color = colors[getTaskPriority(event)][selected ? 1 : 0];
  return `repeating-linear-gradient(-45deg, rgba(${color}, ${selected ? 0.8 : 0.18}) 0px, rgba(${color}, ${selected ? 0.8 : 0.18}) 6px, rgba(${color}, ${selected ? 0.65 : 0.05}) 6px, rgba(${color}, ${selected ? 0.65 : 0.05}) 12px)`;
};

/** Priority controls task text independently of its calendar-colored circle. */
export const getTaskPriorityTextColor = (
  event: Pick<Event, 'task'>,
  selected = false
): string => {
  const colors: Record<TaskPriority, [string, string]> = {
    none: ['var(--df-task-text-none, #475569)', '#e2e8f0'],
    low: ['var(--df-task-text-low, #15803d)', '#bbf7d0'],
    medium: ['var(--df-task-text-medium, #92400e)', '#fde68a'],
    high: ['var(--df-task-text-high, #b91c1c)', '#fecaca'],
  };
  return colors[getTaskPriority(event)][selected ? 1 : 0];
};
