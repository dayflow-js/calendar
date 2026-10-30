import { createBoardView } from '@board/index';
import {
  getBoardGroupId,
  insertTaskIdAtAnchor,
  moveTaskToGroup,
  normalizeBoardViewState,
  reorderBoardGroup,
  UNASSIGNED_GROUP_ID,
} from '@board/state';
import '@testing-library/jest-dom/vitest';
import type { BoardViewConfig, BoardViewState } from '@board/types';
import type { Event, TaskMember } from '@dayflow/core';
import {
  CalendarApp,
  CalendarRenderer,
  createMonthView,
  DEFAULT_TASK_STATUSES,
  setTaskCompleted,
} from '@dayflow/core';
import { act, fireEvent, waitFor, within } from '@testing-library/preact';
import { Temporal } from 'temporal-polyfill';

const date = Temporal.PlainDate.from('2026-10-29');
const task = (id: string, extras: Partial<Event> = {}): Event => ({
  id,
  title: id,
  kind: 'task',
  start: date,
  end: date,
  allDay: true,
  ...extras,
});
const firstColumn = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[data-board-group]')?.dataset.boardGroup;
const members: TaskMember[] = [
  { id: 'ava', name: 'Ava Chen' },
  { id: 'leo', name: 'Leo Martin' },
];
const cleanups: (() => void)[] = [];
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  // Let the gesture's one-tick post-drop click suppression expire.
  await new Promise(resolve => {
    setTimeout(resolve, 0);
  });
});

function mount(
  events: Event[] = [task('draft')],
  config: BoardViewConfig = {},
  overrides: Partial<ConstructorParameters<typeof CalendarApp>[0]> = {}
) {
  const app = new CalendarApp({
    views: [createMonthView(), createBoardView(config)],
    defaultView: 'board',
    events,
    initialDate: new Date(2026, 9, 29),
    timeZone: 'Australia/Sydney',
    enableTasks: true,
    useCalendarHeader: false,
    ...overrides,
  });
  const host = document.createElement('div');
  document.body.append(host);
  const renderer = new CalendarRenderer(app);
  act(() => renderer.mount(host));
  cleanups.push(() => {
    act(() => renderer.unmount());
    app.destroy();
    host.remove();
  });
  const card = (id: string) =>
    host.querySelector<HTMLElement>(`[data-board-task="${id}"]`)!;
  const column = (id: string) =>
    card(id)?.closest<HTMLElement>('[data-board-group]')?.dataset.boardGroup;
  const altKey = (id: string, key: string) =>
    fireEvent.keyDown(card(id), { key, altKey: true });
  return { app, host, card, column, altKey };
}

const dialog = () => document.querySelector('[role="alertdialog"]');

