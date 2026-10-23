import { useLocale } from '@/locale';
import type { Event } from '@/types';
import { getTaskPriority, isTask } from '@/utils/taskUtils';

/** Accessible label for the priority encoded in the full task background. */
export const TaskPriorityIndicator = ({ event }: { event: Event }) => {
  const { t } = useLocale();
  const priority = getTaskPriority(event);
  if (!isTask(event) || priority === 'none') return null;
  const label = t(
    priority === 'high'
      ? 'priorityHigh'
      : priority === 'medium'
        ? 'priorityMedium'
        : 'priorityLow'
  );
  return (
    <span
      className='df-task-priority-indicator'
      data-priority={priority}
      role='img'
      aria-label={`${t('priority')}: ${label}`}
      title={`${t('priority')}: ${label}`}
    />
  );
};
