import { Temporal } from 'temporal-polyfill';

export const compareDates = (
  a: Temporal.PlainDate,
  b: Temporal.PlainDate
): number => Temporal.PlainDate.compare(a, b);
