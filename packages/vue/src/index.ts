import DayFlowCalendarComponent from './DayFlowCalendar';
export { DayFlowCalendarComponent as DayFlowCalendar };
export type { DayFlowCalendarSlots } from './DayFlowCalendar';
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
  createAgendaView,
  createYearView,
  ViewType,
} from '@dayflow/core';

export * from '@dayflow/core';
