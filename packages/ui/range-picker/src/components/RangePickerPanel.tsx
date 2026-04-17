import { ZonedRange } from '@ui-range-picker/types';
import { RefObject, JSX } from 'preact';
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
  focusedField: 'start' | 'end';
  isTimeEnabled: boolean;
  disabled?: boolean;
  matchTriggerWidth?: boolean;
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
  focusedField,
  isTimeEnabled,
  disabled,
  matchTriggerWidth,
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
      className='df-range-picker df-range-picker__popup'
      style={getPopupStyle()}
      data-range-picker-popup='true'
    >
      <div
        className='df-range-picker__panel'
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          width: matchTriggerWidth ? '100%' : undefined,
        }}
      >
        <div className='df-range-picker__panel-body'>
          <div className='df-range-picker__calendar-pane'>
            <CalendarHeader
              visibleMonth={visibleMonth}
              monthLabels={monthLabels}
              disabled={disabled}
              onMonthChange={onMonthChange}
              onYearChange={onYearChange}
            />
            <CalendarGrid
              calendarDays={calendarDays}
              visibleMonth={visibleMonth}
              startDate={startDate}
              endDate={endDate}
              weekDayLabels={weekDayLabels}
              disabled={disabled}
              onDaySelect={onDaySelect}
            />
          </div>

          {isTimeEnabled && (
            <div className='df-range-picker__time-pane'>
              <TimeSelector
                focusedField={focusedField}
                draftRange={draftRange}
                disabled={disabled}
                onHourSelect={onHourSelect}
                onMinuteSelect={onMinuteSelect}
                timeListRefs={timeListRefs}
              />
            </div>
          )}
        </div>

        <div className='df-range-picker__footer'>
          <button
            type='button'
            onClick={onOk}
            disabled={disabled}
            className='df-range-picker__confirm-button'
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default RangePickerPanel;
