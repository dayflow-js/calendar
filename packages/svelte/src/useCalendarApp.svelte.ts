import {
  CalendarApp,
  createConfigSyncSnapshot,
  createNormalizedCalendarAppConfigGetter,
  syncCalendarAppConfig,
} from '@dayflow/core';
import type { CalendarAppConfig, UseCalendarAppReturn } from '@dayflow/core';
import { onDestroy } from 'svelte';

/**
 * Pass a getter (`() => ({ ... })`) or a `$state` object to have later config
 * changes synced onto the app. A plain object is read once.
 */
export function useCalendarApp(
  config: CalendarAppConfig | (() => CalendarAppConfig)
): UseCalendarAppReturn {
  const getConfig = typeof config === 'function' ? config : () => config;
  const getNormalizedConfig =
    createNormalizedCalendarAppConfigGetter(getConfig);

  const app = new CalendarApp(getNormalizedConfig());
  let syncSnapshot = createConfigSyncSnapshot(getNormalizedConfig());

  // The parts of app state that should be reactive in Svelte templates.
  let state = $state.raw({
    currentView: app.state.currentView,
    currentDate: app.state.currentDate,
    events: app.getEvents(),
  });

  const unsubscribe = app.subscribe(() => {
    state = {
      currentView: app.state.currentView,
      currentDate: app.state.currentDate,
      events: app.getEvents(),
    };
  });

  // Re-runs whenever reactive state read by the config changes.
  $effect(() => {
    syncSnapshot = syncCalendarAppConfig(
      app,
      syncSnapshot,
      getNormalizedConfig()
    );
  });

  onDestroy(() => {
    unsubscribe();
    app.destroy();
  });

  // Proxy the state properties
  const result = {
    get app() {
      return app;
    },
    get currentView() {
      return state.currentView;
    },
    get currentDate() {
      return state.currentDate;
    },
    get events() {
      return state.events;
    },

    applyEventsChanges: (...args: Parameters<typeof app.applyEventsChanges>) =>
      app.applyEventsChanges(...args),
    changeView: (...args: Parameters<typeof app.changeView>) =>
      app.changeView(...args),
    setCurrentDate: (...args: Parameters<typeof app.setCurrentDate>) =>
      app.setCurrentDate(...args),
    addEvent: (...args: Parameters<typeof app.addEvent>) =>
      app.addEvent(...args),
    updateEvent: (...args: Parameters<typeof app.updateEvent>) =>
      app.updateEvent(...args),
    deleteEvent: (...args: Parameters<typeof app.deleteEvent>) =>
      app.deleteEvent(...args),
    undo: () => app.undo(),
    goToToday: () => app.goToToday(),
    goToPrevious: () => app.goToPrevious(),
    goToNext: () => app.goToNext(),
    selectDate: (...args: Parameters<typeof app.selectDate>) =>
      app.selectDate(...args),
    getCalendars: () => app.getCalendars(),
    createCalendar: (...args: Parameters<typeof app.createCalendar>) =>
      app.createCalendar(...args),
    mergeCalendars: (...args: Parameters<typeof app.mergeCalendars>) =>
      app.mergeCalendars(...args),
    setCalendarVisibility: (
      ...args: Parameters<typeof app.setCalendarVisibility>
    ) => app.setCalendarVisibility(...args),
    setAllCalendarsVisibility: (
      ...args: Parameters<typeof app.setAllCalendarsVisibility>
    ) => app.setAllCalendarsVisibility(...args),
    getAllEvents: () => app.getAllEvents(),
    highlightEvent: (...args: Parameters<typeof app.highlightEvent>) =>
      app.highlightEvent(...args),
    setVisibleMonth: (...args: Parameters<typeof app.setVisibleMonth>) =>
      app.setVisibleMonth(...args),
    getVisibleMonth: () => app.getVisibleMonth(),
    emitVisibleRange: (...args: Parameters<typeof app.emitVisibleRange>) =>
      app.emitVisibleRange(...args),
    canMutateFromUI: (...args: Parameters<typeof app.canMutateFromUI>) =>
      app.canMutateFromUI(...args),
    get readOnlyConfig() {
      return app.getReadOnlyConfig();
    },
  } as unknown as UseCalendarAppReturn;

  return result;
}
