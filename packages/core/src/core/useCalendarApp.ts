import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'preact/hooks';
import { CalendarApp } from './CalendarApp';
import {
  CalendarAppConfig,
  UseCalendarAppReturn,
  ViewType,
  CalendarType,
  SidebarConfig,
  ReadOnlyConfig,
} from '../types';
import { Event } from '../types';
import { isDeepEqual } from '../utils/helpers';

export function useCalendarApp(
  config: CalendarAppConfig
): UseCalendarAppReturn {
  // Create calendar application instance
  const app = useMemo(() => new CalendarApp(config), []);

  // Reactive state - synchronize state from app instance
  const [currentView, setCurrentView] = useState<ViewType>(
    app.state.currentView
  );
  const [currentDate, setCurrentDateState] = useState<Date>(
    app.state.currentDate
  );
  const [events, setEvents] = useState<Event[]>(app.getEvents());
  const [sidebarConfig, setSidebarConfigState] = useState<SidebarConfig>(
    app.getSidebarConfig()
  );

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

  useEffect(() => {
    return () => {
      if (updateTimerRef.current !== null) {
        cancelAnimationFrame(updateTimerRef.current);
      }
    };
  }, []);

  // Synchronize state changes
  useEffect(() => {
    const originalChangeView = app.changeView;
    app.changeView = (view: ViewType) => {
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

    const originalUpdateEvent = app.updateEvent;
    app.updateEvent = (
      id: string,
      eventUpdate: Partial<Event>,
      isPending?: boolean
    ) => {
      originalUpdateEvent(id, eventUpdate, isPending);
      setEvents([...app.getEvents()]);
    };

    const originalDeleteEvent = app.deleteEvent;
    app.deleteEvent = (id: string) => {
      originalDeleteEvent(id);
      setEvents([...app.getEvents()]);
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
    app.updateCalendar = (id: string, updates: Partial<CalendarType>) => {
      originalUpdateCalendar(id, updates);
    };

    const originalCreateCalendar = app.createCalendar;
    app.createCalendar = (calendar: CalendarType) => {
      originalCreateCalendar(calendar);
    };

    const originalDeleteCalendar = app.deleteCalendar;
    app.deleteCalendar = (id: string) => {
      originalDeleteCalendar(id);
    };

    const originalMergeCalendars = app.mergeCalendars;
    app.mergeCalendars = (sourceId: string, targetId: string) => {
      originalMergeCalendars(sourceId, targetId);
      setEvents([...app.getEvents()]);
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

    const originalTriggerRender = app.triggerRender;
    app.triggerRender = () => {
      originalTriggerRender();
      setSidebarConfigState(app.getSidebarConfig());
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
  const lastConfigRef = useRef(config);
  useEffect(() => {
    if (!isDeepEqual(lastConfigRef.current, config)) {
      app.updateConfig(config);
      lastConfigRef.current = config;
    }
  }, [app, config]);

  // Wrapped methods to ensure state synchronization
  const changeView = useCallback(
    (view: ViewType) => {
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
    (changes: any, isPending?: boolean) => {
      app.applyEventsChanges(changes, isPending);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const updateEvent = useCallback(
    (id: string, event: Partial<Event>, isPending?: boolean) => {
      app.updateEvent(id, event, isPending);
      triggerUpdate();
    },
    [app, triggerUpdate]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      app.deleteEvent(id);
      triggerUpdate();
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
    sidebarConfig,
    readOnlyConfig: app.getReadOnlyConfig(),
  };
}
