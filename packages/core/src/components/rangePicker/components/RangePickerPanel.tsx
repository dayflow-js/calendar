import { h } from 'preact';
import { RefObject } from 'preact';
import { Temporal } from 'temporal-polyfill';
import { ZonedRange } from '../types';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
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
  // popupPlacement: string; // Not used in render, but used in parent for style
  popupRef: any;
  timeListRefs: RefObject<any>;
  onMonthChange: (months: number) => void;
  onYearChange: (years: number) => void;
  onDaySelect: (day: Temporal.PlainDate) => void;
  onHourSelect: (field: 'start' | 'end', hour: number) => void;
  onMinuteSelect: (field: 'start' | 'end', minute: number) => void;
  onOk: () => void;
  getPopupStyle: () => any;
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
      style={getPopupStyle()}
      data-range-picker-popup="true"
    >
      <div
        className="space-y-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3"
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          width: matchTriggerWidth ? '100%' : undefined,
        }}
      >
        <div className="flex gap-1">
          <div className="flex-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm w-full">
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
            <div className="flex flex-1 justify-end sm:w-32">
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

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onOk}
            disabled={disabled}
            className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default RangePickerPanel;
