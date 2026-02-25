import { Temporal } from 'temporal-polyfill';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@/components/common/Icons';

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
  <div className='flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:border-gray-600 dark:text-gray-300'>
    <div className='flex items-center gap-1'>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onYearChange(-1)}
        className='rounded-md px-2 py-1 text-slate-400 transition hover:text-slate-600 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200'
      >
        <ChevronsLeft width={14} height={12} />
      </button>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onMonthChange(-1)}
        className='rounded-md px-2 py-1 text-slate-400 transition hover:text-slate-600 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200'
      >
        <ChevronLeft width={14} height={12} />
      </button>
    </div>
    <div className='text-sm font-semibold text-slate-700 dark:text-gray-300'>
      {monthLabels[visibleMonth.month - 1]} {visibleMonth.year}
    </div>
    <div className='flex items-center gap-1'>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onMonthChange(1)}
        className='rounded-md px-2 py-1 text-slate-400 transition hover:text-slate-600 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200'
      >
        <ChevronRight width={14} height={12} />
      </button>
      <button
        type='button'
        disabled={disabled}
        onClick={() => onYearChange(1)}
        className='rounded-md px-2 py-1 text-slate-400 transition hover:text-slate-600 disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200'
      >
        <ChevronsRight width={14} height={12} />
      </button>
    </div>
  </div>
);

export default CalendarHeader;
