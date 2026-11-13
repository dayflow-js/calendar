import { Temporal } from 'temporal-polyfill';

import type { Event } from '@/types';
import { isEventDeepEqual } from '@/utils/eventUtils';
import { expandRecurringEvents } from '@/utils/recurrence';
import {
  convertEventKind,
  DEFAULT_TASK_STATUSES,
  getMemberInitials,
  getTaskAssignees,
  getTaskPriorityMark,
  isTask,
  isTaskCompleted,
  normalizeTaskStatuses,
  resolveTaskStatus,
  setTaskCompleted,
  setTaskPriority,
  setTaskStatus,
} from '@/utils/taskUtils';

const TZ = 'Australia/Sydney';
const noop = (): void => undefined;

const timedEvent: Event = {
  id: 'event-1',
  title: 'Planning',
  start: Temporal.ZonedDateTime.from('2026-10-14T09:00:00[Australia/Sydney]'),
  end: Temporal.ZonedDateTime.from('2026-10-14T10:30:00[Australia/Sydney]'),
};

const allDayEvent: Event = {
  id: 'event-2',
  title: 'Offsite',
  allDay: true,
  start: Temporal.PlainDate.from('2026-10-14'),
  end: Temporal.PlainDate.from('2026-10-16'),
};

describe('taskUtils', () => {
  it('treats items without a kind as events', () => {
    expect(isTask(timedEvent)).toBe(false);
    expect(isTask({ kind: 'task' })).toBe(true);
  });

  it('collapses the end onto the start when converting to a task', () => {
    const task = convertEventKind(timedEvent, 'task');
    expect(task.kind).toBe('task');
    expect(task.end.toString()).toBe(timedEvent.start.toString());

    const allDayTask = convertEventKind(allDayEvent, 'task');
    expect(allDayTask.end.toString()).toBe('2026-10-14');
  });

  it('gives a task one hour, or one day, when converting back', () => {
    const task = convertEventKind(
      setTaskCompleted(timedEvent, true, TZ),
      'task'
    );
    const event = convertEventKind(task, 'event');
    expect(event.end.toString()).toBe(
      Temporal.ZonedDateTime.from(
        '2026-10-14T10:00:00[Australia/Sydney]'
      ).toString()
    );

    const allDay = convertEventKind(
      convertEventKind(allDayEvent, 'task'),
      'event'
    );
    expect(allDay.end.toString()).toBe('2026-10-14');
  });

  // updateEvent merges updates into the stored event, so dropped keys would
  // leave the old task state behind.
  it('clears task fields even when merged over the stored task', () => {
    const stored: Event = {
      ...timedEvent,
      kind: 'task',
      task: { completed: true },
    };
    const merged = { ...stored, ...convertEventKind(stored, 'event') };
    expect(merged.kind).toBeUndefined();
    expect(merged.task).toBeUndefined();
  });

  it('returns the same object when the kind does not change', () => {
    expect(convertEventKind(timedEvent, 'event')).toBe(timedEvent);
  });

  it('stamps and clears completedAt', () => {
    const task = convertEventKind(timedEvent, 'task');
    const done = setTaskCompleted(task, true, TZ);
    expect(isTaskCompleted(done)).toBe(true);
    expect(done.task?.completedAt?.timeZoneId).toBe(TZ);

    const reopened = setTaskCompleted(done, false, TZ);
    expect(isTaskCompleted(reopened)).toBe(false);
    expect(reopened.task?.completedAt).toBeUndefined();
  });

  it('marks priority only on tasks', () => {
    const task = convertEventKind(timedEvent, 'task');
    expect(getTaskPriorityMark(task)).toBe('');
    expect(getTaskPriorityMark(setTaskPriority(task, 'medium'))).toBe('!!');
    expect(getTaskPriorityMark(setTaskPriority(timedEvent, 'high'))).toBe('');
  });

  it('counts kind, completion and priority as changes', () => {
    const task = convertEventKind(timedEvent, 'task');
    expect(isEventDeepEqual(timedEvent, task)).toBe(false);
    expect(isEventDeepEqual(task, setTaskCompleted(task, true, TZ))).toBe(
      false
    );
    expect(isEventDeepEqual(task, setTaskPriority(task, 'low'))).toBe(false);
    expect(isEventDeepEqual(task, setTaskPriority(task, 'none'))).toBe(true);
  });

  it('does not copy completion onto later repeats', () => {
    const task: Event = {
      ...convertEventKind(timedEvent, 'task'),
      task: { completed: true },
      meta: { recurring: true, recurrenceRule: 'FREQ=DAILY;COUNT=3' },
    };

    const [first, second] = expandRecurringEvents(
      [task],
      new Date('2026-10-13T00:00:00+11:00'),
      new Date('2026-10-20T00:00:00+11:00'),
      TZ
    );

    expect(first.task?.completed).toBe(true);
    expect(second._recurrenceMasterId).toBe(task.id);
    expect(second.task?.completed).toBe(false);
  });
});

