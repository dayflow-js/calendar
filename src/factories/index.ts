// View factory module export file
export * from './createDayView';
export * from './createWeekView';
export * from './createMonthView';
export * from './createYearView';

// Import for internal use
import { createDayView, dayViewPresets } from './createDayView';

import { createWeekView, weekViewPresets } from './createWeekView';

import { createMonthView, monthViewPresets } from './createMonthView';

// Re-export types from @/types for convenience
export type {
  BaseViewProps,
  DayViewProps,
  WeekViewProps,
  MonthViewProps,
  ViewFactoryConfig,
  DayViewConfig,
  WeekViewConfig,
  MonthViewConfig,
  ViewFactory,
  ViewAdapterProps,
} from '@/types';

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

// Preset view configuration package
export const viewPresets = {
  // Standard configuration
  standard: () => createStandardViews(),

  // Business scenario configuration
  business: () => [
    dayViewPresets.workHours(),
    weekViewPresets.workdays(),
    monthViewPresets.compact(),
  ],

  // Read-only configuration
  readOnly: () => [
    dayViewPresets.readOnly(),
    weekViewPresets.readOnly(),
    monthViewPresets.readOnly(),
  ],

  // Compact configuration
  compact: () => [
    dayViewPresets.compact(),
    weekViewPresets.compact(),
    monthViewPresets.compact(),
  ],

  // High density configuration
  dense: () => [
    dayViewPresets.dense(),
    weekViewPresets.dense(),
    monthViewPresets.dense(),
  ],
};
