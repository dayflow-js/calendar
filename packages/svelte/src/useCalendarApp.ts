import { writable, type Writable } from 'svelte/store';
import { 
  CalendarApp, 
  type CalendarAppConfig, 
  type UseCalendarAppReturn,
  type ICalendarApp
} from '@dayflow/core';

export function useCalendarApp(config: CalendarAppConfig): UseCalendarAppReturn {
  const app = new CalendarApp(config);
  
  // Create a store for the parts of state we want to be reactive in Svelte
  const stateStore = writable({
    currentView: app.state.currentView,
    currentDate: app.state.currentDate,
    events: app.getEvents(),
  });

  const unsubscribe = app.subscribe((updatedApp) => {
    stateStore.set({
      currentView: updatedApp.state.currentView,
      currentDate: updatedApp.state.currentDate,
      events: updatedApp.getEvents(),
    });
  });

  // Proxy the state properties
  const result = {
    app,
    get currentView() { 
      let val;
      stateStore.subscribe(s => val = s.currentView)();
      return val;
    },
    get currentDate() {
      let val;
      stateStore.subscribe(s => val = s.currentDate)();
      return val;
    },
    get events() {
      let val;
      stateStore.subscribe(s => val = s.events)();
      return val;
    },
    
    changeView: app.changeView.bind(app),
    setCurrentDate: app.setCurrentDate.bind(app),
    addEvent: app.addEvent.bind(app),
    updateEvent: app.updateEvent.bind(app),
    deleteEvent: app.deleteEvent.bind(app),
    goToToday: app.goToToday.bind(app),
    goToPrevious: app.goToPrevious.bind(app),
    goToNext: app.goToNext.bind(app),
    selectDate: app.selectDate.bind(app),
    getCalendars: app.getCalendars.bind(app),
    createCalendar: app.createCalendar.bind(app),
    mergeCalendars: app.mergeCalendars.bind(app),
    setCalendarVisibility: app.setCalendarVisibility.bind(app),
    setAllCalendarsVisibility: app.setAllCalendarsVisibility.bind(app),
    getAllEvents: app.getAllEvents.bind(app),
    highlightEvent: app.highlightEvent.bind(app),
    setVisibleMonth: app.setVisibleMonth.bind(app),
    getVisibleMonth: app.getVisibleMonth.bind(app),
    get sidebarConfig() { return app.getSidebarConfig() },
    get readOnlyConfig() { return app.getReadOnlyConfig() },
  } as unknown as UseCalendarAppReturn;

  return result;
}
