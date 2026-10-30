import {
  getTaskAssignees,
  getTaskPriority,
  isTaskCompleted,
  isZonedDateTime,
  TaskAvatarStack,
  useLocale,
} from '@dayflow/core';
import type {
  Event as CalendarEvent,
  ICalendarApp,
  TaskMember,
} from '@dayflow/core';
import type { JSX } from 'preact';
import { Temporal } from 'temporal-polyfill';

import { BoardIcon } from './icons';
import type { BoardGroupBy, BoardViewConfig } from './types';

const PRIORITY_LEVELS = { high: 3, medium: 2, low: 1 } as const;
const PRIORITY_KEYS = {
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
} as const;

/** Signal bars, as Linear shows priority. */
function PriorityBars({ level }: { level: number }) {
  return (
    <svg width='12' height='12' viewBox='0 0 12 12' aria-hidden='true'>
      {[0, 1, 2].map(bar => (
        <rect
          key={bar}
          x={1 + bar * 4}
          y={8 - bar * 3}
          width='2.5'
          height={3 + bar * 3}
          rx='0.75'
          fill='currentColor'
          opacity={bar < level ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

interface DueLabel {
  text: string;
  tone: 'overdue' | 'today' | 'default';
}

/** The due date alone, e.g. "Oct 30"; the year shows outside this year. */
function getDueLabel(
  task: CalendarEvent,
  app: ICalendarApp,
  locale: string
): DueLabel {
  const start = isZonedDateTime(task.start)
    ? task.start.withTimeZone(app.timeZone)
    : task.start;
  const day = Temporal.PlainDate.from(start);
  const today = Temporal.Now.plainDateISO(app.timeZone);
  const order = Temporal.PlainDate.compare(day, today);
  return {
    text: day.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      ...(day.year === today.year ? {} : { year: 'numeric' }),
    }),
    tone:
      isTaskCompleted(task) || order > 0
        ? 'default'
        : order < 0
          ? 'overdue'
          : 'today',
  };
}

interface BoardCardProps {
  task: CalendarEvent;
  app: ICalendarApp;
  members: readonly TaskMember[];
  config: BoardViewConfig;
  groupId: string;
  groupBy: BoardGroupBy;
  isOpen: boolean;
  isDragging: boolean;
  isHighlighted: boolean;
  canEdit: boolean;
  onOpen: (event: MouseEvent) => void;
  onDragStart: (event: JSX.TargetedDragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onKeyDown: (event: JSX.TargetedKeyboardEvent<HTMLElement>) => void;
}

export function BoardCard({
  task,
  app,
  members,
  config,
  groupId,
  groupBy,
  isOpen,
  isDragging,
  isHighlighted,
  canEdit,
  onOpen,
  onDragStart,
  onDragEnd,
  onKeyDown,
}: BoardCardProps) {
  const { t, locale } = useLocale();
  const completed = isTaskCompleted(task);
  const priority = getTaskPriority(task);
  const assignees = getTaskAssignees(task, members);
  const color = app
    .getCalendarRegistry()
    .resolveColors(task.calendarId).lineColor;
  const due = getDueLabel(task, app, locale);
  const fields = config.cardFields ?? {};
  const show = {
    priority: fields.priority !== false && priority !== 'none',
    description:
      fields.description !== false &&
      config.showDescription !== false &&
      !!task.description,
    due: fields.due !== false,
    assignees: fields.assignees !== false && assignees.length > 0,
  };
  const styleArgs = { event: task, app, groupId, groupBy };
  const extraClass =
    typeof config.cardClassName === 'function'
      ? config.cardClassName(styleArgs)
      : config.cardClassName;
  const extraStyle =
    typeof config.cardStyle === 'function'
      ? config.cardStyle(styleArgs)
      : config.cardStyle;

  return (
    <article
      data-board-task={task.id}
      data-event-id={task.id}
      className={extraClass ? `df-board-card ${extraClass}` : 'df-board-card'}
      data-completed={completed}
      data-priority={priority}
      data-group={groupId}
      data-calendar={task.calendarId}
      data-due={due.tone === 'default' ? 'upcoming' : due.tone}
      data-open={isOpen}
      data-dragging={isDragging}
      data-highlighted={isHighlighted}
      style={
        {
          '--df-board-card-accent': color,
          ...extraStyle,
        } as JSX.CSSProperties
      }
      tabIndex={0}
      draggable={canEdit}
      aria-label={task.title}
      aria-keyshortcuts={
        canEdit
          ? 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight'
          : undefined
      }
      onClick={event => onOpen(event)}
      onKeyDown={event => {
        if (event.target === event.currentTarget && event.key === 'Enter') {
          event.preventDefault();
          onOpen(new MouseEvent('dblclick'));
          return;
        }
        onKeyDown(event);
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className='df-board-card-head'>
        <span className='df-board-card-text'>{task.title}</span>
        {show.priority && priority !== 'none' && (
          <span
            className='df-board-priority'
            data-priority={priority}
            title={t('priority')}
          >
            <PriorityBars level={PRIORITY_LEVELS[priority]} />
            {t(PRIORITY_KEYS[priority])}
          </span>
        )}
      </div>
      {show.description && (
        <p className='df-board-card-description'>{task.description}</p>
      )}
      {config.renderCard?.({
        event: task,
        app,
        open: () => onOpen(new MouseEvent('dblclick')),
      })}
      {(show.due || show.assignees) && (
        <div className='df-board-card-foot'>
          {show.due && (
            <span className='df-board-chip' data-tone={due.tone}>
              <BoardIcon name='calendar' size={12} />
              <time dateTime={task.start.toString()}>{due.text}</time>
            </span>
          )}
          {show.assignees && <TaskAvatarStack members={assignees} size={20} />}
        </div>
      )}
    </article>
  );
}
