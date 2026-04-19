import { Event, daysDifference, useLocale } from '@dayflow/core';

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    stroke-width='2'
    stroke-linecap='round'
    stroke-linejoin='round'
    className={className}
  >
    <path d='M8 2v4' />
    <path d='M16 2v4' />
    <rect width='18' height='18' x='3' y='4' rx='2' />
    <path d='M3 10h18' />
  </svg>
);

interface MonthDragIndicatorProps {
  event: Event;
  isCreating: boolean;
  targetDate: Date | null;
  isMultiDay?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  isMobile?: boolean;
}

const MonthDragIndicatorComponent = ({
  event,
  isCreating,
  isMultiDay = false,
  startDate,
  endDate,
  isMobile: _isMobile,
}: MonthDragIndicatorProps) => {
  const { t } = useLocale();
  const getDisplayContent = () => {
    if (isCreating) {
      return {
        title: t('newEvent'),
        icon: <CalendarIcon className='df-drag-indicator-icon' />,
        showDateRange: false,
      };
    }

    if (isMultiDay && startDate && endDate) {
      const duration = daysDifference(startDate, endDate) + 1;
      return {
        title: event.title.replace(/ \(\d+天\)$/, ''),
        showDateRange: true,
        duration,
      };
    }

    return {
      title: event.title,
      showDateRange: false,
    };
  };

  const content = getDisplayContent();

  return (
    <div className='df-drag-indicator-month'>
      {content.icon ? (
        <div className='df-drag-indicator-month-icon-wrap'>{content.icon}</div>
      ) : null}
      <div className='df-drag-indicator-month-content'>
        <div className='df-drag-indicator-title-mask df-drag-indicator-month-title'>
          {content.title}
        </div>
      </div>
    </div>
  );
};

export default MonthDragIndicatorComponent;
