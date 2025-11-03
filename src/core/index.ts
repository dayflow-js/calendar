// Core module export file
export * from './useCalendarApp';
export * from './config';
export * from './DayFlowCalendar';

export { CalendarApp } from './CalendarApp';

// Re-export types from @/types for convenience
export { ViewType } from '@/types';

export type {
  CalendarPlugin,
  CalendarView,
  CalendarCallbacks,
  CalendarAppConfig,
  CalendarAppState,
  CalendarApp as ICalendarApp,
  UseCalendarAppReturn,
  CalendarConfig,
} from '@/types';
