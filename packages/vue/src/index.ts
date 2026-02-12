export * from './DayFlowCalendar';
import DayFlowCalendar from './DayFlowCalendar';
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
  ViewType
} from '@dayflow/core';
export * from '@dayflow/core';
