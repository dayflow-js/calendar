import { h } from 'preact';
import { Event } from '../../types';
import { Calendar } from '../common/Icons';
import { daysDifference } from '../../utils';
import { useLocale } from '@/locale';

interface MonthDragIndicatorProps {
  event: Event;
  isCreating: boolean;
  targetDate: Date | null;
  isMultiDay?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

const MonthDragIndicatorComponent = ({
  event,
  isCreating,
  isMultiDay = false,
  startDate,
  endDate,
}: MonthDragIndicatorProps & any) => {
  const { t } = useLocale();
  const getDisplayContent = () => {
    if (isCreating) {
      return {
        title: t('newEvent'),
        icon: <Calendar className="h-3 w-3" />,
        showDateRange: false,
      };
    }

    if (isMultiDay && startDate && endDate) {
      const duration = daysDifference(startDate, endDate) + 1;
      return {
        title: event.title.replace(/ \(\d+天\)$/, ''),
        // icon: getEventIcon(event),
        showDateRange: true,
        duration,
      };
    }

    return {
      title: event.title,
      // icon: getEventIcon(event),
      showDateRange: false,
    };
  };

  const content = getDisplayContent();

  return (
    <div className="flex items-center space-x-2 text-white text-xs font-medium rounded-sm">
      <div className="shrink-0">{content.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{content.title}</div>
      </div>
    </div>
  );
};

export default MonthDragIndicatorComponent;
