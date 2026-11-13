import type { Event, ICalendarApp, TaskStatus, TNode } from '@dayflow/core';

export type BoardGroupBy = 'status' | 'priority' | 'assignee';

/** Column order and card order of one grouping. */
export interface BoardLayout {
  groupOrder: string[];
  taskOrderByGroup: Record<string, string[]>;
}

/** Presentation state, persisted separately from Calendar events. */
export interface BoardViewState extends BoardLayout {
  groupBy: BoardGroupBy;
  /** Show only tasks assigned to one of these members. Empty shows all. */
  assigneeFilter?: string[];
  /** Layouts of the other groupings, restored when switching back to them. */
  layouts?: Partial<Record<BoardGroupBy, BoardLayout>>;
}

export interface BoardMessages {
  title: string;
  groupBy: string;
  assignee: string;
  addTask: string;
  newTask: string;
  cancel: string;
  columnMenu: string;
  renameColumn: string;
  columnColor: string;
  done: string;
  deleteColumn: string;
  deleteColumnBlocked: string;
  /** `{title}` is the column name, in the titles and messages below. */
  deleteColumnTitle: string;
  deleteColumnMessage: string;
  confirmDeleteColumnTitle: string;
  confirmDeleteColumnMessage: string;
  deleteColumnEmpty: string;
  merge: string;
  /** `{source}` merges into `{target}`. */
  mergeColumnTitle: string;
  mergeColumnMessage: string;
  addColumn: string;
  newColumnTitle: string;
  moved: string;
  saveFailed: string;
  filterByAssignee: string;
  clearFilter: string;
  reorderColumn: string;
  columnMoved: string;
}

export interface BoardCardRenderArgs {
  event: Event;
  app: ICalendarApp;
  open: () => void;
}

/** What a card style hook knows about the card. */
export interface BoardCardStyleArgs {
  event: Event;
  app: ICalendarApp;
  /** Column the card is in. */
  groupId: string;
  groupBy: BoardGroupBy;
}

/** Card parts that can be hidden. All show by default. */
export interface BoardCardFields {
  priority?: boolean;
  description?: boolean;
  due?: boolean;
  assignees?: boolean;
}

export interface BoardTaskMoveArgs {
  event: Event;
  /** Column the task leaves; equals `to` for a reorder within a column. */
  from: string;
  to: string;
  groupBy: BoardGroupBy;
  /** Neighbours at the drop point. */
  beforeTaskId?: string;
  afterTaskId?: string;
}

export interface BoardTaskCreateArgs {
  groupId: string;
  groupBy: BoardGroupBy;
}

export interface BoardColumnDeleteArgs {
  column: TaskStatus;
  /** `merge` moves the tasks to `targetId`; `delete` deletes them. */
  mode: 'merge' | 'delete';
  targetId?: string;
  tasks: Event[];
}

/** Inline styles as plain values, usable from any framework. */
export type BoardStyle = Record<string, string | number>;

export interface BoardViewConfig {
  /** Name in the view switcher. */
  label?: string;
  /** Accessible name of the board. */
  title?: string;
  groupBy?: BoardGroupBy;
  initialState?: BoardViewState;
  /** Defaults to true. Lets users add, rename, recolor and delete status
   * columns; changes reach `callbacks.onTaskStatusesChange`. */
  allowStatusEdit?: boolean;
  /** Synchronous notification of user changes to grouping, column and card
   * order or the assignee filter; persist this state in the host
   * application. Not called for `boardView.setState`. */
  onViewStateChange?: (state: BoardViewState) => void;
  onError?: (error: unknown) => void;
  messages?: Partial<BoardMessages>;
  columnWidth?: number;
  /** Show descriptions on cards. Defaults to true. Same as
   * `cardFields.description`. */
  showDescription?: boolean;
  /** Hide parts of every card, e.g. `{ due: false }`. */
  cardFields?: BoardCardFields;
  /** Extra class names for a card, fixed or per task. Cards also carry
   * `data-priority`, `data-group`, `data-calendar`, `data-completed` and
   * `data-due` (`overdue` / `today` / `upcoming`) for CSS selectors, and
   * read the `--df-board-card-*` custom properties (see README). */
  cardClassName?: string | ((args: BoardCardStyleArgs) => string | undefined);
  /** Inline styles for a card, fixed or per task. Custom properties such as
   * `--df-board-card-bg` work here too. */
  cardStyle?:
    | BoardStyle
    | ((args: BoardCardStyleArgs) => BoardStyle | undefined);
  /** Defaults to true. "New task" adds a task due today at the bottom of a
   * column; it is edited in the detail panel or dialog. */
  allowCreate?: boolean;
  /** Extra content below the card title. */
  renderCard?: (args: BoardCardRenderArgs) => TNode;
  /** Before a card is moved or reordered by drag or keyboard. Return false
   * to cancel. */
  onTaskMove?: (args: BoardTaskMoveArgs) => boolean | undefined;
  /** Before "New task" adds a task. Return a changed draft to use it
   * instead, or false to cancel. */
  onTaskCreate?: (
    draft: Event,
    args: BoardTaskCreateArgs
  ) => Event | false | undefined;
  /** After the user confirms deleting a column. Return false to cancel. */
  onColumnDelete?: (args: BoardColumnDeleteArgs) => boolean | undefined;
  /** When a card is clicked or opened with Enter. Return false to keep the
   * detail panel closed and handle it yourself. */
  onCardClick?: (event: Event, nativeEvent: MouseEvent) => boolean | undefined;
}
