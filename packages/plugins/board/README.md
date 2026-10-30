# @dayflow/plugin-board

MIT-licensed task board view for DayFlow Calendar. It lays out the Calendar's
own tasks (`kind: 'task'`) in columns by status, priority or assignee. Register
it in `views`; there is no separate task store or `plugins` installation step.

```tsx
import {
  DayFlowCalendar,
  useCalendarApp,
  createMonthView,
} from '@dayflow/react';
import { createBoardView } from '@dayflow/plugin-board';
import '@dayflow/core/dist/styles.css';
import '@dayflow/plugin-board/styles.css';

const board = createBoardView({
  // Optional: restore a previously persisted presentation state.
  // initialState: savedBoardState,
  onViewStateChange: state =>
    localStorage.setItem('my-board', JSON.stringify(state)),
});

export function TaskCalendar() {
  const calendar = useCalendarApp({
    views: [createMonthView(), board],
    enableTasks: true,
    taskMembers: [
      { id: 'ava', name: 'Ava Chen' },
      { id: 'leo', name: 'Leo Martin', avatarUrl: '/leo.png' },
    ],
    // Any columns: stages, quarters, ... `completed` is optional.
    // taskStatuses: [{ id: 'q1', title: 'Q1' }, { id: 'q2', title: 'Q2' }],
    callbacks: {
      onEventUpdate: event => saveEvent(event),
    },
  });
  return <DayFlowCalendar calendar={calendar} />;
}
```

`saveEvent` stands for your persistence function. Tasks come in and go out
through the regular Calendar `events` and callbacks.

## Task data

Status and assignees are Calendar task fields, so the board, the calendar views
and the built-in task editor all read and write the same values:

| Field                   | Meaning                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `task.status`           | Column ID from `taskStatuses` (default `todo`, `in-progress`, `done`)              |
| `task.assigneeIds`      | Member IDs from `taskMembers`                                                      |
| `task.priority`         | `none / low / medium / high`                                                       |
| `task.completed`        | The checkbox. See below for how it relates to `completed` statuses                 |
| `start` (`end = start`) | Due date. New tasks from the board are due today, all-day, in the default calendar |

- `taskStatuses` are whatever columns a team works in (stages, quarters,
  clients, ...). None of them has to be `completed`.
- When some status is `completed: true`, columns and the checkbox stay in
  sync: moving a card to a completed status completes the task, moving it out
  reopens it, completing a task elsewhere moves it to the first completed
  status, and reopening it returns it to its previous open status.
- Without a completed status, the checkbox is independent: a checked task
  stays in its column and keeps its check when moved.
- In assignee grouping a card belongs to its first assignee. Moving it swaps that
  assignee and keeps the others; **Unassigned** clears them all.
- Task edits go through `app.updateEvent`, the update callback and undo.
  Grouping, filters and card order only call `onViewStateChange`.
- The board respects calendar visibility and the Calendar's read-only settings.

## Using the board

- **Drag cards** between columns to change status, priority or assignee, and
  within a column to reorder. Focused cards move with **Alt + arrow keys** or
  **Alt + Home/End**. A moved card shows at its drop point at once; only that
  card is locked until your update callback settles.
- **Click a card** to open the Calendar task editor (status, priority,
  assignees, due date, notes). Pressing anywhere else closes it. The editor
  has no Event / Task switch on the board (the view sets `lockEventKind`);
  convert a task to an event from a calendar view. Line breaks in notes show
  on the card.
- **＋** in a column header or **New task** at its bottom adds a "New Task" card with that column's status, priority or assignee at
  the bottom of the column and scrolls to it; click it to fill it in.
- **Status columns**: click the title to rename it; the **⋯** menu renames,
  recolors (Blossom color picker) or deletes the column. Like deleting a
  calendar, deleting a column asks whether to **merge** its tasks into
  another column or delete them with it, and confirms either choice. Any
  column can go, Done included, as long as one remains. **Add column** adds
  a column after the open ones. Status edits go through
  `app.setTaskStatuses` and `callbacks.onTaskStatusesChange`, so persist them
  there.
- **Drag a column header** to reorder columns, or press **Alt + Left/Right** on
  a focused header.
- **Group by** switches between status, priority and assignee. **Member
  avatars** filter to tasks assigned to them; new tasks added under a
  single-member filter are assigned to that member.
- **Search** uses the Calendar header: picking a task result highlights its
  card and scrolls it into view.

## Options

