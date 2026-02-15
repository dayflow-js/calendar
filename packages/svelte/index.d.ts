declare module "@dayflow/svelte" {
    import { SvelteComponent } from "svelte";
    import { 
        CalendarApp, 
        CalendarAppConfig, 
        UseCalendarAppReturn,
        CalendarRegistry,
        createDragPlugin,
        createEventsPlugin,
        createDayView,
        createWeekView,
        createMonthView,
        createYearView,
        ViewType
    } from "@dayflow/core";

    /**
     * Svelte store based hook for DayFlow
     */
    export function useCalendarApp(config: CalendarAppConfig): UseCalendarAppReturn;

    /**
     * DayFlow Calendar Svelte Component
     */
    export class DayFlowCalendar extends SvelteComponent<any, any, any> {}

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
    };

    export default DayFlowCalendar;
}
