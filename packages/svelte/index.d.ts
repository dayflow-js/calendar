declare module '@dayflow/svelte' {
  import type { CalendarAppConfig, UseCalendarAppReturn } from '@dayflow/core';
  import {
    CalendarApp,
    CalendarRegistry,
    createEventsPlugin,
    createDayView,
    createWeekView,
    createMonthView,
    createYearView,
    ViewType,
  } from '@dayflow/core';
  import { SvelteComponent } from 'svelte';

  /**
   * Svelte store based hook for DayFlow
   */
  export function useCalendarApp(
    config: CalendarAppConfig
  ): UseCalendarAppReturn;

  /**
   * DayFlow Calendar Svelte Component
   */
  export class DayFlowCalendar extends SvelteComponent<
    unknown,
    unknown,
    unknown
  > {}

  export {
    CalendarApp,
    CalendarRegistry,
    createEventsPlugin,
    createDayView,
    createWeekView,
    createMonthView,
    createYearView,
    ViewType,
  };

  export default DayFlowCalendar;
}
