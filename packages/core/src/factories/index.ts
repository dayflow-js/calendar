// View factory module export file
export * from './createDayView';
export * from './createWeekView';
export * from './createMonthView';
export * from './createYearView';

// Import for internal use
import { createDayView } from './createDayView';
import { createMonthView } from './createMonthView';
import { createWeekView } from './createWeekView';

// Convenient view creation function
export function createStandardViews(config?: {
  day?: Partial<import('@/types').DayViewConfig>;
  week?: Partial<import('@/types').WeekViewConfig>;
  month?: Partial<import('@/types').MonthViewConfig>;
}) {
  return [
    createDayView(config?.day),
    createWeekView(config?.week),
    createMonthView(config?.month),
  ];
}
