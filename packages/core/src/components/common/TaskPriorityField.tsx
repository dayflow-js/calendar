import { useLocale } from '@/locale';
import type { Event, TaskPriority } from '@/types';
import { getTaskPriority, setTaskPriority } from '@/utils/taskUtils';

import { FormSelect } from './FormSelect';

interface TaskPriorityFieldProps {
  event: Event;
  disabled?: boolean;
  onChange: (event: Event) => void;
}

export const TaskPriorityField = ({
  event,
  disabled = false,
  onChange,
}: TaskPriorityFieldProps) => {
  const { t } = useLocale();
  const id = `task-priority-${event.id}`;

  return (
    <div className='df-task-priority-field'>
      <label className='df-form-label' htmlFor={id}>
        {t('priority')}
      </label>
      <FormSelect<TaskPriority>
        id={id}
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
  );
};
