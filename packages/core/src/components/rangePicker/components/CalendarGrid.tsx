import { h } from 'preact';
import { Temporal } from 'temporal-polyfill';
import { compareDates } from '../utils';

interface CalendarGridProps {
  calendarDays: Temporal.PlainDate[];
  visibleMonth: Temporal.PlainDate;
  startDate: Temporal.PlainDate;
  endDate: Temporal.PlainDate;
  weekDayLabels: string[];
  disabled?: boolean;
  onDaySelect: (day: Temporal.PlainDate) => void;
}

const CalendarGrid = ({
  calendarDays,
  visibleMonth,
  startDate,
  endDate,
  weekDayLabels,
  disabled,
  onDaySelect,
}: CalendarGridProps & any) => {
  const renderDayCell = (day: Temporal.PlainDate) => {
    const isOutsideMonth = day.month !== visibleMonth.month;
    const isStart = compareDates(day, startDate) === 0;
    const isEnd = compareDates(day, endDate) === 0;
    const isInRange =
      compareDates(day, startDate) >= 0 && compareDates(day, endDate) <= 0;

    const baseClasses =
      'flex h-9 w-9 items-center justify-center rounded-md text-sm transition';

    const stateClass = (() => {
      if (isStart || isEnd) {
        return 'bg-primary text-primary-foreground font-semibold';
      }
      if (isInRange) {
        return 'bg-primary/10 text-primary';
      }
      if (isOutsideMonth) {
        return 'text-slate-300 dark:text-gray-600';
      }
      return 'text-slate-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary';
    })();

    return (
      <button
        key={day.toString()}
        type="button"
        disabled={disabled}
        onClick={() => onDaySelect(day)}
        className={`${baseClasses} ${stateClass}`}
      >
        {day.day}
      </button>
    );
  };

  return (
    <>
      <div className="grid grid-cols-7 gap-1 px-3 pb-3 pt-2 text-center text-[12px] uppercase tracking-wide text-slate-400 dark:text-gray-500">
        {weekDayLabels.map((day: any, index: any) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 px-1 ">
        {calendarDays.map(renderDayCell)}
      </div>
    </>
  );
};

export default CalendarGrid;
