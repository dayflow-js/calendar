import DayFlowCalendar from './DayFlowCalendar';
export { DayFlowCalendar };
export { useCalendarApp } from './composables/useCalendarApp';
export default DayFlowCalendar;

// Re-export core parts for convenience
export {
  CalendarApp,
  CalendarRegistry,
  createDragPlugin,
  createEventsPlugin,
  createDayView,
  createWeekView,
  createMonthView,
  createYearView,
  ViewType,
} from '@dayflow/core';

export * from '@dayflow/core';
