import type { Locale } from '@ui-range-picker/types';

const DEFAULT_LABELS = {
  previousYear: 'Previous year',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  nextYear: 'Next year',
  startDate: 'Start date',
  endDate: 'End date',
  hour: 'Hour',
  minute: 'Minute',
  ok: 'OK',
};

export type RangePickerLabels = typeof DEFAULT_LABELS;

/** Read UI labels from `locale.messages`, falling back to English. */
export const resolveLabels = (locale?: string | Locale): RangePickerLabels => {
  const messages = typeof locale === 'object' ? locale.messages : undefined;
  if (!messages) return DEFAULT_LABELS;
  const labels = { ...DEFAULT_LABELS };
  for (const key of Object.keys(labels) as (keyof RangePickerLabels)[]) {
    if (messages[key]) labels[key] = messages[key];
  }
  return labels;
};
