import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'preact/hooks';

import {
  CalendarAppConfig,
  CalendarViewType,
  UseCalendarAppReturn,
  CalendarType,
  RangeChangeReason,
  Event,
  EventMutationSource,
} from '@/types';
import {
  createConfigSyncSnapshot,
  createNormalizedCalendarAppConfigGetter,
  syncCalendarAppConfig,
} from '@/utils/calendarApp';

import { CalendarApp } from './CalendarApp';

export function useCalendarApp(
  config: CalendarAppConfig
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

  // Create calendar application instance
  const app = useMemo(() => new CalendarApp(normalizedConfig), []);

  // Reactive state - synchronize state from app instance
  const [currentView, setCurrentView] = useState<CalendarViewType>(
    app.state.currentView
  );
  const [currentDate, setCurrentDateState] = useState<Date>(
    app.state.currentDate
  );
  const [events, setEvents] = useState<Event[]>(app.getEvents());
  // Component re-render trigger
  const [, forceUpdate] = useState({});
  const updateTimerRef = useRef<number | null>(null);

  const triggerUpdate = useCallback(() => {
    if (updateTimerRef.current !== null) return;
    updateTimerRef.current = requestAnimationFrame(() => {
      forceUpdate({});
      updateTimerRef.current = null;
    });
  }, []);

  useEffect(
    () => () => {
      if (updateTimerRef.current !== null) {
        cancelAnimationFrame(updateTimerRef.current);
      }
    },
    []
  );

  // Synchronize state changes
  useEffect(() => {
    const originalChangeView = app.changeView;
    app.changeView = (view: CalendarViewType) => {
      originalChangeView(view);
      setCurrentView(view);
    };

    const originalSetCurrentDate = app.setCurrentDate;
    app.setCurrentDate = (date: Date) => {
      originalSetCurrentDate(date);
      setCurrentDateState(new Date(date));
    };

    const originalAddEvent = app.addEvent;
    app.addEvent = (event: Event) => {
      originalAddEvent(event);
      setEvents([...app.getEvents()]);
    };

    const originalAddExternalEvents = app.addExternalEvents;
    app.addExternalEvents = (calendarId: string, newEvents: Event[]) => {
      originalAddExternalEvents(calendarId, newEvents);
      setEvents([...app.getEvents()]);
    };

    const originalUpdateEvent = app.updateEvent;
    app.updateEvent = (
      id: string,
      eventUpdate: Partial<Event>,
      isPending?: boolean,
      source?: EventMutationSource
    ) => {
      const result = originalUpdateEvent(id, eventUpdate, isPending, source);
      setEvents([...app.getEvents()]);
      return result;
    };

    const originalDeleteEvent = app.deleteEvent;
    app.deleteEvent = (id: string) => {
      const result = originalDeleteEvent(id);
      setEvents([...app.getEvents()]);
      return result;
    };

    const originalSetCalendarVisibility = app.setCalendarVisibility;
    app.setCalendarVisibility = (calendarId: string, visible: boolean) => {
      originalSetCalendarVisibility(calendarId, visible);
      setEvents([...app.getEvents()]);
    };

    const originalSetAllCalendarsVisibility = app.setAllCalendarsVisibility;
    app.setAllCalendarsVisibility = (visible: boolean) => {
      originalSetAllCalendarsVisibility(visible);
      setEvents([...app.getEvents()]);
    };

    const originalSetVisibleMonth = app.setVisibleMonth;
    app.setVisibleMonth = (date: Date) => {
      originalSetVisibleMonth(date);
    };

    const originalReorderCalendars = app.reorderCalendars;
    app.reorderCalendars = (fromIndex: number, toIndex: number) => {
      originalReorderCalendars(fromIndex, toIndex);
    };

    const originalUpdateCalendar = app.updateCalendar;
    app.updateCalendar = (
      id: string,
      updates: Partial<CalendarType>,
      isPending?: boolean
    ) => {
      originalUpdateCalendar(id, updates, isPending);
    };

    const originalCreateCalendar = app.createCalendar;
    app.createCalendar = (calendar: CalendarType) => {
      const result = originalCreateCalendar(calendar);
      setEvents([...app.getEvents()]);
      return result;
    };

    const originalDeleteCalendar = app.deleteCalendar;
    app.deleteCalendar = (id: string) => {
      const result = originalDeleteCalendar(id);
      setEvents([...app.getEvents()]);
      return result;
    };

    const originalMergeCalendars = app.mergeCalendars;
    app.mergeCalendars = (sourceId: string, targetId: string) => {
      const result = originalMergeCalendars(sourceId, targetId);
      setEvents([...app.getEvents()]);
      return result;
    };

    const originalHighlightEvent = app.highlightEvent;
    app.highlightEvent = (eventId: string | null) => {
      originalHighlightEvent(eventId);
    };

    const originalUndo = app.undo;
    app.undo = () => {
      originalUndo();
      setEvents([...app.getEvents()]);
    };

    return () => {
      // Cleanup work, if needed
    };
  }, [app]);

  // Synchronize state on initialization
  useEffect(() => {
    setCurrentView(app.state.currentView);
    setCurrentDateState(app.state.currentDate);
    setEvents(app.getEvents());
  }, [app]);

  // Synchronize configuration updates
  const syncSnapshotRef = useRef(createConfigSyncSnapshot(normalizedConfig));
  useEffect(() => {
    syncSnapshotRef.current = syncCalendarAppConfig(
      app,
      syncSnapshotRef.current,
      normalizedConfig
    );
  }, [app, normalizedConfig]);

  // Wrapped methods to ensure state synchronization
  const changeView = useCallback(
    (view: CalendarViewType) => {
      app.changeView(view);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const setCurrentDate = useCallback(
    (date: Date) => {
      app.setCurrentDate(date);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const addEvent = useCallback(
    (event: Event) => {
      app.addEvent(event);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const applyEventsChanges = useCallback(
    (
      changes: {
        add?: Event[];
        update?: Array<{ id: string; updates: Partial<Event> }>;
        delete?: string[];
      },
      isPending?: boolean,
      source?: EventMutationSource
    ) => {
      app.applyEventsChanges(changes, isPending, source);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const updateEvent = useCallback(
    (
      id: string,
      event: Partial<Event>,
      isPending?: boolean,
      source?: EventMutationSource
    ) => {
      const result = app.updateEvent(id, event, isPending, source);
      triggerUpdate();
      return result;
    },
    [app, triggerUpdate]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      const result = app.deleteEvent(id);
      triggerUpdate();
      return result;
    },
    [app, triggerUpdate]
  );

  const undo = useCallback(() => {
    app.undo();
    triggerUpdate();
  }, [app, triggerUpdate]);

  // Navigation methods
  const goToToday = useCallback(() => {
    app.goToToday();
    triggerUpdate();
  }, [app, triggerUpdate]);

  const goToPrevious = useCallback(() => {
    app.goToPrevious();
    triggerUpdate();
  }, [app, triggerUpdate]);

  const goToNext = useCallback(() => {
    app.goToNext();
    triggerUpdate();
  }, [app, triggerUpdate]);

  const selectDate = useCallback(
    (date: Date) => {
      app.selectDate(date);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const setCalendarVisibility = useCallback(
    (calendarId: string, visible: boolean) => {
      app.setCalendarVisibility(calendarId, visible);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const setAllCalendarsVisibility = useCallback(
    (visible: boolean) => {
      app.setAllCalendarsVisibility(visible);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const emitVisibleRange = useCallback(
    (start: Date, end: Date, reason?: RangeChangeReason) => {
      app.emitVisibleRange(start, end, reason);
    },
    [app]
  );

  return {
    app,
    currentView,
    currentDate,
    events,
    applyEventsChanges,
    changeView,
    setCurrentDate,
    addEvent,
    updateEvent,
    deleteEvent,
    goToToday,
    goToPrevious,
    goToNext,
    selectDate,
    undo,
    getCalendars: () => app.getCalendars(),
    createCalendar: (calendar: CalendarType) => app.createCalendar(calendar),
    mergeCalendars: (sourceId: string, targetId: string) =>
      app.mergeCalendars(sourceId, targetId),
    setCalendarVisibility,
    setAllCalendarsVisibility,
    getAllEvents: () => app.getAllEvents(),
    highlightEvent: (eventId: string | null) => app.highlightEvent(eventId),
    setVisibleMonth: (date: Date) => app.setVisibleMonth(date),
    getVisibleMonth: () => app.getVisibleMonth(),
    emitVisibleRange,
    canMutateFromUI: () => app.canMutateFromUI(),
    readOnlyConfig: app.getReadOnlyConfig(),
  };
}
