import { useLocale } from '@/locale';
import { Event, ICalendarApp } from '@/types';
import { logger } from '@/utils/logger';
import { setTaskCompleted } from '@/utils/taskUtils';

interface TaskCheckboxProps {
  event: Event;
  app?: ICalendarApp;
  isEditable: boolean;
  /** Ring color; falls back to the current text color. */
  color?: string;
}

/**
 * Completion circle shown in front of a task. Toggling it never opens the
 * detail panel or starts a drag. Rendered as a span because the agenda view
 * places it inside a button.
 */
export const TaskCheckbox = ({
  event,
  app,
  isEditable,
  color,
}: TaskCheckboxProps) => {
  const { t } = useLocale();
  const completed = !!event.task?.completed;
  // Generated repeats share the master's state, so only the master toggles.
  const canToggle = isEditable && !!app && !event._recurrenceMasterId;

  const toggle = () => {
    if (!app) return;
    const { task } = setTaskCompleted(event, !completed, app.timeZone);
    Promise.resolve(app.updateEvent(event.id, { task })).catch(error => {
      logger.error('Failed to toggle task completion', error);
    });
  };

  const stopIfInteractive = (e: globalThis.Event) => {
    if (canToggle) e.stopPropagation();
  };

  return (
    <span
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an <input> is not allowed inside the agenda's <button>
      role='checkbox'
      aria-checked={completed}
      aria-disabled={!canToggle}
      aria-label={t(completed ? 'markIncomplete' : 'markComplete')}
      tabIndex={canToggle ? 0 : -1}
      className='df-task-checkbox'
      data-completed={String(completed)}
      data-interactive={String(canToggle)}
      style={color ? { color } : undefined}
      onMouseDown={stopIfInteractive}
      onTouchStart={stopIfInteractive}
      onDblClick={stopIfInteractive}
      onClick={e => {
        if (!canToggle) return;
        e.stopPropagation();
        toggle();
      }}
      onKeyDown={e => {
        if (!canToggle || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
    >
      <svg viewBox='0 0 16 16' aria-hidden='true'>
        <circle cx='8' cy='8' r='6.25' />
        {completed && <path d='M5 8.25 7.1 10.3 11 5.9' />}
      </svg>
    </span>
  );
};