describe('task status and assignees', () => {
  const task: Event = { ...timedEvent, kind: 'task', end: timedEvent.start };

  it('resolves the stored status unless completion disagrees', () => {
    const doing = { ...task, task: { status: 'in-progress' } };
    expect(resolveTaskStatus(doing, DEFAULT_TASK_STATUSES)?.id).toBe(
      'in-progress'
    );
    const completed = setTaskCompleted(doing, true, TZ);
    expect(resolveTaskStatus(completed, DEFAULT_TASK_STATUSES)?.id).toBe(
      'done'
    );
    // Reopening returns the task to the open status it was in.
    const reopened = setTaskCompleted(completed, false, TZ);
    expect(resolveTaskStatus(reopened, DEFAULT_TASK_STATUSES)?.id).toBe(
      'in-progress'
    );
    expect(
      resolveTaskStatus(
        { ...task, task: { status: 'missing' } },
        DEFAULT_TASK_STATUSES
      )?.id
    ).toBe('todo');
  });

  it('completes and reopens a task when its status changes', () => {
    const [todo, , done] = DEFAULT_TASK_STATUSES;
    const finished = setTaskStatus(task, done, TZ);
    expect(finished.task).toMatchObject({ status: 'done', completed: true });
    expect(finished.task?.completedAt?.timeZoneId).toBe(TZ);
    expect(setTaskStatus(finished, todo, TZ).task).toMatchObject({
      status: 'todo',
      completed: false,
      completedAt: undefined,
    });
  });

  it('falls back to the default statuses for an unusable workflow', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
    expect(normalizeTaskStatuses([])).toBe(DEFAULT_TASK_STATUSES);
    expect(
      normalizeTaskStatuses([{ id: 'a' }, { id: 'a', completed: true }])
    ).toBe(DEFAULT_TASK_STATUSES);
    expect(normalizeTaskStatuses([{ id: '' }])).toBe(DEFAULT_TASK_STATUSES);
    const custom = [{ id: 'open' }, { id: 'shipped', completed: true }];
    expect(normalizeTaskStatuses(custom)).toBe(custom);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('accepts columns that do not model completion', () => {
    const quarters = [{ id: 'q1' }, { id: 'q2' }];
    expect(normalizeTaskStatuses(quarters)).toBe(quarters);
    const checked = {
      ...task,
      task: { status: 'q2', completed: true },
    } as typeof task;
    // A checked task stays in its own column...
    expect(resolveTaskStatus(checked, quarters)?.id).toBe('q2');
    // ...and moving it between columns keeps it checked.
    expect(
      setTaskStatus(checked, quarters[0], TZ, quarters).task
    ).toMatchObject({ status: 'q1', completed: true });
    // With a completed status in the workflow, moving reopens it.
    expect(
      setTaskStatus(
        checked,
        DEFAULT_TASK_STATUSES[0],
        TZ,
        DEFAULT_TASK_STATUSES
      ).task?.completed
    ).toBe(false);
  });

  it('lists known assignees in order and builds initials', () => {
    const members = [
      { id: 'a', name: 'Ava Chen' },
      { id: 'b', name: 'leo' },
    ];
    expect(
      getTaskAssignees(
        { task: { assigneeIds: ['b', 'gone', 'a'] } },
        members
      ).map(member => member.id)
    ).toEqual(['b', 'a']);
    expect(getMemberInitials(members[0])).toBe('AC');
    expect(getMemberInitials(members[1])).toBe('L');
  });

  it('treats status and assignee edits as changes', () => {
    expect(isEventDeepEqual(task, { ...task, task: { status: 'done' } })).toBe(
      false
    );
    expect(
      isEventDeepEqual(task, { ...task, task: { assigneeIds: ['a'] } })
    ).toBe(false);
  });
});