describe('Board Calendar integration', () => {
  it('reorders columns by dragging the header and only persists presentation state', async () => {
    const onViewStateChange = vi.fn();
    const onEventUpdate = vi.fn();
    const { host, app } = mount(
      [task('draft')],
      { onViewStateChange },
      { callbacks: { onEventUpdate } }
    );
    const columns = [
      ...host.querySelectorAll<HTMLElement>('[data-board-group]'),
    ];
    columns.forEach((column, index) => {
      Object.defineProperty(column, 'offsetLeft', { value: index * 314 });
      Object.defineProperty(column, 'offsetWidth', { value: 300 });
    });
    const pointer = (target: Element | Window, type: string, x: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX: x,
        clientY: 20,
      });
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        pointerType: { value: 'mouse' },
      });
      fireEvent(target, event);
    };
    pointer(columns[0].querySelector('header')!, 'PointerDown', 20);
    pointer(window, 'pointermove', 800);
    expect(host.querySelector('.df-board-column-overlay')).not.toHaveAttribute(
      'hidden'
    );
    pointer(window, 'pointerup', 800);
    await waitFor(() => expect(onViewStateChange).toHaveBeenCalledOnce());
    expect(onViewStateChange.mock.lastCall![0].groupOrder).toEqual([
      'in-progress',
      'done',
      'todo',
    ]);
    expect(onEventUpdate).not.toHaveBeenCalled();
    expect(app.getAllEvents()[0].task).toBeUndefined();
    expect(host.querySelector('.df-board-column-overlay')).toHaveAttribute(
      'hidden'
    );
  });

  it('cancels a header drag on Escape without saving the preview order', () => {
    const onViewStateChange = vi.fn();
    const { host } = mount([task('draft')], { onViewStateChange });
    const header = host.querySelector('.df-board-column-header')!;
    const down = new MouseEvent('PointerDown', { bubbles: true, clientX: 20 });
    Object.defineProperties(down, {
      pointerId: { value: 1 },
      pointerType: { value: 'mouse' },
    });
    fireEvent(header, down);
    const move = new MouseEvent('pointermove', { bubbles: true, clientX: 800 });
    Object.defineProperty(move, 'pointerId', { value: 1 });
    fireEvent(window, move);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onViewStateChange).not.toHaveBeenCalled();
    expect(host.querySelector('.df-board-column-overlay')).toHaveAttribute(
      'hidden'
    );
    expect(host.querySelector('.is-column-drag-source')).toBeNull();
  });

  it('reorders columns with the keyboard and preserves the order across view switches', async () => {
    const onViewStateChange = vi.fn();
    const { host, app } = mount([task('draft')], { onViewStateChange });
    fireEvent.keyDown(host.querySelector('.df-board-column-header')!, {
      key: 'ArrowRight',
      altKey: true,
    });
    expect(onViewStateChange.mock.lastCall![0].groupOrder[0]).toBe(
      'in-progress'
    );
    app.changeView('month');
    await waitFor(() => expect(host.querySelector('.df-board')).toBeNull());
    app.changeView('board');
    await waitFor(() =>
      expect(host.querySelector('[data-board-group]')).toHaveAttribute(
        'data-board-group',
        'in-progress'
      )
    );
  });

  it('shows existing Calendar tasks, keeps ordinary events out, and uses completion as the source of truth', async () => {
    const { app, host, card, column } = mount([
      task('draft'),
      task('done', { task: { completed: true } }),
      { ...task('meeting'), kind: 'event' },
    ]);
    expect(card('meeting')).toBeNull();
    expect(column('draft')).toBe('todo');
    expect(column('done')).toBe('done');
    // Completing in a calendar view moves the card to a completed column.
    await app.updateEvent(
      'draft',
      setTaskCompleted(app.getAllEvents()[0], true, 'Australia/Sydney')
    );
    await waitFor(() =>
      expect(app.getAllEvents()[0].task?.completed).toBe(true)
    );
    await waitFor(() => expect(column('draft')).toBe('done'));
    expect(app.getAllEvents()[0].task?.completedAt?.timeZoneId).toBe(
      'Australia/Sydney'
    );
    app.undo();
    await waitFor(() => expect(column('draft')).toBe('todo'));
    expect(host.querySelectorAll('[data-board-task]')).toHaveLength(2);
  });

  it('moves between status columns through onEventUpdate and keeps other task fields', async () => {
    const onEventUpdate = vi.fn();
    const { app, column, altKey } = mount(
      [
        task('draft', {
          meta: { customer: 'acme' },
          task: { priority: 'high', assigneeIds: ['ava'] },
        }),
      ],
      {},
      { callbacks: { onEventUpdate }, taskMembers: members }
    );
    altKey('draft', 'ArrowRight');
    await waitFor(() => expect(column('draft')).toBe('in-progress'));
    await waitFor(() => expect(onEventUpdate).toHaveBeenCalledTimes(1));
    expect(app.getAllEvents()[0]).toMatchObject({
      meta: { customer: 'acme' },
      task: { status: 'in-progress', priority: 'high', assigneeIds: ['ava'] },
    });
    expect(app.getAllEvents()[0].task?.completed).toBeFalsy();
    altKey('draft', 'ArrowRight');
    await waitFor(() => expect(column('draft')).toBe('done'));
    expect(app.getAllEvents()[0].task).toMatchObject({
      status: 'done',
      completed: true,
    });
    // Reopening elsewhere wins over the stored status.
    const updated = app.getAllEvents()[0];
    await app.updateEvent(
      'draft',
      { task: { ...updated.task, completed: false, completedAt: undefined } },
      false,
      'remote'
    );
    await waitFor(() => expect(column('draft')).toBe('todo'));
  });

  it('shares priority changes with Calendar and keeps task dates and ID intact', async () => {
    const timed = Temporal.ZonedDateTime.from(
      '2026-10-29T12:00[Australia/Sydney]'
    );
    const { app, column, altKey } = mount(
      [task('draft', { start: timed, end: timed, allDay: false })],
      { groupBy: 'priority' }
    );
    expect(column('draft')).toBe('none');
    altKey('draft', 'ArrowLeft');
    await waitFor(() => expect(column('draft')).toBe('low'));
    expect(app.getAllEvents()[0].task?.priority).toBe('low');
    expect(app.getAllEvents()[0].start).toBe(timed);
    expect(app.getAllEvents()[0].end).toBe(timed);
    await app.updateEvent('draft', { task: { priority: 'high' } });
    await waitFor(() => expect(column('draft')).toBe('high'));
  });

  it('groups by first assignee and reassigns when a card changes column', async () => {
    const { app, host, column, altKey } = mount(
      [task('pair', { task: { assigneeIds: ['leo', 'ava'] } }), task('free')],
      { groupBy: 'assignee' },
      { taskMembers: members }
    );
    expect(
      [...host.querySelectorAll<HTMLElement>('[data-board-group]')].map(
        node => node.dataset.boardGroup
      )
    ).toEqual(['ava', 'leo', UNASSIGNED_GROUP_ID]);
    expect(column('pair')).toBe('leo');
    expect(column('free')).toBe(UNASSIGNED_GROUP_ID);
    altKey('pair', 'ArrowLeft');
    await waitFor(() => expect(column('pair')).toBe('ava'));
    expect(app.getAllEvents()[0].task?.assigneeIds).toEqual(['ava']);
    altKey('free', 'ArrowLeft');
    await waitFor(() => expect(column('free')).toBe('leo'));
    expect(app.getAllEvents()[1].task?.assigneeIds).toEqual(['leo']);
  });

  it('falls back to status columns when there is nobody to group by', () => {
    const { host } = mount([task('draft')], { groupBy: 'assignee' });
    expect(host.querySelector('[data-board-group="todo"]')).not.toBeNull();
    expect(host.querySelector('.df-board-select-value')).toHaveTextContent(
      'Column'
    );
    // No taskMembers: no avatar filter and no Assignee grouping.
    expect(host.querySelector('.df-board-people')).toBeNull();
    fireEvent.click(host.querySelector('.df-board-select-trigger')!);
    expect(
      [...host.querySelectorAll('[role="option"]')].map(
        node => node.textContent
      )
    ).toEqual(['Column', 'Priority']);
  });

  it('filters by assignee and assigns new tasks to the filtered member', async () => {
    const onViewStateChange = vi.fn();
    const { app, host, card } = mount(
      [
        task('mine', { task: { assigneeIds: ['ava'] } }),
        task('theirs', { task: { assigneeIds: ['leo'] } }),
      ],
      { onViewStateChange },
      { taskMembers: members }
    );
    fireEvent.click(
      host.querySelector(
        'button[aria-label="Show tasks assigned to Ava Chen"]'
      )!
    );
    await waitFor(() => expect(card('theirs')).toBeNull());
    expect(card('mine')).not.toBeNull();
    expect(onViewStateChange.mock.lastCall![0].assigneeFilter).toEqual(['ava']);
    fireEvent.click(host.querySelector('.df-board-add-row')!);
    await waitFor(() => expect(app.getAllEvents()).toHaveLength(3));
    expect(app.getAllEvents()[2].task?.assigneeIds).toEqual(['ava']);
  });

  it('preserves hidden cards when reordering a filtered list with the keyboard', async () => {
    const onViewStateChange = vi.fn();
    const { host, card, altKey } = mount(
      [
        task('alpha', { task: { assigneeIds: ['ava'] } }),
        task('hidden', { task: { assigneeIds: ['leo'] } }),
        task('alpine', { task: { assigneeIds: ['ava'] } }),
      ],
      { onViewStateChange },
      { taskMembers: members }
    );
    const avaFilter = host.querySelector(
      'button[aria-label="Show tasks assigned to Ava Chen"]'
    )!;
    fireEvent.click(avaFilter);
    await waitFor(() => expect(card('hidden')).toBeNull());
    altKey('alpine', 'ArrowUp');
    await waitFor(() => expect(onViewStateChange).toHaveBeenCalled());
    expect(onViewStateChange.mock.lastCall![0].taskOrderByGroup.todo).toEqual([
      'alpine',
      'alpha',
      'hidden',
    ]);
    fireEvent.click(avaFilter);
    await waitFor(() =>
      expect(
        [...host.querySelectorAll<HTMLElement>('[data-board-task]')].map(
          node => node.dataset.boardTask
        )
      ).toEqual(['alpine', 'alpha', 'hidden'])
    );
  });

  it('remembers each grouping layout when switching Group by', async () => {
    const onViewStateChange = vi.fn();
    const { host } = mount([task('a')], { onViewStateChange });
    const groupBy = (label: string) => {
      fireEvent.click(host.querySelector('.df-board-select-trigger')!);
      fireEvent.click(
        [...host.querySelectorAll<HTMLElement>('[role="option"]')].find(
          node => node.textContent === label
        )!
      );
    };
    fireEvent.keyDown(host.querySelector('.df-board-column-header')!, {
      key: 'ArrowRight',
      altKey: true,
    });
    await waitFor(() => expect(firstColumn(host)).toBe('in-progress'));
    groupBy('Priority');
    await waitFor(() => expect(firstColumn(host)).toBe('high'));
    groupBy('Column');
    await waitFor(() => expect(firstColumn(host)).toBe('in-progress'));
    expect(onViewStateChange.mock.lastCall![0].layouts.priority).toBeDefined();
  });

  it('keeps presentation state across view switches and isolates shared view factories by app', async () => {
    const shared = createBoardView();
    const first = mount(
      [task('a')],
      {},
      { views: [createMonthView(), shared] }
    );
    const second = mount(
      [task('b')],
      {},
      { views: [createMonthView(), shared] }
    );
    fireEvent.keyDown(first.host.querySelector('.df-board-column-header')!, {
      key: 'ArrowRight',
      altKey: true,
    });
    await waitFor(() => expect(firstColumn(first.host)).toBe('in-progress'));
    expect(firstColumn(second.host)).toBe('todo');
    first.app.changeView('month');
    await waitFor(() =>
      expect(first.host.querySelector('.df-board')).toBeNull()
    );
    first.app.changeView('board');
    await waitFor(() => expect(firstColumn(first.host)).toBe('in-progress'));
  });

  it('moves a dragged card across columns using the native Calendar update path', async () => {
    const onViewStateChange = vi.fn();
    const { app, host, card } = mount([task('draft')], { onViewStateChange });
    fireEvent.dragStart(card('draft'));
    fireEvent.dragOver(host.querySelector('[data-board-group="done"]')!, {
      clientY: 100,
    });
    await waitFor(() =>
      expect(host.querySelector('[data-board-group="done"]')).toHaveAttribute(
        'data-drop-target',
        'true'
      )
    );
    fireEvent.drop(host.querySelector('[data-board-group="done"]')!, {
      clientY: 100,
    });
    await waitFor(() =>
      expect(app.getAllEvents()[0].task?.completed).toBe(true)
    );
    await waitFor(() => expect(onViewStateChange).toHaveBeenCalledOnce());
    expect(onViewStateChange.mock.lastCall![0].taskOrderByGroup.done).toEqual([
      'draft',
    ]);
  });

  it('honors Calendar visibility and UI read-only permissions', async () => {
    const { app, card, host } = mount([task('locked')], {}, { readOnly: true });
    expect(card('locked').draggable).toBe(false);
    expect(host.querySelector('.df-board-add-row')).toBeNull();
    expect(host.querySelector('.df-board-add-column')).toBeNull();
    app.setCalendarVisibility('blue', false);
    await waitFor(() => expect(card('locked')).toBeNull());
  });

  it('keeps existing tasks visible when task creation is disabled', () => {
    const { host, card } = mount([task('draft')], {}, { enableTasks: false });
    expect(card('draft')).not.toBeNull();
    expect(host.querySelector('.df-board-add-row')).toBeNull();
    expect(host.querySelector('.df-board-primary')).toBeNull();
  });

  it('adds a New Task card at the bottom of the chosen column', async () => {
    const onEventCreate = vi.fn();
    const { host, app, column, card } = mount(
      [task('existing', { task: { status: 'in-progress' } })],
      {},
      { callbacks: { onEventCreate } }
    );
    fireEvent.click(
      host.querySelector('button[aria-label="Add task: In progress"]')!
    );
    await waitFor(() => expect(onEventCreate).toHaveBeenCalledTimes(1));
    const created = app.getAllEvents()[1];
    expect(created).toMatchObject({
      title: 'New Task',
      kind: 'task',
      allDay: true,
      task: { status: 'in-progress' },
    });
    expect(created.start.toString()).toBe(
      Temporal.Now.plainDateISO('Australia/Sydney').toString()
    );
    expect(created.end).toBe(created.start);
    await waitFor(() => expect(column(created.id)).toBe('in-progress'));
    // No inline editor: the new card is last, highlighted and focused.
    expect(host.querySelector('.df-board input')).toBeNull();
    const ids = [
      ...host.querySelectorAll<HTMLElement>(
        '[data-board-group="in-progress"] [data-board-task]'
      ),
    ].map(node => node.dataset.boardTask);
    expect(ids).toEqual(['existing', created.id]);
    expect(card(created.id)).toHaveAttribute('data-highlighted', 'true');
    expect(card(created.id)).toHaveFocus();
  });

  it('locks only the card being saved and reports a persistence error', async () => {
    let reject!: (error: Error) => void;
    const onError = vi.fn();
    const onViewStateChange = vi.fn();
    const { host, card, altKey, column } = mount(
      [task('draft'), task('other')],
      { onError, onViewStateChange },
      {
        callbacks: {
          onEventUpdate: () =>
            new Promise<void>((_resolve, rejectPromise) => {
              reject = rejectPromise;
            }),
        },
      }
    );
    altKey('draft', 'ArrowRight');
    await waitFor(() => expect(card('draft').draggable).toBe(false));
    // The card shows in its new column right away, and the rest of the
    // board stays usable while the host saves.
    expect(column('draft')).toBe('in-progress');
    expect(card('other').draggable).toBe(true);
    reject(new Error('Offline'));
    await waitFor(() =>
      expect(host.querySelector('[role=alert]')).toHaveTextContent('Offline')
    );
    expect(onViewStateChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('lets hooks cancel or change moves, creation and opening', async () => {
    const onTaskMove = vi.fn(() => false);
    const onTaskCreate = vi.fn(
      (draft: Event, _args: { groupId: string; groupBy: string }) => ({
        ...draft,
        title: 'From hook',
      })
    );
    const onCardClick = vi.fn(() => false);
    const { app, host, card, column, altKey } = mount([task('draft')], {
      onTaskMove,
      onTaskCreate,
      onCardClick,
    });
    altKey('draft', 'ArrowRight');
    expect(onTaskMove).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'todo', to: 'in-progress' })
    );
    expect(column('draft')).toBe('todo');

    fireEvent.click(host.querySelector('.df-board-add-row')!);
    await waitFor(() => expect(app.getAllEvents()).toHaveLength(2));
    expect(app.getAllEvents()[1].title).toBe('From hook');
    expect(onTaskCreate.mock.lastCall![1]).toEqual({
      groupId: 'todo',
      groupBy: 'status',
    });

    fireEvent.click(card('draft'));
    expect(onCardClick).toHaveBeenCalledOnce();
    await new Promise(resolve => {
      setTimeout(resolve, 20);
    });
    expect(document.querySelector('.df-event-detail-panel')).toBeNull();
  });

  it('styles cards through class names, inline styles, data attributes and fields', () => {
    const { card } = mount([task('draft', { task: { priority: 'high' } })], {
      cardClassName: ({ event }) => `card-${event.id}`,
      cardStyle: { '--df-board-card-bg': 'rgb(1, 2, 3)' },
      cardFields: { due: false },
    });
    const node = card('draft');
    expect(node).toHaveClass('df-board-card', 'card-draft');
    expect(node.style.getPropertyValue('--df-board-card-bg')).toBe(
      'rgb(1, 2, 3)'
    );
    expect(node).toHaveAttribute('data-priority', 'high');
    expect(node).toHaveAttribute('data-group', 'todo');
    expect(node.querySelector('time')).toBeNull();
    expect(node.querySelector('.df-board-priority')).toHaveTextContent('High');
  });

  it('reads and replaces the board state of a calendar from outside', async () => {
    const onViewStateChange = vi.fn();
    const view = createBoardView({ onViewStateChange });
    const { app, host } = mount(
      [task('a'), task('b')],
      {},
      {
        views: [createMonthView(), view],
      }
    );
    expect(view.getState(app)).toBeUndefined();
    act(() =>
      view.setState(app, {
        groupBy: 'status',
        groupOrder: ['done', 'todo', 'in-progress'],
        taskOrderByGroup: { todo: ['b', 'a'] },
      })
    );
    await waitFor(() => expect(firstColumn(host)).toBe('done'));
    expect(
      [...host.querySelectorAll<HTMLElement>('[data-board-task]')].map(
        node => node.dataset.boardTask
      )
    ).toEqual(['b', 'a']);
    expect(view.getState(app)?.groupOrder[0]).toBe('done');
    expect(onViewStateChange).not.toHaveBeenCalled();
  });

  it('renames, recolors, adds and deletes status columns through the Calendar', async () => {
    const onTaskStatusesChange = vi.fn();
    const { app, host, column } = mount(
      [task('doing', { task: { status: 'in-progress' } })],
      {},
      { callbacks: { onTaskStatusesChange } }
    );
    const menu = (title: string, item: string) => {
      fireEvent.click(
        host.querySelector(`button[aria-label="Column actions: ${title}"]`)!
      );
      const target = [
        ...host.querySelectorAll<HTMLElement>('.df-board-popover button'),
      ].find(node =>
        [node.textContent, node.getAttribute('aria-label')].includes(item)
      )!;
      fireEvent.click(target);
    };

    menu('In progress', 'Rename');
    const input = host.querySelector<HTMLInputElement>(
      '.df-board-rename input'
    )!;
    expect(input).toHaveFocus();
    input.value = 'Doing';
    fireEvent.submit(input.form!);
    await waitFor(() =>
      expect(app.getTaskStatuses()[1]).toMatchObject({
        id: 'in-progress',
        title: 'Doing',
      })
    );
    // Clicking the title opens the same rename box; Escape keeps the name.
    fireEvent.click(host.querySelector('button[aria-label="Rename: Doing"]')!);
    const again = host.querySelector<HTMLInputElement>(
      '.df-board-rename input'
    )!;
    again.value = 'Ignored';
    fireEvent.keyDown(again, { key: 'Escape' });
    await waitFor(() =>
      expect(host.querySelector('.df-board-rename')).toBeNull()
    );
    expect(app.getTaskStatuses()[1].title).toBe('Doing');

    fireEvent.click(host.querySelector('.df-board-add-column')!);
    await waitFor(() => expect(app.getTaskStatuses()).toHaveLength(4));
    // New columns sit after the open stages, before completed ones.
    expect(app.getTaskStatuses()[3].id).toBe('done');
    fireEvent.keyDown(host.querySelector('.df-board-rename input')!, {
      key: 'Escape',
    });

    const press = (label: string) =>
      fireEvent.click(
        [
          ...(dialog() as HTMLElement).querySelectorAll<HTMLElement>('button'),
        ].find(node => node.textContent?.trim() === label)!
      );

    // Deleting asks first, offering a merge like deleting a calendar does.
    menu('Doing', 'Delete column');
    expect(dialog()).toHaveTextContent('Delete “Doing”?');
    press('Cancel');
    expect(dialog()).toBeNull();
    expect(app.getTaskStatuses()).toHaveLength(4);

    menu('Doing', 'Delete column');
    press('Merge');
    fireEvent.click(within(dialog() as HTMLElement).getByText('Done'));
    expect(dialog()).toHaveTextContent('Merge “Doing” into “Done”?');
    press('Merge');
    await waitFor(() => expect(column('doing')).toBe('done'));
    expect(app.getAllEvents()[0].task).toMatchObject({
      status: 'done',
      completed: true,
    });
    await waitFor(() =>
      expect(app.getTaskStatuses().map(status => status.id)).not.toContain(
        'in-progress'
      )
    );

    // An empty column goes straight to the final confirmation.
    menu('New column', 'Delete column');
    expect(dialog()).toHaveTextContent('This column has no tasks');
    press('Delete');
    await waitFor(() => expect(app.getTaskStatuses()).toHaveLength(2));

    // Done is a column like any other. Without a completed column, checked
    // tasks simply stay checked where they are.
    menu('Done', 'Delete column');
    press('Merge');
    fireEvent.click(within(dialog() as HTMLElement).getByText('To do'));
    press('Merge');
    await waitFor(() =>
      expect(app.getTaskStatuses().map(status => status.id)).toEqual(['todo'])
    );
    expect(app.getAllEvents()[0].task).toMatchObject({
      status: 'todo',
      completed: true,
    });
    await waitFor(() => expect(column('doing')).toBe('todo'));
    // Only the last column has to stay.
    fireEvent.click(
      host.querySelector('button[aria-label="Column actions: To do"]')!
    );
    expect(
      [
        ...host.querySelectorAll<HTMLButtonElement>('.df-board-popover button'),
      ].find(node => node.textContent === 'Delete column')!
    ).toBeDisabled();
    expect(onTaskStatusesChange).toHaveBeenCalledTimes(5);
  });

  it('deletes a column together with its tasks after a second confirmation', async () => {
    const { app, host } = mount([task('a'), task('b')]);
    fireEvent.click(
      host.querySelector('button[aria-label="Column actions: To do"]')!
    );
    fireEvent.click(
      [...host.querySelectorAll<HTMLElement>('.df-board-popover button')].find(
        node => node.textContent === 'Delete column'
      )!
    );
    const press = (label: string) =>
      fireEvent.click(
        [
          ...(dialog() as HTMLElement).querySelectorAll<HTMLElement>('button'),
        ].find(node => node.textContent?.trim() === label)!
      );
    press('Delete');
    expect(dialog()).toHaveTextContent('Delete “To do” and all of its tasks?');
    expect(app.getAllEvents()).toHaveLength(2);
    press('Delete');
    await waitFor(() => expect(app.getAllEvents()).toHaveLength(0));
    await waitFor(() =>
      expect(app.getTaskStatuses().map(status => status.id)).toEqual([
        'in-progress',
        'done',
      ])
    );
  });

  it('closes the detail panel when pressing outside the card and panel', async () => {
    const { host, card } = mount();
    fireEvent.click(card('draft'));
    await waitFor(() =>
      expect(document.querySelector('.df-event-detail-panel')).not.toBeNull()
    );
    // Tasks stay tasks on the board: no Event / Task switch.
    expect(document.querySelector('.df-kind-switch')).toBeNull();
    fireEvent.mouseDown(host.querySelector('.df-board-columns')!);
    await waitFor(() =>
      expect(document.querySelector('.df-event-detail-panel')).toBeNull()
    );
  });

  it('highlights the task picked from the Calendar header search', async () => {
    const { app, card } = mount();
    expect(card('draft')).toHaveAttribute('data-highlighted', 'false');
    app.highlightEvent('draft');
    await waitFor(() =>
      expect(card('draft')).toHaveAttribute('data-highlighted', 'true')
    );
  });

  it('opens the existing Calendar editor from a card', async () => {
    const { card } = mount();
    fireEvent.click(card('draft'));
    await waitFor(() =>
      expect(document.querySelector('.df-event-detail-panel')).not.toBeNull()
    );
  });
});

