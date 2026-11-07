import {
  EventDetailPanelHost,
  generateUniKey,
  getTaskAssigneeIds,
  getTaskStatusTitle,
  isTask,
  TaskMemberAvatar,
  useLocale,
} from '@dayflow/core';
import type {
  BaseViewProps,
  Event as CalendarEvent,
  TaskPriority,
  TaskStatus,
} from '@dayflow/core';
import type { JSX } from 'preact';
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { BoardCard } from './BoardCard';
import {
  BoardSelect,
  ColumnMenu,
  DeleteColumnDialog,
  RenamePopover,
} from './BoardMenus';
import { BoardIcon } from './icons';
import { ColumnDragController } from './interaction/ColumnDragController';
import {
  nextKeyboardDropState,
  positionAt,
  resolveDropIndex,
} from './interaction/dropTarget';
import type { DropPosition, KeyboardDropKey } from './interaction/dropTarget';
import { getBoardMessages } from './locale';
import {
  getBoardGroupId,
  insertTaskIdAtAnchor,
  moveTaskToGroup,
  normalizeBoardViewState,
  PRIORITY_GROUP_IDS,
  removeTaskStatus,
  reorderBoardGroup,
  COLUMN_COLORS,
  UNASSIGNED_GROUP_ID,
} from './state';
import type { BoardOrderAnchor, BoardStateStore } from './state';
import type { BoardGroupBy, BoardViewConfig, BoardViewState } from './types';

interface Props extends BaseViewProps<BoardViewConfig> {
  store: BoardStateStore;
}

interface BoardGroup {
  id: string;
  title: string;
  color?: string;
  avatar?: JSX.Element;
}

const DEFAULT_GROUP_COLOR = '#94a3b8';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
  none: '#94a3b8',
};

const PRIORITY_KEYS = {
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
  none: 'priorityNone',
} as const;

const moveKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

