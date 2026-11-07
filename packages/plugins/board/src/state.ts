import {
  getTaskAssigneeIds,
  getTaskPriority,
  resolveTaskStatus,
  setTaskAssignees,
  setTaskPriority,
  setTaskStatus,
} from '@dayflow/core';
import type {
  Event,
  ICalendarApp,
  TaskMember,
  TaskPriority,
  TaskStatus,
} from '@dayflow/core';

import type { BoardGroupBy, BoardViewState } from './types';

export const UNASSIGNED_GROUP_ID = '__unassigned__';
export const PRIORITY_GROUP_IDS: readonly TaskPriority[] = [
  'high',
  'medium',
  'low',
  'none',
];

export interface BoardTaskContext {
  statuses: readonly TaskStatus[];
  members: readonly TaskMember[];
  timeZone: string;
}

/** The column a task belongs to. A task's first assignee owns its card. */
export function getBoardGroupId(
  event: Event,
  groupBy: BoardGroupBy,
  { statuses, members }: Pick<BoardTaskContext, 'statuses' | 'members'>
): string {
  if (groupBy === 'priority') return getTaskPriority(event);
  if (groupBy === 'assignee') {
    const primary = getTaskAssigneeIds(event).find(id =>
      members.some(member => member.id === id)
    );
    return primary ?? UNASSIGNED_GROUP_ID;
  }
  return resolveTaskStatus(event, statuses)?.id ?? statuses[0].id;
}

/**
 * The task after moving it into a column. Status moves complete or reopen the
 * task; assignee moves swap the primary assignee and keep the others.
 */
export function moveTaskToGroup(
  event: Event,
  groupBy: BoardGroupBy,
  groupId: string,
  { statuses, members, timeZone }: BoardTaskContext
): Event {
  if (groupBy === 'priority')
    return setTaskPriority(event, groupId as TaskPriority);
  if (groupBy === 'assignee') {
    if (groupId === UNASSIGNED_GROUP_ID) return setTaskAssignees(event, []);
    const previous = getBoardGroupId(event, 'assignee', { statuses, members });
    const others = getTaskAssigneeIds(event).filter(
      id => id !== previous && id !== groupId
    );
    return setTaskAssignees(event, [groupId, ...others]);
  }
  const status = statuses.find(item => item.id === groupId);
  return status ? setTaskStatus(event, status, timeZone, statuses) : event;
}

/** Adapted from DayFlow-Pro feat/board tasks-core/src/boardState.ts.
 * Retains complete orders while search and calendar visibility filter the UI.
 */
export function normalizeBoardViewState(
  tasks: readonly Event[],
  groupIds: readonly string[],
  getGroup: (event: Event) => string,
  view: BoardViewState
): BoardViewState {
  const validGroups = new Set(groupIds);
  const seenGroups = new Set<string>();
  const groupOrder = view.groupOrder.filter(id => {
    if (!validGroups.has(id) || seenGroups.has(id)) return false;
    seenGroups.add(id);
    return true;
  });
  for (const id of groupIds) {
    if (!seenGroups.has(id)) {
      groupOrder.push(id);
      seenGroups.add(id);
    }
  }
  const groupByTaskId = new Map(tasks.map(task => [task.id, getGroup(task)]));
  const assigned = new Set<string>();
  const taskOrderByGroup: Record<string, string[]> = Object.create(null);
  for (const groupId of groupOrder) {
    taskOrderByGroup[groupId] = (view.taskOrderByGroup[groupId] ?? []).filter(
      id => {
        if (assigned.has(id) || groupByTaskId.get(id) !== groupId) return false;
        assigned.add(id);
        return true;
      }
    );
  }
  for (const task of tasks) {
    if (assigned.has(task.id)) continue;
    taskOrderByGroup[groupByTaskId.get(task.id)!]?.push(task.id);
    assigned.add(task.id);
  }
  return { ...view, groupOrder, taskOrderByGroup };
}

export interface BoardOrderAnchor {
  beforeTaskId?: string;
  afterTaskId?: string;
}

/** Reorder rendered columns without discarding a hidden column. */
export function reorderBoardGroup(
  view: BoardViewState,
  visibleIds: readonly string[],
  id: string,
  index: number
): BoardViewState {
  if (!visibleIds.includes(id)) return view;
  const visible = visibleIds.filter(value => value !== id);
  visible.splice(Math.max(0, Math.min(index, visible.length)), 0, id);
  const full = view.groupOrder.filter(value => value !== id);
  const following = visible[visible.indexOf(id) + 1];
  const preceding = visible[visible.indexOf(id) - 1];
  const position = following
    ? full.indexOf(following)
    : preceding
      ? full.indexOf(preceding) + 1
      : 0;
  full.splice(position, 0, id);
  return { ...view, groupOrder: full };
}

/** Migrated from feat/board. Anchors preserve hidden cards during filtering. */
export function insertTaskIdAtAnchor(
  taskIds: readonly string[],
  taskId: string,
  anchor: BoardOrderAnchor
): string[] {
  const result = taskIds.filter(id => id !== taskId);
  const beforeIndex = anchor.beforeTaskId
    ? result.indexOf(anchor.beforeTaskId)
    : -1;
  if (beforeIndex >= 0) {
    result.splice(beforeIndex, 0, taskId);
    return result;
  }
  const afterIndex = anchor.afterTaskId
    ? result.indexOf(anchor.afterTaskId)
    : -1;
  if (afterIndex >= 0) {
    result.splice(afterIndex + 1, 0, taskId);
    return result;
  }
  return [...result, taskId];
}

export const COLUMN_COLORS = [
  '#8b5cf6',
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#10b981',
  '#84cc16',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#64748b',
];

/**
 * Statuses without the given one, or null when it is unknown or the last
 * one. Any column may go, completed or not; its tasks are merged or deleted
 * by the caller.
 */
export function removeTaskStatus(
  statuses: readonly TaskStatus[],
  id: string
): TaskStatus[] | null {
  const rest = statuses.filter(status => status.id !== id);
  return rest.length === statuses.length || rest.length === 0 ? null : rest;
}

/** Per-calendar board state shared by a board view factory and its views. */
export interface BoardStateStore {
  states: WeakMap<ICalendarApp, BoardViewState>;
  /** Re-render mounted boards when the state is set from outside. */
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
}

export function createBoardStateStore(): BoardStateStore {
  const listeners = new Set<() => void>();
  return {
    states: new WeakMap(),
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify: () => listeners.forEach(listener => listener()),
  };
}
