import DayFlowCalendarComponent from './DayFlowCalendar';
export { DayFlowCalendarComponent as DayFlowCalendar };
export { useCalendarApp } from './composables/useCalendarApp';
export default DayFlowCalendarComponent;

// Re-export core parts for convenience
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
