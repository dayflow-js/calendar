import { useState, useCallback, useMemo, useEffect } from 'react';
import { CalendarApp } from './CalendarApp';
import { CalendarAppConfig, UseCalendarAppReturn, ViewType, CalendarType } from '../types';
import { Event } from '../types';

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

  // Component re-render trigger
  const [, forceUpdate] = useState({});
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Synchronize state changes
  useEffect(() => {
    const originalChangeView = app.changeView;
    app.changeView = (view: ViewType) => {
      originalChangeView(view);
      setCurrentView(view);
      triggerUpdate();
    };

    const originalSetCurrentDate = app.setCurrentDate;
    app.setCurrentDate = (date: Date) => {
      originalSetCurrentDate(date);
      setCurrentDateState(new Date(date));
      triggerUpdate();
    };

    const originalAddEvent = app.addEvent;
    app.addEvent = (event: Event) => {
      originalAddEvent(event);
      setEvents([...app.getEvents()]);
      triggerUpdate();
    };

    const originalUpdateEvent = app.updateEvent;
    app.updateEvent = (
      id: string,
      eventUpdate: Partial<Event>,
      isPending?: boolean
    ) => {
      originalUpdateEvent(id, eventUpdate, isPending);
      setEvents([...app.getEvents()]);
      triggerUpdate();
    };

    const originalDeleteEvent = app.deleteEvent;
    app.deleteEvent = (id: string) => {
      originalDeleteEvent(id);
      setEvents([...app.getEvents()]);
      triggerUpdate();
    };

    const originalSetCalendarVisibility = app.setCalendarVisibility;
    app.setCalendarVisibility = (calendarId: string, visible: boolean) => {
      originalSetCalendarVisibility(calendarId, visible);
      setEvents([...app.getEvents()]);
      triggerUpdate();
    };

    const originalSetAllCalendarsVisibility = app.setAllCalendarsVisibility;
    app.setAllCalendarsVisibility = (visible: boolean) => {
      originalSetAllCalendarsVisibility(visible);
      setEvents([...app.getEvents()]);
      triggerUpdate();
    };

    const originalSetVisibleMonth = app.setVisibleMonth;
    app.setVisibleMonth = (date: Date) => {
      originalSetVisibleMonth(date);
      triggerUpdate();
    };

    const originalReorderCalendars = app.reorderCalendars;
    app.reorderCalendars = (fromIndex: number, toIndex: number) => {
      originalReorderCalendars(fromIndex, toIndex);
      triggerUpdate();
    };

    const originalUpdateCalendar = app.updateCalendar;
    app.updateCalendar = (id: string, updates: Partial<CalendarType>) => {
      originalUpdateCalendar(id, updates);
      triggerUpdate();
    };

    const originalCreateCalendar = app.createCalendar;
    app.createCalendar = (calendar: CalendarType) => {
      originalCreateCalendar(calendar);
      triggerUpdate();
    };

    const originalDeleteCalendar = app.deleteCalendar;
    app.deleteCalendar = (id: string) => {
      originalDeleteCalendar(id);
      triggerUpdate();
    };

    const originalMergeCalendars = app.mergeCalendars;
    app.mergeCalendars = (sourceId: string, targetId: string) => {
      originalMergeCalendars(sourceId, targetId);
      setEvents([...app.getEvents()]);
      triggerUpdate();
    };

    const originalHighlightEvent = app.highlightEvent;
    app.highlightEvent = (eventId: string | null) => {
      originalHighlightEvent(eventId);
      triggerUpdate();
    };

    return () => {
      // Cleanup work, if needed
    };
  }, [app, triggerUpdate]);

  // Synchronize state on initialization
  useEffect(() => {
    setCurrentView(app.state.currentView);
    setCurrentDateState(app.state.currentDate);
    setEvents(app.getEvents());
  }, [app]);

  // Synchronize configuration updates
  useEffect(() => {
    app.updateConfig(config);
  }, [app, config]);

  // Wrapped methods to ensure state synchronization
  const changeView = useCallback(
    (view: ViewType) => {
      app.changeView(view);
    },
    [app]
  );

  const setCurrentDate = useCallback(
    (date: Date) => {
      app.setCurrentDate(date);
    },
    [app]
  );

  const addEvent = useCallback(
    (event: Event) => {
      app.addEvent(event);
    },
    [app]
  );

  const updateEvent = useCallback(
    (id: string, event: Partial<Event>, isPending?: boolean) => {
      app.updateEvent(id, event, isPending);
    },
    [app]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      app.deleteEvent(id);
    },
    [app]
  );

  // Navigation methods
  const goToToday = useCallback(() => {
    app.goToToday();
  }, [app]);

  const goToPrevious = useCallback(() => {
    app.goToPrevious();
  }, [app]);

  const goToNext = useCallback(() => {
    app.goToNext();
  }, [app]);

  const selectDate = useCallback(
    (date: Date) => {
      app.selectDate(date);
    },
    [app]
  );

  const setCalendarVisibility = useCallback(
    (calendarId: string, visible: boolean) => {
      app.setCalendarVisibility(calendarId, visible);
    },
    [app]
  );

  const setAllCalendarsVisibility = useCallback(
    (visible: boolean) => {
      app.setAllCalendarsVisibility(visible);
    },
    [app]
  );

  return {
    app,
    currentView,
    currentDate,
    events,
    changeView,
    setCurrentDate,
    addEvent,
    updateEvent,
    deleteEvent,
    goToToday,
    goToPrevious,
    goToNext,
    selectDate,
    getCalendars: () => app.getCalendars(),
    createCalendar: (calendar: CalendarType) => app.createCalendar(calendar),
    mergeCalendars: (sourceId: string, targetId: string) => app.mergeCalendars(sourceId, targetId),
    setCalendarVisibility,
    setAllCalendarsVisibility,
    getAllEvents: () => app.getAllEvents(),
    highlightEvent: (eventId: string | null) => app.highlightEvent(eventId),
    setVisibleMonth: (date: Date) => app.setVisibleMonth(date),
    getVisibleMonth: () => app.getVisibleMonth(),
    sidebarConfig: app.getSidebarConfig(),
  };
}
