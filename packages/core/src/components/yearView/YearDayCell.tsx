import { h } from 'preact';
import { memo } from 'preact/compat';
import { useLocale } from '@/locale';

interface YearDayCellProps {
  date: Date;
  isToday: boolean;
  locale: string;
  onSelectDate: (date: Date) => void;
  onCreateStart?: (e: any | any, targetDate: Date) => void;
  onMoreEventsClick?: (date: Date) => void;
  moreCount?: number;
  onContextMenu?: (e: any, date: Date) => void;
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
        className={`
        relative flex flex-col border-r border-b border-gray-100 dark:border-gray-800
        ${isFirstDay ? 'border-l-2 border-l-primary dark:border-l-primary' : ''}
        overflow-hidden bg-white dark:bg-gray-900 select-none
      `}
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
        <div className="flex items-center px-1 py-1 shrink-0 h-6">
          {isFirstDay && (
            <span className="text-[9px] font-bold text-primary-foreground bg-primary px-1 py-0.5 rounded-sm leading-none">
              {monthLabel}
            </span>
          )}
          <span
            className={`text-[10px] font-medium ml-auto ${
              isToday
                ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {day}
          </span>
        </div>

        {moreCount > 0 && (
          <div className="absolute bottom-0.5 left-1 z-20">
            <span
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer hover:underline"
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

(YearDayCell as any).displayName = 'YearDayCell';
