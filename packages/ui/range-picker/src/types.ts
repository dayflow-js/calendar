import { Temporal } from 'temporal-polyfill';

export type ZonedRange = [Temporal.ZonedDateTime, Temporal.ZonedDateTime];

export interface Locale {
  code: string;
  messages?: Record<string, string>;
}

export interface RangePickerProps {
  value: [
    Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
    Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  ];
  minDate?:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime;
  maxDate?:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTime;
  format?: string;
  showTimeFormat?: string;
  showTime?: boolean | { format?: string };
  onChange?: (value: ZonedRange, dateString: [string, string]) => void;
  onOk?: (value: ZonedRange, dateString: [string, string]) => void;
  timeZone?: string;
  startOfWeek?: number;
  disabled?: boolean;
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  autoAdjustOverflow?: boolean;
  getPopupContainer?: () => HTMLElement;
  matchTriggerWidth?: boolean;
  locale?: string | Locale;
  /**
   * `'single'` shows one field for a single date/time. `onChange` and `onOk`
   * still receive a tuple, with both entries set to the chosen value.
   */
  mode?: 'range' | 'single';
  /** Display/edit calendar; returned Temporal values retain ISO calendar fields. */
  calendarSystem?: 'gregorian' | 'jalali';
}
