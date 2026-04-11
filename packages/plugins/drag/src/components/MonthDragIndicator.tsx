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
  isMobile,
}: MonthDragIndicatorProps) => {
  const { t } = useLocale();
  const getDisplayContent = () => {
    if (isCreating) {
      return {
        title: t('newEvent'),
        icon: <CalendarIcon className='h-3 w-3' />,
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
    <div className='flex h-full w-full min-w-0 items-center gap-2 overflow-hidden rounded-sm text-xs font-medium text-white'>
      {content.icon ? <div className='shrink-0'>{content.icon}</div> : null}
      <div className='min-w-0 flex-1'>
        <div
          className={`block w-full overflow-hidden font-medium whitespace-nowrap ${isMobile ? 'df-mobile-mask-fade' : 'truncate'}`}
          style={
            isMobile
              ? {
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }
              : undefined
          }
        >
          {content.title}
        </div>
      </div>
    </div>
  );
};

export default MonthDragIndicatorComponent;