export function BoardView({
  app,
  config,
  store,
  calendarRef,
  detailPanelEventId,
  useEventDetailPanel,
  onEventSelect,
  onDetailPanelToggle,
}: Props) {
  const { t, locale } = useLocale();
  const [, setVersion] = useState(0);
  const refresh = () => setVersion(version => version + 1);
  useLayoutEffect(() => app.subscribe(refresh), [app]);
  useLayoutEffect(() => store.subscribe(refresh), [store]);
  const { states } = store;
  const rootRef = useRef<HTMLElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Tasks whose move is still being saved by the host. Only those cards are
  // locked; the rest of the board stays usable.
  const savingIds = useRef(new Set<string>());
  const [savingTasks, setSavingTasks] = useState<ReadonlySet<string>>(
    new Set()
  );
  const busy = savingTasks.size > 0;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    groupId: string;
    index: number;
  } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [error, setError] = useState('');
  const isMobile =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(max-width: 1024px)').matches === true;
  const messages = { ...getBoardMessages(locale), ...config.messages };
  const statuses = app.getTaskStatuses();
  const members = app.getTaskMembers();
  const taskContext = { statuses, members, timeZone: app.timeZone };

  const stored: BoardViewState = states.get(app) ??
    config.initialState ?? {
      groupBy: config.groupBy ?? 'status',
      groupOrder: [],
      taskOrderByGroup: {},
    };
  // Without members there is nothing to group by assignee.
  const groupBy: BoardGroupBy =
    stored.groupBy === 'assignee' && members.length === 0
      ? 'status'
      : stored.groupBy;

  const groups: BoardGroup[] =
    groupBy === 'priority'
      ? PRIORITY_GROUP_IDS.map(id => ({
          id,
          title: t(PRIORITY_KEYS[id]),
          color: PRIORITY_COLORS[id],
        }))
      : groupBy === 'assignee'
        ? [
            ...members.map(member => ({
              id: member.id,
              title: member.name,
              avatar: <TaskMemberAvatar member={member} size={20} />,
            })),
            { id: UNASSIGNED_GROUP_ID, title: t('unassigned') },
          ]
        : statuses.map(status => ({
            id: status.id,
            title: getTaskStatusTitle(status, t),
            color: status.color,
          }));
  const groupOf = (event: CalendarEvent) =>
    getBoardGroupId(event, groupBy, taskContext);
  const allTasks = app.getAllEvents().filter(isTask);
  const view = normalizeBoardViewState(
    allTasks,
    groups.map(group => group.id),
    groupOf,
    { ...stored, groupBy }
  );

  const assigneeFilter = (view.assigneeFilter ?? []).filter(id =>
    members.some(member => member.id === id)
  );
  const visibleTasks = app.getEvents().filter(isTask);
  const visibleIds = new Set(
    visibleTasks
      .filter(
        event =>
          assigneeFilter.length === 0 ||
          getTaskAssigneeIds(event).some(id => assigneeFilter.includes(id))
      )
      .map(event => event.id)
  );
  const byId = new Map(visibleTasks.map(event => [event.id, event]));
  const shownGroups = view.groupOrder;
  const canEdit = (id: string) =>
    !savingTasks.has(id) && app.canMutateFromUI(id);
  const writableCalendar = app
    .getCalendarRegistry()
    .getDefaultWritableCalendar();
  const canCreate =
    config.allowCreate !== false &&
    app.getTasksEnabled() &&
    app.canMutateFromUI() &&
    !!writableCalendar;
  const latestView = useRef(view);
  latestView.current = view;

  const report = (reason: unknown) => {
    setError(reason instanceof Error ? reason.message : messages.saveFailed);
    config.onError?.(reason);
  };

  const commit = (next: BoardViewState) => {
    states.set(app, next);
    refresh();
    try {
      config.onViewStateChange?.(next);
    } catch (reason) {
      report(reason);
    }
  };

  const move = async (
    id: string,
    to: string,
    anchor: BoardOrderAnchor = {}
  ) => {
    if (
      savingIds.current.has(id) ||
      !app.canMutateFromUI(id) ||
      !groups.some(group => group.id === to)
    )
      return;
    const current = app
      .getAllEvents()
      .find(event => event.id === id && isTask(event));
    if (!current) return;
    if (
      config.onTaskMove?.({
        event: current,
        from: groupOf(current),
        to,
        groupBy,
        ...anchor,
      }) === false
    )
      return;
    // Places the card at the drop point among the current Calendar data,
    // preserving concurrent remote changes. Calendar stays the only task store.
    const placed = () => {
      const currentView = latestView.current;
      const nextOrders = { ...currentView.taskOrderByGroup };
      for (const groupId of Object.keys(nextOrders))
        nextOrders[groupId] = nextOrders[groupId].filter(
          taskId => taskId !== id
        );
      nextOrders[to] = insertTaskIdAtAnchor(nextOrders[to] ?? [], id, anchor);
      return normalizeBoardViewState(
        app.getAllEvents().filter(isTask),
        groups.map(group => group.id),
        groupOf,
        { ...currentView, taskOrderByGroup: nextOrders }
      );
    };
    const announce = () =>
      setAnnouncement(
        `${messages.moved}: ${current.title} → ${groups.find(group => group.id === to)?.title}`
      );
    if (groupOf(current) === to) {
      commit(placed());
      announce();
      return;
    }
    const { task } = moveTaskToGroup(current, groupBy, to, taskContext);
    const markSaving = (on: boolean) => {
      if (on) savingIds.current.add(id);
      else savingIds.current.delete(id);
      setSavingTasks(new Set(savingIds.current));
    };
    markSaving(true);
    setError('');
    try {
      // The Calendar applies the change at once and then waits for the host
      // to save it. Show the card where it was dropped right away, instead of
      // at the column's end until the save finishes; the host hears about
      // the order only once the save succeeds.
      const saving = app.updateEvent(id, { task });
      states.set(app, placed());
      refresh();
      await saving;
    } catch (reason) {
      // The Calendar keeps its own data; leave the card where that data
      // puts it and let the host decide whether to revert.
      report(reason);
      return;
    } finally {
      markSaving(false);
    }
    commit(placed());
    announce();
  };

  // Adds a "New Task" card at the bottom of the column; it is edited in the
  // detail panel like any other task.
  const create = (groupId: string | undefined) => {
    if (!groupId || !canCreate || !writableCalendar) return;
    const due = Temporal.Now.plainDateISO(app.timeZone);
    const draft: CalendarEvent = {
      id: generateUniKey(),
      title: t('newTask'),
      kind: 'task',
      start: due,
      end: due,
      allDay: true,
      calendarId: writableCalendar.id,
      task: { priority: 'none' },
    };
    const placed = moveTaskToGroup(draft, groupBy, groupId, taskContext);
    // A new task in someone's column, or under a member filter, is theirs.
    const proposed =
      groupBy !== 'assignee' && assigneeFilter.length === 1
        ? { ...placed, task: { ...placed.task, assigneeIds: assigneeFilter } }
        : placed;
    const decided = config.onTaskCreate?.(proposed, { groupId, groupBy });
    if (decided === false) return;
    const event = decided ?? proposed;
    app.addEvent(event);
    commit({
      ...latestView.current,
      taskOrderByGroup: {
        ...latestView.current.taskOrderByGroup,
        [groupId]: [
          ...(latestView.current.taskOrderByGroup[groupId] ?? []),
          event.id,
        ],
      },
    });
    setCreatedId(event.id);
  };

  useLayoutEffect(() => {
    if (!createdId) return;
    rootRef.current
      ?.querySelectorAll<HTMLElement>('[data-board-task]')
      .forEach(element => {
        if (element.dataset.boardTask !== createdId) return;
        element.scrollIntoView?.({
          block: 'nearest',
          inline: 'nearest',
          behavior: 'smooth',
        });
        element.focus({ preventScroll: true });
      });
    const timer = setTimeout(() => setCreatedId(null), 1500);
    return () => clearTimeout(timer);
  }, [createdId]);

  const open = (event: CalendarEvent, mouseEvent: MouseEvent) => {
    if (app.getReadOnlyConfig(event.id).viewable === false) return;
    if (config.onCardClick?.(event, mouseEvent) === false) return;
    app.selectEvent(event.id);
    Promise.resolve(app.onEventDoubleClick(event, mouseEvent))
      .then(result => {
        if (result === false || !app.getEventDetailEnabled()) return;
        if (isMobile) app.onMobileEventDetailToggle(event);
        else onDetailPanelToggle?.(event.id);
      })
      .catch(report);
  };

  const columnActions = useRef({ view, shownGroups, commit, messages });
  columnActions.current = { view, shownGroups, commit, messages };
  const columnDrag = useMemo(
    () =>
      new ColumnDragController(
        () => {
          const root = rootRef.current;
          const viewport = columnsRef.current;
          const overlay = overlayRef.current;
          return root && viewport && overlay
            ? { root, viewport, overlay }
            : null;
        },
        {
          onDragStart: (_id, column) => {
            const clone = column.cloneNode(true) as HTMLElement;
            clone.removeAttribute('id');
            clone
              .querySelectorAll('[id]')
              .forEach(node => node.removeAttribute('id'));
            clone
              .querySelectorAll('[tabindex]')
              .forEach(node => node.removeAttribute('tabindex'));
            clone.style.transform = '';
            overlayRef.current?.replaceChildren(clone);
          },
          onDragEnd: (id, index) => {
            overlayRef.current?.replaceChildren();
            if (index === null) return;
            const latest = columnActions.current;
            latest.commit(
              reorderBoardGroup(latest.view, latest.shownGroups, id, index)
            );
            setAnnouncement(latest.messages.columnMoved);
          },
        }
      ),
    []
  );
  useLayoutEffect(
    () => () => columnDrag.destroy(),
    [columnDrag, view.groupBy, shownGroups.join('|')]
  );

  const measureDrop = (
    column: HTMLElement,
    clientY: number,
    id: string
  ): DropPosition =>
    resolveDropIndex(
      clientY,
      Array.from(column.querySelectorAll<HTMLElement>('[data-board-task]'))
        .filter(element => element.dataset.boardTask !== id)
        .map(element => {
          const rect = element.getBoundingClientRect();
          return {
            id: element.dataset.boardTask!,
            top: rect.top,
            bottom: rect.bottom,
          };
        })
    );

  const toggleAssigneeFilter = (memberId: string) =>
    commit({
      ...view,
      assigneeFilter: assigneeFilter.includes(memberId)
        ? assigneeFilter.filter(id => id !== memberId)
        : [...assigneeFilter, memberId],
    });

  const groupByOptions: { value: BoardGroupBy; label: string }[] = [
    { value: 'status', label: t('taskStatus') },
    { value: 'priority', label: t('priority') },
    ...(members.length > 0
      ? [{ value: 'assignee' as const, label: messages.assignee }]
      : []),
  ];

  const [renaming, setRenaming] = useState<string | null>(null);

  // Text search lives in the Calendar header: picking a result highlights
  // the task, so bring its card into view.
  const highlightedId = app.state.highlightedEventId ?? null;
  useLayoutEffect(() => {
    if (!highlightedId) return;
    rootRef.current
      ?.querySelectorAll<HTMLElement>('[data-board-task]')
      .forEach(element => {
        if (element.dataset.boardTask === highlightedId)
          element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      });
  }, [highlightedId]);

  const canEditStatuses =
    groupBy === 'status' &&
    config.allowStatusEdit !== false &&
    app.canMutateFromUI();

  const saveStatuses = (next: TaskStatus[]) => {
    try {
      app.setTaskStatuses(next);
    } catch (reason) {
      report(reason);
    }
  };

  const updateStatus = (id: string, changes: Partial<TaskStatus>) =>
    saveStatuses(
      statuses.map(status =>
        status.id === id ? { ...status, ...changes } : status
      )
    );

  const removeStatus = (id: string) => {
    const rest = removeTaskStatus(app.getTaskStatuses(), id);
    if (rest) saveStatuses(rest);
  };

  const tasksIn = (id: string) =>
    app.getAllEvents().filter(event => isTask(event) && groupOf(event) === id);

  const reportFailures = (results: PromiseSettledResult<unknown>[]) => {
    for (const result of results)
      if (result.status === 'rejected') report(result.reason);
  };

  // Like merging calendars: the tasks join the target column, after its own
  // cards, and the emptied column goes away. The Calendar applies the moves
  // at once; the host saves them in parallel.
  const mergeStatus = async (id: string, targetId: string) => {
    // Judge completion by the workflow left after the merge: folding the
    // only completed column into another keeps its tasks checked.
    const remaining = {
      ...taskContext,
      statuses: removeTaskStatus(app.getTaskStatuses(), id) ?? statuses,
    };
    const saves = tasksIn(id).map(event =>
      app.updateEvent(event.id, {
        task: moveTaskToGroup(event, 'status', targetId, remaining).task,
      })
    );
    const current = latestView.current;
    const orders = current.taskOrderByGroup;
    commit({
      ...current,
      taskOrderByGroup: {
        ...orders,
        [targetId]: [...(orders[targetId] ?? []), ...(orders[id] ?? [])],
      },
    });
    removeStatus(id);
    reportFailures(await Promise.allSettled(saves));
  };

  // The Calendar removes a task once the host confirms, so the column waits
  // for all of its tasks before it goes.
  const deleteStatusWithTasks = async (id: string) => {
    reportFailures(
      await Promise.allSettled(
        tasksIn(id).map(event => app.deleteEvent(event.id))
      )
    );
    removeStatus(id);
  };

  const addStatus = () => {
    const id = generateUniKey();
    const lastOpen = statuses.findLastIndex(status => !status.completed);
    const next = [...statuses];
    // New columns join the open stages, before the completed ones.
    next.splice(lastOpen + 1, 0, {
      id,
      title: messages.newColumnTitle,
      color: COLUMN_COLORS[statuses.length % COLUMN_COLORS.length],
    });
    saveStatuses(next);
    setRenaming(id);
  };

  const finishRename = (id: string, value: string | null) => {
    setRenaming(null);
    const title = value?.trim();
    if (title) updateStatus(id, { title });
  };

  const moveColumn = (groupId: string, offset: -1 | 1) => {
    commit(
      reorderBoardGroup(
        view,
        shownGroups,
        groupId,
        shownGroups.indexOf(groupId) + offset
      )
    );
    setAnnouncement(messages.columnMoved);
  };

  // Like the calendar views: pressing anywhere but a task or its editor
  // closes the detail panel.
  const panelOpen = useRef(false);
  panelOpen.current = !!detailPanelEventId;
  useLayoutEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!panelOpen.current || event.button === 2) return;
      const target = event.target as Element | null;
      if (
        target?.closest(
          '[data-event-id], [data-event-detail-panel], [data-event-detail-dialog], [data-range-picker-popup], [data-calendar-picker-dropdown], .df-context-menu, .df-event-detail-panel'
        )
      )
        return;
      app.selectEvent(null);
      onEventSelect?.(null);
      onDetailPanelToggle?.(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [app, onEventSelect, onDetailPanelToggle]);

  return (
    <section
      ref={rootRef}
      className='df-board'
      aria-label={config.title ?? messages.title}
      aria-busy={busy}
    >
      <header className='df-board-toolbar'>
        <div className='df-board-toolbar-start'>
          <BoardSelect
            label={messages.groupBy}
            value={groupBy}
            options={groupByOptions}
            disabled={busy}
            onChange={value => {
              // Each grouping keeps its own column and card order, so
              // switching away and back restores what the user arranged.
              const layouts = {
                ...view.layouts,
                [view.groupBy]: {
                  groupOrder: view.groupOrder,
                  taskOrderByGroup: view.taskOrderByGroup,
                },
              };
              commit({
                ...view,
                groupBy: value,
                ...(layouts[value] ?? { groupOrder: [], taskOrderByGroup: {} }),
                layouts,
              });
            }}
          />
        </div>
        <div className='df-board-tools'>
          {members.length > 0 && (
            <div
              className='df-board-people'
              role='group'
              aria-label={messages.filterByAssignee}
            >
              {members.map(member => (
                <button
                  key={member.id}
                  type='button'
                  className='df-board-person'
                  aria-pressed={assigneeFilter.includes(member.id)}
                  aria-label={`${messages.filterByAssignee} ${member.name}`}
                  title={member.name}
                  onClick={() => toggleAssigneeFilter(member.id)}
                >
                  <TaskMemberAvatar member={member} size={24} />
                </button>
              ))}
              {assigneeFilter.length > 0 && (
                <button
                  type='button'
                  className='df-board-clear-filter'
                  onClick={() => commit({ ...view, assigneeFilter: [] })}
                >
                  {messages.clearFilter}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {error && (
        <p role='alert' className='df-board-error'>
          {error}
          <button
            type='button'
            aria-label={messages.cancel}
            onClick={() => setError('')}
          >
            <BoardIcon name='close' size={14} />
          </button>
        </p>
      )}
      <div ref={columnsRef} className='df-board-columns'>
        {shownGroups.map(groupId => {
          const group = groups.find(item => item.id === groupId)!;
          const ids = view.taskOrderByGroup[groupId].filter(id =>
            visibleIds.has(id)
          );
          const indicatorIndex =
            dropTarget?.groupId === groupId ? dropTarget.index : null;
          const isRenaming = renaming === groupId;
          return (
            <section
              key={groupId}
              className='df-board-column'
              data-board-group={groupId}
              data-drop-target={indicatorIndex !== null}
              style={
                {
                  '--df-board-group-color': group.color ?? DEFAULT_GROUP_COLOR,
                  width: config.columnWidth
                    ? Math.max(220, config.columnWidth)
                    : undefined,
                } as JSX.CSSProperties
              }
              aria-label={group.title}
              onDragOver={event => {
                if (!dragId || !canEdit(dragId)) return;
                event.preventDefault();
                const { index } = measureDrop(
                  event.currentTarget,
                  event.clientY,
                  dragId
                );
                if (
                  dropTarget?.groupId !== groupId ||
                  dropTarget.index !== index
                )
                  setDropTarget({ groupId, index });
              }}
              onDragLeave={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setDropTarget(null);
              }}
              onDrop={event => {
                event.preventDefault();
                const id = dragId;
                setDragId(null);
                setDropTarget(null);
                if (!id) return;
                move(
                  id,
                  groupId,
                  measureDrop(event.currentTarget, event.clientY, id)
                );
              }}
            >
              <header
                className='df-board-column-header'
                tabIndex={0}
                aria-label={`${group.title}: ${messages.reorderColumn}`}
                aria-keyshortcuts='Alt+ArrowLeft Alt+ArrowRight'
                onPointerDown={event => {
                  if (
                    isRenaming ||
                    !app.canMutateFromUI() ||
                    (event.target as Element).closest(
                      '.df-board-column-actions, .df-board-rename'
                    )
                  )
                    return;
                  columnDrag.handlePointerDown(
                    event as unknown as PointerEvent,
                    groupId,
                    event.currentTarget.parentElement!
                  );
                }}
                onKeyDown={event => {
                  if (
                    event.target !== event.currentTarget ||
                    !event.altKey ||
                    !['ArrowLeft', 'ArrowRight'].includes(event.key) ||
                    !app.canMutateFromUI()
                  )
                    return;
                  event.preventDefault();
                  event.stopPropagation();
                  moveColumn(groupId, event.key === 'ArrowLeft' ? -1 : 1);
                  requestAnimationFrame(() => {
                    columnsRef.current
                      ?.querySelectorAll<HTMLElement>('[data-board-group]')
                      .forEach(node => {
                        if (node.dataset.boardGroup === groupId)
                          node.querySelector<HTMLElement>('header')?.focus();
                      });
                  });
                }}
              >
                <h3 className='df-board-column-heading'>
                  {canEditStatuses ? (
                    <button
                      type='button'
                      className='df-board-column-title'
                      aria-label={`${messages.renameColumn}: ${group.title}`}
                      onClick={() => setRenaming(groupId)}
                    >
                      {group.title}
                    </button>
                  ) : (
                    <span className='df-board-column-title'>
                      {group.avatar}
                      {group.title}
                    </span>
                  )}
                </h3>
                <span className='df-board-count'>{ids.length}</span>
                <div className='df-board-column-actions'>
                  {canEditStatuses && (
                    <ColumnMenu
                      title={group.title}
                      messages={messages}
                      color={group.color ?? DEFAULT_GROUP_COLOR}
                      canDelete={!!removeTaskStatus(statuses, groupId)}
                      onRename={() => setRenaming(groupId)}
                      onColor={color => updateStatus(groupId, { color })}
                      onDelete={() => setConfirmDelete(groupId)}
                    />
                  )}
                  {canCreate && (
                    <button
                      type='button'
                      className='df-board-icon-button'
                      aria-label={`${messages.addTask}: ${group.title}`}
                      onClick={() => create(groupId)}
                    >
                      <BoardIcon name='plus' size={16} />
                    </button>
                  )}
                </div>
                {isRenaming && (
                  <RenamePopover
                    value={group.title}
                    messages={messages}
                    onDone={value => finishRename(groupId, value)}
                  />
                )}
              </header>
              <div className='df-board-cards'>
                {ids.map((id, index) => {
                  const task = byId.get(id)!;
                  const indicator =
                    indicatorIndex !== null &&
                    id !== dragId &&
                    ids.filter(item => item !== dragId).indexOf(id) ===
                      indicatorIndex;
                  return (
                    <div key={id} className='df-board-card-slot'>
                      {indicator && <div className='df-board-drop-line' />}
                      <BoardCard
                        task={task}
                        app={app}
                        members={members}
                        config={config}
                        groupId={groupId}
                        groupBy={groupBy}
                        isOpen={detailPanelEventId === id}
                        isDragging={dragId === id}
                        isHighlighted={highlightedId === id || createdId === id}
                        canEdit={canEdit(id)}
                        onOpen={event => open(task, event)}
                        onDragStart={event => {
                          if (!canEdit(id)) {
                            event.preventDefault();
                            return;
                          }
                          setDragId(id);
                          event.dataTransfer?.setData('text/plain', id);
                          if (event.dataTransfer)
                            event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropTarget(null);
                        }}
                        onKeyDown={event => {
                          if (
                            event.target !== event.currentTarget ||
                            !event.altKey ||
                            !moveKeys.has(event.key) ||
                            !canEdit(id)
                          )
                            return;
                          event.preventDefault();
                          event.stopPropagation();
                          const keyboardGroups = shownGroups.map(item => ({
                            id: item,
                            visibleTaskIds: view.taskOrderByGroup[item].filter(
                              taskId => visibleIds.has(taskId)
                            ),
                            droppable: true,
                          }));
                          const next = nextKeyboardDropState(
                            keyboardGroups,
                            id,
                            { groupId, index },
                            event.key as KeyboardDropKey
                          );
                          const nextIds = (
                            keyboardGroups.find(
                              item => item.id === next.groupId
                            )?.visibleTaskIds ?? []
                          ).filter(taskId => taskId !== id);
                          move(
                            id,
                            next.groupId,
                            positionAt(nextIds, next.index)
                          ).then(() => {
                            calendarRef.current
                              ?.querySelectorAll<HTMLElement>(
                                '[data-board-task]'
                              )
                              .forEach(element => {
                                if (element.dataset.boardTask === id)
                                  element.focus();
                              });
                          });
                        }}
                      />
                    </div>
                  );
                })}
                {indicatorIndex !== null &&
                  indicatorIndex >=
                    ids.filter(item => item !== dragId).length && (
                    <div className='df-board-drop-line' />
                  )}
              </div>
              {canCreate && (
                <button
                  type='button'
                  className='df-board-add-row'
                  onClick={() => create(groupId)}
                >
                  <BoardIcon name='plus' size={15} />
                  {messages.newTask}
                </button>
              )}
            </section>
          );
        })}
        {canEditStatuses && (
          <button
            type='button'
            className='df-board-add-column'
            onClick={addStatus}
          >
            <BoardIcon name='plus' size={15} />
            {messages.addColumn}
          </button>
        )}
      </div>
      <div
        ref={overlayRef}
        className='df-board-column-overlay'
        hidden
        aria-hidden='true'
        inert
      />
      {confirmDelete &&
        (() => {
          const status = statuses.find(item => item.id === confirmDelete);
          if (!status) return null;
          const toOption = (item: TaskStatus) => ({
            id: item.id,
            title: getTaskStatusTitle(item, t),
            color: item.color ?? DEFAULT_GROUP_COLOR,
          });
          return (
            <DeleteColumnDialog
              column={toOption(status)}
              taskCount={tasksIn(confirmDelete).length}
              targets={statuses
                .filter(item => item.id !== confirmDelete)
                .map(toOption)}
              messages={messages}
              onCancel={() => setConfirmDelete(null)}
              onMerge={targetId => {
                setConfirmDelete(null);
                if (
                  config.onColumnDelete?.({
                    column: status,
                    mode: 'merge',
                    targetId,
                    tasks: tasksIn(confirmDelete),
                  }) === false
                )
                  return;
                mergeStatus(confirmDelete, targetId);
              }}
              onDelete={() => {
                setConfirmDelete(null);
                if (
                  config.onColumnDelete?.({
                    column: status,
                    mode: 'delete',
                    tasks: tasksIn(confirmDelete),
                  }) === false
                )
                  return;
                deleteStatusWithTasks(confirmDelete);
              }}
            />
          );
        })()}
      <div className='df-board-sr-only' role='status' aria-live='polite'>
        {announcement}
      </div>
      <EventDetailPanelHost
        app={app}
        events={visibleTasks}
        calendarRef={calendarRef}
        detailPanelEventId={detailPanelEventId ?? null}
        useEventDetailPanel={useEventDetailPanel}
        isMobile={isMobile}
        onEventUpdate={event => {
          if (!app.canMutateFromUI(event.id)) return;
          Promise.resolve(app.updateEvent(event.id, event)).catch(report);
        }}
        onEventDelete={id => {
          if (app.canMutateFromUI(id)) app.deleteEvent(id).catch(report);
        }}
        onEventSelect={onEventSelect}
        onDetailPanelToggle={onDetailPanelToggle}
      />
    </section>
  );
}
