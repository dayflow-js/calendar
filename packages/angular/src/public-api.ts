/*
 * Public API Surface of @dayflow/angular
 */

export * from './lib/day-flow-calendar.component';
export * from './lib/day-flow-calendar.module';
export * from './lib/day-flow-portal.directive';

export {
  CalendarApp,
  CalendarRegistry,
  createDragPlugin,
  createEventsPlugin,
  createDayView,
  createWeekView,
  createMonthView,
  createYearView,
  ViewType
} from '@dayflow/core';

export * from '@dayflow/core';
