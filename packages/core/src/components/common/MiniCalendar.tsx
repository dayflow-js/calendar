import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { ChevronLeft, ChevronRight } from './Icons';
import {
  miniCalendarDay,
  miniCalendarDayHeader,
  miniCalendarGrid,
  miniCalendarCurrentMonth,
  miniCalendarOtherMonth,
  miniCalendarToday,
  miniCalendarSelected,
} from '../../styles/classNames';
import { useLocale, getWeekDaysLabels } from '@/locale';

interface MiniCalendarProps {
  visibleMonth: Date;
  currentDate: Date;
  showHeader?: boolean;
  onMonthChange: (offset: number) => void;
  onDateSelect: (date: Date) => void;
  locale?: string;
}

export const MiniCalendar = ({
  visibleMonth,
  currentDate,
  showHeader = false,
  onMonthChange,
  onDateSelect,
}: MiniCalendarProps) => {
  const { locale } = useLocale();
  const todayKey = useMemo(() => new Date().toDateString(), []);
  const currentDateKey = currentDate.toDateString();

  const weekdayLabels = useMemo(() => {
    return getWeekDaysLabels(locale, 'narrow');
  }, [locale]);

  const monthLabel = useMemo(
    () =>
      visibleMonth.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      }),
    [visibleMonth, locale]
  );

  const miniCalendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday as first day
    const totalCells = 42;
    const days: Array<{
      date: number;
      fullDate: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    for (let cell = 0; cell < totalCells; cell++) {
      const cellDate = new Date(year, month, cell - startOffset + 1);
      const cellDateString = cellDate.toDateString();
      days.push({
        date: cellDate.getDate(),
        fullDate: cellDate,
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: cellDateString === todayKey,
        isSelected: cellDateString === currentDateKey,
      });
    }

    return days;
  }, [visibleMonth, currentDateKey, todayKey]);

  return (
    <div className="px-3 py-3">
      {
        showHeader ? <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
            onClick={() => onMonthChange(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {monthLabel}
          </span>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
            onClick={() => onMonthChange(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div> : ''
      }
      <div className={miniCalendarGrid}>
        {weekdayLabels.map((label, index) => (
          <div key={`weekday-${index}`} className={`${miniCalendarDayHeader} text-gray-500 dark:text-gray-400`}>
            {label}
          </div>
        ))}
        {miniCalendarDays.map(day => (
          <button
            type="button"
            key={day.fullDate.getTime()}
            className={`
              ${miniCalendarDay}
              ${day.isToday
                ? miniCalendarToday
                : day.isCurrentMonth
                  ? miniCalendarCurrentMonth
                  : miniCalendarOtherMonth
              }
              ${day.isSelected && !day.isToday ? miniCalendarSelected : ''}
            `}
            onClick={() => onDateSelect(day.fullDate)}
          >
            {day.date}
          </button>
        ))}
      </div>
    </div>
  );
};
