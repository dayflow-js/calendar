import { Temporal } from 'temporal-polyfill';

import { Locale } from '@/locale/types';

export type ZonedRange = [Temporal.ZonedDateTime, Temporal.ZonedDateTime];

export interface RangePickerProps {
  value: [
    Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
    Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  ];
  format?: string;
  showTimeFormat?: string;
  showTime?: boolean | { format?: string };
  onChange?: (value: ZonedRange, dateString: [string, string]) => void;
  onOk?: (value: ZonedRange, dateString: [string, string]) => void;
  timeZone?: string;
  disabled?: boolean;
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  autoAdjustOverflow?: boolean;
  getPopupContainer?: () => HTMLElement;
  matchTriggerWidth?: boolean;
  locale?: string | Locale;
}
