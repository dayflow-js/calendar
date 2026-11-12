import type { ZonedRange } from '@ui-range-picker/types';
import type { RangePickerLabels } from '@ui-range-picker/utils/labels';
import type { RefObject, JSX } from 'preact';
import { Temporal } from 'temporal-polyfill';

import CalendarGrid from './CalendarGrid';
import CalendarHeader from './CalendarHeader';
import TimeSelector from './TimeSelector';

interface RangePickerPanelProps {
  visibleMonth: Temporal.PlainDate;
  monthLabels: string[];
  weekDayLabels: string[];
  calendarDays: Temporal.PlainDate[];
  draftRange: ZonedRange;
  minDate?: Temporal.PlainDate;
  maxDate?: Temporal.PlainDate;
  focusedField: 'start' | 'end';
  isTimeEnabled: boolean;
  disabled?: boolean;
  timeFormat?: string;
  matchTriggerWidth?: boolean;
  labels: RangePickerLabels;
  popupRef: RefObject<HTMLDivElement>;
  timeListRefs: RefObject<{
    start: { hour: HTMLDivElement | null; minute: HTMLDivElement | null };
    end: { hour: HTMLDivElement | null; minute: HTMLDivElement | null };
  }>;
  onMonthChange: (months: number) => void;
  onYearChange: (years: number) => void;
  onDaySelect: (day: Temporal.PlainDate) => void;
  onHourSelect: (field: 'start' | 'end', hour: number) => void;
  onMinuteSelect: (field: 'start' | 'end', minute: number) => void;
  onOk: () => void;
  getPopupStyle: () => JSX.CSSProperties;
}

const RangePickerPanel = ({
  visibleMonth,
  monthLabels,
  weekDayLabels,
  calendarDays,
  draftRange,
  minDate,
  maxDate,
  focusedField,
  isTimeEnabled,
  disabled,
  timeFormat,
  matchTriggerWidth,
  labels,
  popupRef,
  timeListRefs,
  onMonthChange,
  onYearChange,
  onDaySelect,
  onHourSelect,
  onMinuteSelect,
  onOk,
  getPopupStyle,
}: RangePickerPanelProps) => {
  const startDate = draftRange[0].toPlainDate();
  const endDate = draftRange[1].toPlainDate();

  return (
    <div
      ref={popupRef}
      className='df-range-picker df-range-picker-popup'
      style={getPopupStyle()}
      data-range-picker-popup='true'
    >
      <div
        className='df-range-picker-panel'
        style={
          {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            width: matchTriggerWidth ? '100%' : undefined,
          } as JSX.CSSProperties
        }
      >
        <div className='df-range-picker-panel-body'>
          <div className='df-range-picker-calendar-pane'>
            <CalendarHeader
              visibleMonth={visibleMonth}
              monthLabels={monthLabels}
              disabled={disabled}
              labels={labels}
              onMonthChange={onMonthChange}
              onYearChange={onYearChange}
            />
            <CalendarGrid
              calendarDays={calendarDays}
              visibleMonth={visibleMonth}
              startDate={startDate}
              endDate={endDate}
              weekDayLabels={weekDayLabels}
              minDate={minDate}
              maxDate={maxDate}
              disabled={disabled}
              onDaySelect={onDaySelect}
            />
          </div>

          {isTimeEnabled && (
            <div className='df-range-picker-time-pane'>
              <TimeSelector
                focusedField={focusedField}
                draftRange={draftRange}
                disabled={disabled}
                timeFormat={timeFormat}
                labels={labels}
                onHourSelect={onHourSelect}
                onMinuteSelect={onMinuteSelect}
                timeListRefs={timeListRefs}
              />
            </div>
          )}
        </div>

        <div className='df-range-picker-footer'>
          <button
            type='button'
            onClick={onOk}
            disabled={disabled}
            className='df-range-picker-confirm-button'
          >
            {labels.ok}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RangePickerPanel;