describe('Board state algorithms', () => {
  const context = {
    statuses: DEFAULT_TASK_STATUSES,
    members,
    timeZone: 'Australia/Sydney',
  };

  it('keeps hidden columns when reordering visible columns', () => {
    const view: BoardViewState = {
      groupBy: 'status',
      groupOrder: ['todo', 'hidden', 'doing', 'done'],
      taskOrderByGroup: {},
    };
    expect(
      reorderBoardGroup(view, ['todo', 'doing', 'done'], 'done', 0).groupOrder
    ).toEqual(['done', 'todo', 'hidden', 'doing']);
    expect(view.groupOrder[0]).toBe('todo');
  });

  it('normalizes stale, duplicate and externally moved task IDs', () => {
    const state: BoardViewState = {
      groupBy: 'status',
      groupOrder: ['todo', 'gone', 'todo'],
      taskOrderByGroup: { todo: ['a', 'a', 'missing'], done: ['b', 'a'] },
    };
    const next = normalizeBoardViewState(
      [task('a'), task('b'), task('c')],
      ['todo', 'done'],
      event => ({ a: 'todo', b: 'done', c: 'todo' })[event.id]!,
      state
    );
    expect(next.groupOrder).toEqual(['todo', 'done']);
    expect(next.taskOrderByGroup).toEqual({ todo: ['a', 'c'], done: ['b'] });
    expect(
      insertTaskIdAtAnchor(['a', 'hidden', 'b'], 'b', { beforeTaskId: 'a' })
    ).toEqual(['b', 'a', 'hidden']);
  });

  it('places unknown statuses and unknown members in fallback columns', () => {
    expect(
      getBoardGroupId(
        task('a', { task: { status: 'deleted' } }),
        'status',
        context
      )
    ).toBe('todo');
    expect(
      getBoardGroupId(
        task('a', { task: { assigneeIds: ['gone', 'leo'] } }),
        'assignee',
        context
      )
    ).toBe('leo');
    expect(
      getBoardGroupId(
        task('a', { task: { assigneeIds: ['gone'] } }),
        'assignee',
        context
      )
    ).toBe(UNASSIGNED_GROUP_ID);
  });

  it('keeps completion timestamps when moving between completed statuses', () => {
    const statuses = [
      { id: 'todo' },
      { id: 'done', completed: true },
      { id: 'archived', completed: true },
    ];
    const timestamp = Temporal.ZonedDateTime.from(
      '2026-10-28T12:00[Australia/Sydney]'
    );
    const completed = task('a', {
      task: { completed: true, completedAt: timestamp },
    });
    expect(
      moveTaskToGroup(completed, 'status', 'archived', {
        ...context,
        statuses,
      }).task
    ).toMatchObject({ status: 'archived', completedAt: timestamp });
  });

  it('swaps only the primary assignee and clears all when unassigned', () => {
    const shared = task('a', { task: { assigneeIds: ['leo', 'ava', 'x'] } });
    expect(
      moveTaskToGroup(shared, 'assignee', 'ava', context).task?.assigneeIds
    ).toEqual(['ava', 'x']);
    expect(
      moveTaskToGroup(shared, 'assignee', UNASSIGNED_GROUP_ID, context).task
        ?.assigneeIds
    ).toEqual([]);
  });
});
