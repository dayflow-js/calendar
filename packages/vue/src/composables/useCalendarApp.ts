import { onUnmounted, reactive } from 'vue';
import {
  CalendarApp,
  CalendarAppConfig,
  UseCalendarAppReturn,
} from '@dayflow/core';

export function useCalendarApp(
  config: CalendarAppConfig
): UseCalendarAppReturn {
  const app = new CalendarApp(config);

  // Use reactive state to trigger Vue re-renders
  const state = reactive({
    currentView: app.state.currentView,
    currentDate: app.state.currentDate,
    events: app.getEvents(),
  });

  const unsubscribe = app.subscribe(updatedApp => {
    state.currentView = updatedApp.state.currentView;
    state.currentDate = updatedApp.state.currentDate;
    state.events = updatedApp.getEvents();
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return {
    app,
    // Use computed or simple reactive access
    get currentView() {
      return state.currentView;
    },
    get currentDate() {
      return state.currentDate;
    },
    get events() {
      return state.events;
    },

    // Bind methods to app
    applyEventsChanges: app.applyEventsChanges.bind(app),
    changeView: app.changeView.bind(app),
    setCurrentDate: app.setCurrentDate.bind(app),
    addEvent: app.addEvent.bind(app),
    updateEvent: app.updateEvent.bind(app),
    deleteEvent: app.deleteEvent.bind(app),
    undo: app.undo.bind(app),
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
    emitVisibleRange: app.emitVisibleRange.bind(app),
    get readOnlyConfig() {
      return app.getReadOnlyConfig();
    },
  } as UseCalendarAppReturn;
}
