import { h } from 'preact';
import { Temporal } from 'temporal-polyfill';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '../../common/Icons';

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
}: CalendarHeaderProps & any) => {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onYearChange(-1)}
          className="rounded-md px-2 py-1 text-slate-400 dark:text-gray-400 transition hover:text-slate-600 dark:hover:text-gray-200 disabled:opacity-40"
        >
          <ChevronsLeft width={14} height={12} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMonthChange(-1)}
          className="rounded-md px-2 py-1 text-slate-400 dark:text-gray-400 transition hover:text-slate-600 dark:hover:text-gray-200 disabled:opacity-40"
        >
          <ChevronLeft width={14} height={12} />
        </button>
      </div>
      <div className="text-sm font-semibold text-slate-700 dark:text-gray-300">
        {monthLabels[visibleMonth.month - 1]} {visibleMonth.year}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMonthChange(1)}
          className="rounded-md px-2 py-1 text-slate-400 dark:text-gray-400 transition hover:text-slate-600 dark:hover:text-gray-200 disabled:opacity-40"
        >
          <ChevronRight width={14} height={12} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onYearChange(1)}
          className="rounded-md px-2 py-1 text-slate-400 dark:text-gray-400 transition hover:text-slate-600 dark:hover:text-gray-200 disabled:opacity-40"
        >
          <ChevronsRight width={14} height={12} />
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
