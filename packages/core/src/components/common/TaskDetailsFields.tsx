import { useEffect, useRef, useState } from 'preact/hooks';

import { useLocale } from '@/locale';
import type { Event, ICalendarApp, TaskPriority } from '@/types';
import {
  DEFAULT_TASK_STATUSES,
  getTaskAssigneeIds,
  getTaskAssignees,
  getTaskPriority,
  getTaskStatusTitle,
  resolveTaskStatus,
  setTaskAssignees,
  setTaskPriority,
  setTaskStatus,
} from '@/utils/taskUtils';

import { FormSelect } from './FormSelect';
import { Check, ChevronDown } from './Icons';
import { TaskAvatarStack, TaskMemberAvatar } from './TaskMemberAvatar';

interface TaskDetailsFieldsProps {
  app?: ICalendarApp;
  event: Event;
  disabled?: boolean;
  onChange: (event: Event) => void;
}

const StatusDot = ({ color }: { color?: string }) => (
  <span
    className='df-task-status-dot'
    style={color ? { backgroundColor: color } : undefined}
  />
);

interface TaskAssigneeSelectProps {
  id: string;
  event: Event;
  members: NonNullable<ReturnType<ICalendarApp['getTaskMembers']>>;
  disabled: boolean;
  onChange: (event: Event) => void;
}

const TaskAssigneeSelect = ({
  id,
  event,
  members,
  disabled,
  onChange,
}: TaskAssigneeSelectProps) => {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const assigned = getTaskAssignees(event, members);
  const assignedIds = getTaskAssigneeIds(event);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (pointer: MouseEvent) => {
      if (!rootRef.current?.contains(pointer.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (key: KeyboardEvent) => {
      if (key.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggle = (memberId: string) =>
    onChange(
      setTaskAssignees(
        event,
        assignedIds.includes(memberId)
          ? assignedIds.filter(item => item !== memberId)
          : [...assignedIds, memberId]
      )
    );

  return (
    <div className='df-task-field'>
      <label className='df-form-label' htmlFor={id}>
        {t('assignees')}
      </label>
      <div className='df-form-select' ref={rootRef}>
        <button
          id={id}
          type='button'
          className='df-view-switcher-select-trigger df-form-select-trigger'
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup='listbox'
          onClick={() => setIsOpen(open => !open)}
        >
          <span className='df-form-select-value'>
            {assigned.length > 0 ? (
              <>
                <TaskAvatarStack members={assigned} size={18} />
                {assigned.map(member => member.name).join(', ')}
              </>
            ) : (
              <span className='df-task-placeholder'>{t('unassigned')}</span>
            )}
          </span>
          <span
            className='df-view-switcher-select-chevron'
            data-open={isOpen ? 'true' : 'false'}
          >
            <ChevronDown width={16} height={16} />
          </span>
        </button>
        {isOpen && (
          <div className='df-view-switcher-select-dropdown df-form-select-dropdown df-animate-in df-fade-in df-zoom-in-95'>
            <div
              className='df-view-switcher-select-list'
              role='listbox'
              aria-multiselectable='true'
            >
              {members.map(member => {
                const selected = assignedIds.includes(member.id);
                return (
                  <button
                    type='button'
                    key={member.id}
                    className='df-view-switcher-select-option df-task-member-option'
                    data-active={selected ? 'true' : 'false'}
                    role='option'
                    aria-selected={selected}
                    onClick={() => toggle(member.id)}
                  >
                    <TaskMemberAvatar member={member} size={20} />
                    <span className='df-task-member-name'>{member.name}</span>
                    {selected && <Check width={14} height={14} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Status, priority and assignees for a task in the built-in editors. */
export const TaskDetailsFields = ({
  app,
  event,
  disabled = false,
  onChange,
}: TaskDetailsFieldsProps) => {
  const { t } = useLocale();
  const statuses = app?.getTaskStatuses?.() ?? DEFAULT_TASK_STATUSES;
  const members = app?.getTaskMembers?.() ?? [];
  const status = resolveTaskStatus(event, statuses);
  // Columns only mean something when a view (e.g. the board) shows them.
  const showStatus = [...(app?.state?.views?.values() ?? [])].some(
    view => view.usesTaskStatus
  );
  const statusId = `task-status-${event.id}`;
  const priorityId = `task-priority-${event.id}`;

  return (
    <div className='df-task-fields'>
      <div className='df-task-fields-row'>
        {showStatus && (
          <div className='df-task-field'>
            <label className='df-form-label' htmlFor={statusId}>
              {t('taskStatus')}
            </label>
            <FormSelect
              id={statusId}
              value={status?.id ?? ''}
              options={statuses.map(item => ({
                value: item.id,
                label: getTaskStatusTitle(item, t),
                prefix: <StatusDot color={item.color} />,
              }))}
              disabled={disabled}
              ariaLabel={t('taskStatus')}
              onChange={id => {
                const next = statuses.find(item => item.id === id);
                if (next)
                  onChange(setTaskStatus(event, next, app?.timeZone, statuses));
              }}
            />
          </div>
        )}
        <div className='df-task-field'>
          <label className='df-form-label' htmlFor={priorityId}>
            {t('priority')}
          </label>
          <FormSelect<TaskPriority>
            id={priorityId}
            value={getTaskPriority(event)}
            options={[
              { value: 'none', label: t('priorityNone') },
              { value: 'low', label: t('priorityLow') },
              { value: 'medium', label: t('priorityMedium') },
              { value: 'high', label: t('priorityHigh') },
            ]}
            disabled={disabled}
            ariaLabel={t('priority')}
            onChange={priority => onChange(setTaskPriority(event, priority))}
          />
        </div>
      </div>
      {members.length > 0 && (
        <TaskAssigneeSelect
          id={`task-assignees-${event.id}`}
          event={event}
          members={members}
          disabled={disabled}
          onChange={onChange}
        />
      )}
    </div>
  );
};
