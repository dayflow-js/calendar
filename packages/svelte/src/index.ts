import DayFlowCalendar from './DayFlowCalendar.svelte';
export { DayFlowCalendar };
export { useCalendarApp } from './useCalendarApp';
export default DayFlowCalendar;

export {
  CalendarApp,
  CalendarRegistry,
  createEventsPlugin,
  createDayView,
  createWeekView,
  createMonthView,
  createYearView,
  ViewType,
} from '@dayflow/core';

export * from '@dayflow/core';
