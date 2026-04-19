import { HOURS, MINUTES } from '@ui-range-picker/constants';
import { ZonedRange } from '@ui-range-picker/types';
import { pad } from '@ui-range-picker/utils/rangePicker';
import { h, RefObject } from 'preact';

const scrollbarHide = 'df-scrollbar-hide';

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
    : [...MINUTES, currentMinute].toSorted((a, b) => a - b);

  return (
    <div className='df-range-picker-time-selector'>
      <div className='df-range-picker-time-selector-header'>
        <div className='df-range-picker-time-selector-value'>
          {current.hour.toString().padStart(2, '0')}:
          {current.minute.toString().padStart(2, '0')}
        </div>
      </div>

      <div className='df-range-picker-time-selector-body'>
        <div className='df-range-picker-time-selector-column'>
          <div
            className={`df-range-picker-time-list ${scrollbarHide}`}
            role='listbox'
            aria-label='Hour'
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
                  type='button'
                  role='option'
                  aria-selected={isActive}
                  disabled={disabled}
                  onClick={() => onHourSelect(field, hour)}
                  className='df-range-picker-time-option'
                  data-active={isActive ? 'true' : undefined}
                >
                  {pad(hour)}
                </button>
              );
            })}
          </div>
        </div>
        <div className='df-range-picker-time-selector-column'>
          <div
            className={`df-range-picker-time-list ${scrollbarHide}`}
            role='listbox'
            aria-label='Minute'
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
                  type='button'
                  role='option'
                  aria-selected={isActive}
                  disabled={disabled}
                  onClick={() => onMinuteSelect(field, minute)}
                  className='df-range-picker-time-option'
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
