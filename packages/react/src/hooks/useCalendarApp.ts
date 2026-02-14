import { useState, useEffect, useMemo } from 'react';
import {
  CalendarApp,
  CalendarAppConfig,
  UseCalendarAppReturn,
} from '@dayflow/core';

export function useCalendarApp(
  config: CalendarAppConfig
): UseCalendarAppReturn {
  // Use useMemo to ensure app is only created once
  const app = useMemo(() => new CalendarApp(config), []);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!app) return;
    // Subscribe to state changes to trigger React re-renders
    const unsubscribe = app.subscribe(() => {
      setTick((tick: number) => tick + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [app]);

  // Sync config changes to the app instance
  useEffect(() => {
    if (app) {
      app.updateConfig(config);
    }
  }, [app, config]);

  // Map app to the UseCalendarAppReturn interface
  // (In a real implementation, we might want a more comprehensive mapping)
  return {
    app,
    currentView: app.state.currentView,
    currentDate: app.state.currentDate,
    events: app.getEvents(),
    applyEventsChanges: app.applyEventsChanges,
    changeView: app.changeView,
    setCurrentDate: app.setCurrentDate,
    addEvent: app.addEvent,
    updateEvent: app.updateEvent,
    deleteEvent: app.deleteEvent,
    undo: app.undo,
    goToToday: app.goToToday,
    goToPrevious: app.goToPrevious,
    goToNext: app.goToNext,
    selectDate: app.selectDate,
    getCalendars: app.getCalendars,
    createCalendar: app.createCalendar,
    mergeCalendars: app.mergeCalendars,
    setCalendarVisibility: app.setCalendarVisibility,
    setAllCalendarsVisibility: app.setAllCalendarsVisibility,
    getAllEvents: app.getAllEvents,
    highlightEvent: app.highlightEvent,
    setVisibleMonth: app.setVisibleMonth,
    getVisibleMonth: app.getVisibleMonth,
    sidebarConfig: app.getSidebarConfig(),
    readOnlyConfig: app.getReadOnlyConfig(),
  };
}
