import type { CalendarAppConfig, UseCalendarAppReturn } from '@dayflow/core';
import {
  CalendarApp,
  createConfigSyncSnapshot,
  createNormalizedCalendarAppConfigGetter,
  syncCalendarAppConfig,
} from '@dayflow/core';
import { useState, useEffect, useMemo, useRef } from 'react';

export function useCalendarApp(
  config: CalendarAppConfig,
  version?: string | number
): UseCalendarAppReturn {
  const configRef = useRef(config);
  configRef.current = config;
  const getNormalizedConfig = useMemo(
    () => createNormalizedCalendarAppConfigGetter(() => configRef.current),
    []
  );
  const normalizedConfig = useMemo(
    () => getNormalizedConfig(),
    [config, getNormalizedConfig]
  );

  // `version` lets callers recreate the app (e.g. when plugins change) without
  // unmounting the React component. Changing `version` creates a new CalendarApp
  // with the current normalizedConfig; subsequent config-only diffs are synced
  // via app.updateConfig() in the effect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const app = useMemo(() => new CalendarApp(normalizedConfig), [version]);
  const [, setTick] = useState(0);
  const syncSnapshotRef = useRef(createConfigSyncSnapshot(normalizedConfig));

  useEffect(() => {
    if (!app) {
      return;
    }
    // StrictMode and Fast Refresh replay this effect on the same app, so the
    // plugins torn down by the cleanup below have to be re-armed. No-op on the
    // first run.
    app.restore();
    // Subscribe to state changes to trigger React re-renders
    const unsubscribe = app.subscribe(() => {
      setTick((tick: number) => tick + 1);
    });

    return () => {
      unsubscribe();
      app.destroy();
    };
  }, [app]);

  // Reset sync baselines whenever we recreate the app via `version`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    syncSnapshotRef.current = createConfigSyncSnapshot(normalizedConfig);
  }, [app]);

  // Sync callbacks and live-updatable config in one pass.
  useEffect(() => {
    if (!app) {
      return;
    }

    syncSnapshotRef.current = syncCalendarAppConfig(
      app,
      syncSnapshotRef.current,
      normalizedConfig
    );
  }, [app, normalizedConfig]);

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
    emitVisibleRange: app.emitVisibleRange,
    canMutateFromUI: app.canMutateFromUI,
    readOnlyConfig: app.getReadOnlyConfig(),
  };
}
