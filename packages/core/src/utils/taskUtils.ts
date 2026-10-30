import { Temporal } from 'temporal-polyfill';

import type { TranslationKey } from '@/locale/types';
import type {
  Event,
  EventKind,
  TaskMember,
  TaskPriority,
  TaskStatus,
} from '@/types';
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

/** Used when `taskStatuses` is not configured. Titles come from translations. */
export const DEFAULT_TASK_STATUSES: readonly TaskStatus[] = [
  { id: 'todo', color: '#8b5cf6' },
  { id: 'in-progress', color: '#0ea5e9' },
  { id: 'done', color: '#10b981', completed: true },
];

/**
 * Configured statuses, or the defaults when there are none or an ID is
 * missing or reused. Statuses are any columns a team works in (stages,
 * quarters, ...); none of them has to be `completed`.
 */
export const normalizeTaskStatuses = (
  statuses: readonly TaskStatus[] | undefined
): readonly TaskStatus[] => {
  if (!statuses?.length) return DEFAULT_TASK_STATUSES;
  const ids = new Set(statuses.map(status => status.id));
  const valid =
    ids.size === statuses.length && statuses.every(status => status.id);
  if (valid) return statuses;
  console.warn(
    '[DayFlow] taskStatuses need unique, non-empty IDs; using the defaults.'
  );
  return DEFAULT_TASK_STATUSES;
};

/** Translation keys for the built-in status IDs. */
const TASK_STATUS_MESSAGE_KEYS: Record<string, TranslationKey | undefined> = {
  todo: 'taskStatusTodo',
  'in-progress': 'taskStatusInProgress',
  done: 'taskStatusDone',
};

export const getTaskStatusTitle = (
  status: TaskStatus,
  t: (key: TranslationKey) => string
): string => {
  if (status.title) return status.title;
  const key = TASK_STATUS_MESSAGE_KEYS[status.id];
  return key ? t(key) : status.id;
};

/** Whether some status marks its tasks complete. */
export const tracksTaskCompletion = (statuses: readonly TaskStatus[]) =>
  statuses.some(status => status.completed);

/**
 * The status a task is in. When some status is `completed`, completion is
 * authoritative: a task completed from a calendar checkbox moves to a
 * completed status, and reopening it returns it to its stored status when
 * that status is open. Without completed statuses a checked task stays in
 * its own status.
 */
export const resolveTaskStatus = (
  event: Pick<Event, 'kind' | 'task'>,
  statuses: readonly TaskStatus[]
): TaskStatus | undefined => {
  const completed = isTaskCompleted(event);
  const stored = statuses.find(status => status.id === event.task?.status);
  if (stored && !!stored.completed === completed) return stored;
  return (
    statuses.find(status => !!status.completed === completed) ??
    stored ??
    statuses[0]
  );
};

/**
 * Move a task to a status, completing or reopening it to match. Pass the
 * workflow's statuses: when none of them is `completed`, moving a task
 * leaves its completion alone.
 */
export const setTaskStatus = (
  event: Event,
  status: TaskStatus,
  timeZone?: string,
  statuses?: readonly TaskStatus[]
): Event => {
  const completed =
    !statuses || tracksTaskCompletion(statuses)
      ? !!status.completed
      : isTaskCompleted(event);
  const next =
    isTaskCompleted(event) === completed
      ? event
      : setTaskCompleted(event, completed, timeZone);
  return { ...next, task: { ...next.task, status: status.id } };
};

export const getTaskAssigneeIds = (event: Pick<Event, 'task'>): string[] =>
  event.task?.assigneeIds ?? [];

/** Members assigned to a task, in assignment order. Unknown IDs are skipped. */
export const getTaskAssignees = (
  event: Pick<Event, 'task'>,
  members: readonly TaskMember[]
): TaskMember[] =>
  getTaskAssigneeIds(event).flatMap(id => {
    const member = members.find(item => item.id === id);
    return member ? [member] : [];
  });

export const setTaskAssignees = (
  event: Event,
  assigneeIds: string[]
): Event => ({
  ...event,
  task: { ...event.task, assigneeIds },
});

/** Up to two initials for an avatar without an image. */
export const getMemberInitials = (member: Pick<TaskMember, 'name'>): string =>
  member.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => [...part][0] ?? '')
    .join('')
    .toUpperCase();

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