| Option            | Meaning                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| `label`, `title`  | View switcher label; accessible name of the board                                  |
| `groupBy`         | Initial grouping: `status` (default), `priority` or `assignee`                     |
| `allowStatusEdit` | Defaults to true. Add, rename, recolor and delete status columns                   |
| `allowCreate`     | Defaults to true; also needs `enableTasks` and write permission                    |
| `initialState`    | Initial grouping, column and card order, assignee filter                           |
| `messages`        | Override English/Chinese labels; other locales use English                         |
| `columnWidth`     | Column width in px, minimum 220                                                    |
| `showDescription` | Show task descriptions on cards. Defaults to true                                  |
| `cardFields`      | Hide card parts: `{ priority, description, due, assignees }`, each `false` hides   |
| `cardClassName`   | Class names for a card: a string or `({ event, app, groupId, groupBy }) => string` |
| `cardStyle`       | Inline styles for a card: an object or a function of the same arguments            |
| `renderCard`      | Extra Preact content below the card title: `{ event, app, open }`                  |

### Callbacks

| Callback            | When                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `onTaskMove`        | Before a drag or keyboard move: `{ event, from, to, groupBy, beforeTaskId, afterTaskId }`. `false` cancels    |
| `onTaskCreate`      | Before **New task** adds a task: `(draft, { groupId, groupBy })`. Return a changed draft, or `false`          |
| `onColumnDelete`    | After a column delete is confirmed: `{ column, mode: 'merge' \| 'delete', targetId, tasks }`. `false` cancels |
| `onCardClick`       | Card clicked or opened with Enter: `(event, nativeEvent)`. `false` keeps the detail panel closed              |
| `onViewStateChange` | User changed grouping, column or card order or the filter. Persist the state here                             |
| `onError`           | A task save or state notification failed                                                                      |

Task data changes still reach the Calendar callbacks (`onEventCreate`,
`onEventUpdate`, `onEventDelete`, `onTaskStatusesChange`), so the board adds no
second persistence path.

### Styling cards

Cards read these custom properties, so they can be set on `.df-board`, a
column or a single card (through `cardStyle`):

| Property                                                     | Default                       |
| ------------------------------------------------------------ | ----------------------------- |
| `--df-board-card-bg`                                         | `var(--df-color-card)`        |
| `--df-board-card-fg`                                         | inherited                     |
| `--df-board-card-radius`                                     | `0.5rem`                      |
| `--df-board-card-padding`                                    | `0.625rem 0.75rem 0.6875rem`  |
| `--df-board-card-gap`                                        | `0.375rem`                    |
| `--df-board-card-shadow`, `--df-board-card-shadow-hover`     | hairline ring and soft shadow |
| `--df-board-card-title-size`, `--df-board-card-title-weight` | `0.875rem`, `500`             |

Each card also carries `data-priority`, `data-group` (its column),
`data-calendar`, `data-completed` and `data-due` (`overdue`, `today` or
`upcoming`) for CSS selectors:

```ts
createBoardView({
  cardClassName: ({ event }) =>
    event.task?.priority === 'high' ? 'urgent' : undefined,
  cardStyle: ({ groupId }) =>
    groupId === 'done' ? { '--df-board-card-bg': '#f0fdf4' } : undefined,
});
```

```css
.df-board-card[data-due='overdue'] {
  box-shadow: inset 3px 0 #ef4444;
}
```

## API

`createBoardView` returns the view with two extra methods:

- `board.getState(app)`: the calendar's board state (grouping, column order,
  card order per column, assignee filter), or `undefined` before it is shown.
- `board.setState(app, state)`: replace it, e.g. with state loaded later or a
  custom order. Mounted boards update; `onViewStateChange` is not called.

The pure helpers the board uses are exported too: `getBoardGroupId`,
`moveTaskToGroup` (the task change a move makes, ready for
`app.updateEvent`), `normalizeBoardViewState`, `reorderBoardGroup`,
`insertTaskIdAtAnchor`, `removeTaskStatus`, `getBoardMessages`,
`PRIORITY_GROUP_IDS`, `COLUMN_COLORS` and `UNASSIGNED_GROUP_ID`. Task field
helpers (`setTaskStatus`, `resolveTaskStatus`, `setTaskPriority`,
`setTaskAssignees`, `setTaskCompleted`, ...) come from `@dayflow/core`.

Keep the view factory stable. Presentation state survives switching views;
separate Calendar instances keep separate state even when they share a factory.
Persist the state yourself to survive page reloads.

Rejected saves show an error and call `onError`; `onViewStateChange` is not
called for that move. Calendar keeps its in-memory update on rejection, so
reconcile failed saves from your source of truth.

## Scope

The board shows the tasks loaded into Calendar, across all dates. Apps that load
events by visible range must load the board's tasks too. Tasks always have a due
date in the Calendar model; undated tasks, labels, subtasks and virtualization are
not part of this version. `renderCard` returns Preact content; framework-native
board slots are not available yet.

Run the repository demo with `pnpm dev` and choose **Board** in the view switcher.
