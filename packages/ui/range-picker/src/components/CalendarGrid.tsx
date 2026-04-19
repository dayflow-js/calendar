import { Temporal } from 'temporal-polyfill';

interface CalendarGridProps {
  calendarDays: Temporal.PlainDate[];
  visibleMonth: Temporal.PlainDate;
  startDate: Temporal.PlainDate;
  endDate: Temporal.PlainDate;
  weekDayLabels: string[];
  disabled?: boolean;
  onDaySelect: (day: Temporal.PlainDate) => void;
}

const compareDates = (a: Temporal.PlainDate, b: Temporal.PlainDate): number =>
  Temporal.PlainDate.compare(a, b);

const CalendarGrid = ({
  calendarDays,
  visibleMonth,
  startDate,
  endDate,
  weekDayLabels,
  disabled,
  onDaySelect,
}: CalendarGridProps) => {
  const renderDayCell = (day: Temporal.PlainDate) => {
    const isOutsideMonth = day.month !== visibleMonth.month;
    const isStart = compareDates(day, startDate) === 0;
    const isEnd = compareDates(day, endDate) === 0;
    const isInRange =
      compareDates(day, startDate) >= 0 && compareDates(day, endDate) <= 0;

    return (
      <button
        key={day.toString()}
        type='button'
        disabled={disabled}
        onClick={() => onDaySelect(day)}
        className='df-range-picker-day-cell'
        data-outside={isOutsideMonth}
        data-range-edge={isStart ? 'start' : isEnd ? 'end' : undefined}
        data-in-range={isInRange && !isStart && !isEnd}
      >
        {day.day}
      </button>
    );
  };

  return (
    <>
      <div className='df-range-picker-weekday-row'>
        {weekDayLabels.map((day: string) => (
          <span key={day} className='df-range-picker-weekday-label'>
            {day}
          </span>
        ))}
      </div>
      <div className='df-range-picker-day-grid'>
        {calendarDays.map(renderDayCell)}
      </div>
    </>
  );
};

export default CalendarGrid;
