import type { CalendarView, ICalendarApp } from '@dayflow/core';
import { h } from 'preact';

import { BoardView } from './BoardView';
import { createBoardStateStore } from './state';
import type { BoardViewConfig, BoardViewState } from './types';

export type {
  BoardCardFields,
  BoardCardRenderArgs,
  BoardCardStyleArgs,
  BoardColumnDeleteArgs,
  BoardGroupBy,
  BoardLayout,
  BoardMessages,
  BoardStyle,
  BoardTaskCreateArgs,
  BoardTaskMoveArgs,
  BoardViewConfig,
  BoardViewState,
} from './types';
export type { BoardOrderAnchor, BoardTaskContext } from './state';
export {
  COLUMN_COLORS,
  getBoardGroupId,
  insertTaskIdAtAnchor,
  moveTaskToGroup,
  normalizeBoardViewState,
  PRIORITY_GROUP_IDS,
  removeTaskStatus,
  reorderBoardGroup,
  UNASSIGNED_GROUP_ID,
} from './state';
export { getBoardMessages } from './locale';

/** The board view, plus access to each calendar's board state. */
export interface BoardCalendarView extends CalendarView {
  /** Grouping, column and card order and filter of a calendar's board, or
   * undefined before the board has been shown or set. */
  getState: (app: ICalendarApp) => BoardViewState | undefined;
  /** Replace a calendar's board state, e.g. one loaded from storage or a
   * custom order. Mounted boards update; `onViewStateChange` is not called. */
  setState: (app: ICalendarApp, state: BoardViewState) => void;
}

/**
 * A Calendar view that lays tasks out in columns by status, priority or
 * assignee. Register it in `views` next to the built-in views.
 */
export function createBoardView(
  config: BoardViewConfig = {}
): BoardCalendarView {
  // A factory may be shared by multiple calendars; never share their UI state.
  const store = createBoardStateStore();
  return {
    type: 'board',
    label: config.label ?? config.title ?? 'Board',
    config: { ...config },
    // Everything here is a task; turning one into an event belongs to the
    // calendar views.
    lockEventKind: true,
    // Columns are task statuses, so the task editors show the Column field.
    usesTaskStatus: true,
    component: props => h(BoardView, { ...props, store }),
    getState: app => store.states.get(app),
    setState: (app, state) => {
      store.states.set(app, state);
      store.notify();
    },
  };
}
