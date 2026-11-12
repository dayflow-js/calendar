import { Temporal } from 'temporal-polyfill';

import type { Event } from '@/types';
import { isEventDeepEqual } from '@/utils/eventUtils';
import { expandRecurringEvents } from '@/utils/recurrence';
import {
  convertEventKind,
  getTaskPriorityMark,
  isTask,
  isTaskCompleted,
  setTaskCompleted,
  setTaskPriority,
} from '@/utils/taskUtils';

const TZ = 'Australia/Sydney';

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
