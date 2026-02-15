import { h, RefObject } from 'preact';
import { Temporal } from 'temporal-polyfill';
import { pad } from '../../../utils/rangePicker';
import { ZonedRange } from '../types';
import { HOURS, MINUTES } from '../constants';
import { scrollbarHide } from '@/styles/classNames';

interface TimeSelectorProps {
  focusedField: 'start' | 'end';
  draftRange: ZonedRange;
  disabled?: boolean;
  onHourSelect: (field: 'start' | 'end', hour: number) => void;
  onMinuteSelect: (field: 'start' | 'end', minute: number) => void;
  timeListRefs: RefObject<{
    start: { hour: HTMLDivElement | null; minute: HTMLDivElement | null };
    end: { hour: HTMLDivElement | null; minute: HTMLDivElement | null };
  }>;
}

const TimeSelector = ({
  focusedField,
  draftRange,
  disabled,
  onHourSelect,
  onMinuteSelect,
  timeListRefs,
}: TimeSelectorProps) => {
  const field = focusedField;
  const index = field === 'start' ? 0 : 1;
  const current = draftRange[index];
  const currentMinute = current.minute;
  const minuteOptions = MINUTES.includes(currentMinute)
    ? MINUTES
    : [...MINUTES, currentMinute].sort((a, b) => a - b);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm sm:w-28">
      <div className="flex border-b border-slate-100 dark:border-gray-600 justify-center">
        <div className="text-base py-1.5 text-slate-700 dark:text-gray-300">
          {current.hour.toString().padStart(2, '0')}:
          {current.minute.toString().padStart(2, '0')}
        </div>
      </div>

      {/* Hour and Minute Selectors */}
      <div className="flex p-1">
        <div className="w-14">
          <div
            className={`h-72 overflow-y-auto ${scrollbarHide} rounded-md border border-slate-100 dark:border-gray-600 bg-white dark:bg-gray-700`}
            role="listbox"
            aria-label="Hour"
            ref={element => {
              if (timeListRefs.current && timeListRefs.current[field]) {
                timeListRefs.current[field].hour = element;
              }
            }}
          >
            {HOURS.map(hour => {
              const isActive = hour === current.hour;
              return (
                <button
                  key={hour}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={disabled}
                  onClick={() => onHourSelect(field, hour)}
                  className={`flex h-8 w-full items-center justify-center text-sm transition ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary'
                  }`}
                  data-active={isActive ? 'true' : undefined}
                >
                  {pad(hour)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="w-14">
          <div
            className={`h-72 overflow-y-auto ${scrollbarHide} rounded-md border border-slate-100 dark:border-gray-600 bg-white dark:bg-gray-700`}
            role="listbox"
            aria-label="Minute"
            ref={element => {
              if (timeListRefs.current && timeListRefs.current[field]) {
                timeListRefs.current[field].minute = element;
              }
            }}
          >
            {minuteOptions.map(minute => {
              const isActive = minute === currentMinute;
              return (
                <button
                  key={minute}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={disabled}
                  onClick={() => onMinuteSelect(field, minute)}
                  className={`flex h-8 w-full items-center justify-center text-sm transition ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary'
                  }`}
                  data-active={isActive ? 'true' : undefined}
                >
                  {pad(minute)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSelector;
