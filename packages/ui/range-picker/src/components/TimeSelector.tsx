import { HOURS, MINUTES } from '@ui-range-picker/constants';
import type { ZonedRange } from '@ui-range-picker/types';
import type { RangePickerLabels } from '@ui-range-picker/utils/labels';
import { pad } from '@ui-range-picker/utils/rangePicker';
import type { RefObject } from 'preact';

const scrollbarHide = 'df-scrollbar-hide';

interface TimeSelectorProps {
  focusedField: 'start' | 'end';
  draftRange: ZonedRange;
  disabled?: boolean;
  timeFormat?: string;
  labels: RangePickerLabels;
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
  timeFormat,
  labels,
  onHourSelect,
  onMinuteSelect,
  timeListRefs,
}: TimeSelectorProps) => {
  const is12Hour = timeFormat === '12h' || /[haA]/.test(timeFormat ?? '');
  const field = focusedField;
  const index = field === 'start' ? 0 : 1;
  const current = draftRange[index];
  const currentHour = current.hour;
  const currentMinute = current.minute;
  const minuteOptions = MINUTES.includes(currentMinute)
    ? MINUTES
    : [...MINUTES, currentMinute].toSorted((a, b) => a - b);

  const displayPeriod = currentHour >= 12 ? 'pm' : 'am';
  const display12Hour = currentHour % 12 || 12;

  const headerText = is12Hour ? (
    <>
      <span>
        {pad(display12Hour)}:{pad(currentMinute)}
      </span>
      <span className='df-range-picker-time-unit'>{displayPeriod}</span>
    </>
  ) : (
    `${pad(currentHour)}:${pad(currentMinute)}`
  );

  return (
    <div
      className='df-range-picker-time-selector'
      data-is-12h={String(is12Hour)}
    >
      <div className='df-range-picker-time-selector-header'>
        <div className='df-range-picker-time-selector-value'>{headerText}</div>
      </div>

      <div className='df-range-picker-time-selector-body'>
        <div
          className='df-range-picker-time-selector-column'
          data-is-12h={String(is12Hour)}
        >
          <div
            className={`df-range-picker-time-list ${scrollbarHide}`}
            role='listbox'
            aria-label={labels.hour}
            ref={element => {
              if (timeListRefs.current && timeListRefs.current[field]) {
                timeListRefs.current[field].hour = element;
              }
            }}
          >
            {HOURS.map((hour: number) => {
              const isActive = hour === currentHour;
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
                  {is12Hour ? (
                    <>
                      <span>{pad(hour % 12 || 12)}</span>
                      <span className='df-range-picker-time-unit'>
                        {hour >= 12 ? 'pm' : 'am'}
                      </span>
                    </>
                  ) : (
                    pad(hour)
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className='df-range-picker-time-selector-column'
          data-is-12h={String(is12Hour)}
        >
          <div
            className={`df-range-picker-time-list ${scrollbarHide}`}
            role='listbox'
            aria-label={labels.minute}
            ref={element => {
              if (timeListRefs.current && timeListRefs.current[field]) {
                timeListRefs.current[field].minute = element;
              }
            }}
          >
            {minuteOptions.map((minute: number) => {
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
