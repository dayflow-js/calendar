import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@ui-range-picker/icons';
import type { RangePickerLabels } from '@ui-range-picker/utils/labels';
import { Temporal } from 'temporal-polyfill';

interface CalendarHeaderProps {
  visibleMonth: Temporal.PlainDate;
  monthLabels: string[];
  disabled?: boolean;
  labels: RangePickerLabels;
  onMonthChange: (months: number) => void;
  onYearChange: (years: number) => void;
}

const CalendarHeader = ({
  visibleMonth,
  monthLabels,
  disabled,
  labels,
  onMonthChange,
  onYearChange,
}: CalendarHeaderProps) => (
  <div className='df-range-picker-calendar-header'>
    <div className='df-range-picker-calendar-nav-group'>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onYearChange(-1)}
        className='df-range-picker-calendar-nav-button'
        aria-label={labels.previousYear}
      >
        <ChevronsLeft width={14} height={12} />
      </button>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onMonthChange(-1)}
        className='df-range-picker-calendar-nav-button'
        aria-label={labels.previousMonth}
      >
        <ChevronLeft width={14} height={12} />
      </button>
    </div>
    <div className='df-range-picker-calendar-title'>
      {monthLabels[visibleMonth.month - 1]} {visibleMonth.year}
    </div>
    <div className='df-range-picker-calendar-nav-group'>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onMonthChange(1)}
        className='df-range-picker-calendar-nav-button'
        aria-label={labels.nextMonth}
      >
        <ChevronRight width={14} height={12} />
      </button>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onYearChange(1)}
        className='df-range-picker-calendar-nav-button'
        aria-label={labels.nextYear}
      >
        <ChevronsRight width={14} height={12} />
      </button>
    </div>
  </div>
);

export default CalendarHeader;
