import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@ui-range-picker/icons';
import { Temporal } from 'temporal-polyfill';

interface CalendarHeaderProps {
  visibleMonth: Temporal.PlainDate;
  monthLabels: string[];
  disabled?: boolean;
  onMonthChange: (months: number) => void;
  onYearChange: (years: number) => void;
}

const CalendarHeader = ({
  visibleMonth,
  monthLabels,
  disabled,
  onMonthChange,
  onYearChange,
}: CalendarHeaderProps) => (
  <div className='df-range-picker__calendar-header'>
    <div className='df-range-picker__calendar-nav-group'>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onYearChange(-1)}
        className='df-range-picker__calendar-nav-button'
      >
        <ChevronsLeft width={14} height={12} />
      </button>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onMonthChange(-1)}
        className='df-range-picker__calendar-nav-button'
      >
        <ChevronLeft width={14} height={12} />
      </button>
    </div>
    <div className='df-range-picker__calendar-title'>
      {monthLabels[visibleMonth.month - 1]} {visibleMonth.year}
    </div>
    <div className='df-range-picker__calendar-nav-group'>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onMonthChange(1)}
        className='df-range-picker__calendar-nav-button'
      >
        <ChevronRight width={14} height={12} />
      </button>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onYearChange(1)}
        className='df-range-picker__calendar-nav-button'
      >
        <ChevronsRight width={14} height={12} />
      </button>
    </div>
  </div>
);

export default CalendarHeader;
