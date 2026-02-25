import { memo } from 'preact/compat';

import { useLocale } from '@/locale';

interface YearDayCellProps {
  date: Date;
  isToday: boolean;
  locale: string;
  onSelectDate: (date: Date) => void;
  onCreateStart?: (e: MouseEvent | TouchEvent, targetDate: Date) => void;
  onMoreEventsClick?: (date: Date) => void;
  moreCount?: number;
  onContextMenu?: (e: MouseEvent, date: Date) => void;
}

export const YearDayCell = memo(
  ({
    date,
    isToday,
    locale,
    onSelectDate,
    onCreateStart,
    onMoreEventsClick,
    moreCount = 0,
    onContextMenu,
  }: YearDayCellProps) => {
    const { t } = useLocale();
    const day = date.getDate();
    const isFirstDay = day === 1;
    const monthLabel = date
      .toLocaleDateString(locale, { month: 'short' })
      .toUpperCase();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    return (
      <div
        className={`relative flex flex-col border-r border-b border-gray-100 dark:border-gray-800 ${isFirstDay ? 'border-l-2 border-l-primary dark:border-l-primary' : ''} overflow-hidden bg-white select-none dark:bg-gray-900`}
        style={{ aspectRatio: '1/1' }}
        onClick={() => onSelectDate(date)}
        onDblClick={e => onCreateStart?.(e, date)}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e, date);
        }}
        data-date={dateString}
      >
        <div className='flex h-6 shrink-0 items-center px-1 py-1'>
          {isFirstDay && (
            <span className='rounded-sm bg-primary px-1 py-0.5 text-[9px] leading-none font-bold text-primary-foreground'>
              {monthLabel}
            </span>
          )}
          <span
            className={`ml-auto text-[10px] font-medium ${
              isToday
                ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {day}
          </span>
        </div>

        {moreCount > 0 && (
          <div className='absolute bottom-0.5 left-1 z-20'>
            <span
              className='cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200'
              onClick={e => {
                e.stopPropagation();
                onMoreEventsClick?.(date);
              }}
            >
              +{moreCount} {t('more')}
            </span>
          </div>
        )}
      </div>
    );
  }
);

(YearDayCell as { displayName?: string }).displayName = 'YearDayCell';
