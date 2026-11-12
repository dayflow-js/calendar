import { useLocale } from '@/locale';
import { memoWithDisplayName } from '@/utils/memoWithDisplayName';

interface YearDayCellProps {
  date: Date;
  isToday: boolean;
  locale: string;
  onSelectDate: (date: Date) => void;
  onCreateStart?: (e: MouseEvent | TouchEvent, targetDate: Date) => void;
  onMoreEventsClick?: (date: Date, e?: MouseEvent) => void;
  moreCount?: number;
  onContextMenu?: (e: MouseEvent, date: Date) => void;
}

export const YearDayCell = /* @__PURE__ */ memoWithDisplayName(
  'YearDayCell',
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
    const day = Number(
      date.toLocaleDateString('en-US', {
        day: 'numeric',
        calendar: new Intl.Locale(locale).calendar ?? 'gregory',
      })
    );
    const isFirstDay = day === 1;
    const monthLabel = date
      .toLocaleDateString(locale, { month: 'short' })
      .toUpperCase();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    return (
      <div
        className='df-year-day-cell'
        data-first-day={isFirstDay ? 'true' : 'false'}
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
        <div className='df-year-day-cell-header'>
          {isFirstDay && (
            <span className='df-year-day-cell-month-pill'>{monthLabel}</span>
          )}
          <span
            className='df-year-day-cell-date'
            data-today={isToday ? 'true' : 'false'}
          >
            {date.toLocaleDateString(locale, { day: 'numeric' })}
          </span>
        </div>

        {moreCount > 0 && (
          <div className='df-year-day-cell-more-wrap'>
            <span
              className='df-year-day-cell-more'
              onClick={e => {
                e.stopPropagation();
                onMoreEventsClick?.(date, e as unknown as MouseEvent);
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
