import type { Event, TaskMember } from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';

export const sampleTaskMembers: TaskMember[] = [
  { id: 'ava', name: 'Ava Chen' },
  { id: 'leo', name: 'Leo Martin' },
  { id: 'mia', name: 'Mia Park' },
  { id: 'noah', name: 'Noah Smith' },
];

interface TaskSeed {
  title: string;
  description?: string;
  /** Days from today. */
  due: number;
  /** Due time; all-day when omitted. */
  hour?: number;
  calendarId: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeIds?: string[];
}

const seeds: TaskSeed[] = [
  {
    title: 'Draft Q4 roadmap',
    description: 'Collect proposals from each team and rank them by impact.',
    due: 2,
    calendarId: 'team',
    priority: 'high',
    assigneeIds: ['ava'],
  },
  {
    title: 'Review onboarding copy',
    due: 4,
    calendarId: 'marketing',
    priority: 'low',
    assigneeIds: ['mia'],
  },
  {
    title: 'Book flights for client visit',
    due: 1,
    hour: 15,
    calendarId: 'travel',
    priority: 'medium',
  },
  {
    title: 'Fix login timeout bug',
    description: 'Sessions expire after 5 minutes on Safari.',
    due: -1,
    calendarId: 'support',
    status: 'in-progress',
    priority: 'high',
    assigneeIds: ['leo', 'noah'],
  },
  {
    title: 'Design task cards',
    description: 'Status, assignee and due date at a glance.',
    due: 0,
    hour: 17,
    calendarId: 'team',
    status: 'in-progress',
    priority: 'medium',
    assigneeIds: ['mia'],
  },
  {
    title: 'Prepare workshop slides',
    due: 6,
    calendarId: 'learning',
    status: 'in-progress',
    assigneeIds: ['ava'],
  },
  {
    title: 'Publish release notes',
    due: -2,
    calendarId: 'marketing',
    status: 'done',
    priority: 'medium',
    assigneeIds: ['noah'],
  },
  {
    title: 'Renew gym membership',
    due: 0,
    calendarId: 'personal',
  },
];

/** Tasks relative to today, shared by the calendar views and the board. */
export const generateSampleTasks = (): Event[] => {
  const timeZone = Temporal.Now.timeZoneId();
  const today = Temporal.Now.plainDateISO(timeZone);
  return seeds.map((seed, index) => {
    const day = today.add({ days: seed.due });
    const start =
      seed.hour === undefined ? day : day.toPlainDateTime({ hour: seed.hour });
    const completed = seed.status === 'done';
    return {
      id: `task-${index + 1}`,
      title: seed.title,
      description: seed.description,
      kind: 'task',
      start,
      end: start,
      allDay: seed.hour === undefined,
      calendarId: seed.calendarId,
      task: {
        status: seed.status,
        priority: seed.priority,
        assigneeIds: seed.assigneeIds,
        completed,
        completedAt: completed
          ? Temporal.Now.zonedDateTimeISO(timeZone)
          : undefined,
      },
    };
  });
};
