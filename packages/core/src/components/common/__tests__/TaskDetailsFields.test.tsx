import { cleanup, render, screen } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

import { TaskDetailsFields } from '@/components/common/TaskDetailsFields';
import { CalendarApp } from '@/core/CalendarApp';
import { createMonthView } from '@/factories/createMonthView';
import { LocaleProvider } from '@/locale';
import type { CalendarView, Event } from '@/types';

const task: Event = {
  id: 'task',
  title: 'Task',
  kind: 'task',
  start: Temporal.PlainDate.from('2026-05-12'),
  end: Temporal.PlainDate.from('2026-05-12'),
  allDay: true,
};

const renderFields = (
  views: CalendarView[],
  taskMembers?: { id: string; name: string }[]
) => {
  const app = new CalendarApp({ views, enableTasks: true, taskMembers });
  render(
    <LocaleProvider>
      <TaskDetailsFields app={app} event={task} onChange={vi.fn()} />
    </LocaleProvider>
  );
};

describe('TaskDetailsFields', () => {
  it('hides the Column field when no view shows columns', () => {
    renderFields([createMonthView()]);
    expect(screen.queryByText('Column')).toBeNull();
    expect(screen.getByText('Priority')).not.toBeNull();
  });

  it('shows the Column field when a registered view uses task statuses', () => {
    renderFields([
      createMonthView(),
      { type: 'board', component: () => null, usesTaskStatus: true },
    ]);
    expect(screen.getByText('Column')).not.toBeNull();
  });

  it('shows the Assignees field only when taskMembers are passed', () => {
    renderFields([createMonthView()]);
    expect(screen.queryByText('Assignees')).toBeNull();
    cleanup();
    renderFields([createMonthView()], [{ id: 'ava', name: 'Ava Chen' }]);
    expect(screen.getByText('Assignees')).not.toBeNull();
  });
});
