import { useMemo, useCallback } from 'preact/hooks';

import {
  CalendarViewType,
  ViewType,
  ViewAdapterProps,
  BaseViewProps,
  EventsService,
  DragService,
  Event,
} from '@/types';

export const ViewAdapter = ({
  originalComponent: OriginalComponent,
  app,
  viewType,
  config,
  useEventDetailPanel,
  calendarRef,
  switcherMode,
  meta,
  selectedEventId,
  detailPanelEventId,
  onEventSelect,
  onDateChange,
  onDetailPanelToggle,
}: ViewAdapterProps) => {
  // Get plugin services
  const eventsService = app.getPlugin<EventsService>('events');
  const dragService = app.getPlugin<DragService>('drag');

  // Basic state
  const currentDate = app.getCurrentDate();
  const currentView = app.state.currentView;
  const events = app.getEvents();

  // Event handlers
  const handleEventUpdate = useCallback(
    (event: Event) => {
      if (eventsService) {
        return eventsService.update(event.id, event);
      }
      return app.updateEvent(event.id, event);
    },
    [eventsService, app]
  );

  const handleEventDelete = useCallback(
    (eventId: string) => {
      if (eventsService) {
        return eventsService.delete(eventId);
      }
      return app.deleteEvent(eventId);
    },
    [eventsService, app]
  );

  const handleEventCreate = useCallback(
    (event: Event) => {
      if (eventsService) {
        eventsService.add(event);
      } else {
        app.addEvent(event);
      }
    },
    [eventsService, app]
  );

  const handleDateChange = useCallback(
    (date: Date) => {
      if (onDateChange) {
        onDateChange(date);
      } else {
        app.setCurrentDate(date);
      }
    },
    [app, onDateChange]
  );

  const handleViewChange = useCallback(
    (view: CalendarViewType) => {
      app.changeView(view);
    },
    [app]
  );

  // Merge configuration
  const mergedConfig = useMemo(() => {
    const viewConfig = app.getViewConfig(viewType);
    return { ...viewConfig, ...config };
  }, [config, app.state.views, viewType]);

  // Prepare props to pass to original component
  const viewProps: BaseViewProps = useMemo(
    () => ({
      app,
      currentDate,
      currentView,
      events,
      onEventUpdate: handleEventUpdate,
      onEventDelete: handleEventDelete,
      onEventCreate: handleEventCreate,
      onDateChange: handleDateChange,
      onViewChange: handleViewChange,
      config: mergedConfig,
      useEventDetailPanel,
      calendarRef,
      switcherMode,
      meta,
      selectedEventId,
      detailPanelEventId,
      onEventSelect,
      onDetailPanelToggle,
    }),
    [
      app,
      currentDate,
      currentView,
      events,
      handleEventUpdate,
      handleEventDelete,
      handleEventCreate,
      handleDateChange,
      handleViewChange,
      mergedConfig,
      useEventDetailPanel,
      calendarRef,
      switcherMode,
      meta,
      selectedEventId,
      detailPanelEventId,
      onEventSelect,
      onDetailPanelToggle,
    ]
  );

  // Special handling: prepare compatible props for existing components
  const compatProps = useMemo(() => {
    // Create a calendar object compatible with the existing API
    const calendarCompat = {
      currentDate,
      events,
      setEvents: (newEvents: Event[]) => {
        // Clear existing events and add new events
        events.forEach(event => handleEventDelete(event.id));
        newEvents.forEach(event => handleEventCreate(event));
      },
      updateEvent: handleEventUpdate,
      deleteEvent: handleEventDelete,
      addEvent: handleEventCreate,
      goToPrevious: () => {
        const newDate = new Date(currentDate);
        switch (currentView) {
          case ViewType.DAY:
            newDate.setDate(newDate.getDate() - 1);
            break;
          case ViewType.WEEK:
            newDate.setDate(newDate.getDate() - 7);
            break;
          case ViewType.MONTH:
            newDate.setMonth(newDate.getMonth() - 1);
            break;
          default:
            break;
        }
        handleDateChange(newDate);
      },
      goToNext: () => {
        const newDate = new Date(currentDate);
        switch (currentView) {
          case ViewType.DAY:
            newDate.setDate(newDate.getDate() + 1);
            break;
          case ViewType.WEEK:
            newDate.setDate(newDate.getDate() + 7);
            break;
          case ViewType.MONTH:
            newDate.setMonth(newDate.getMonth() + 1);
            break;
          default:
            break;
        }
        handleDateChange(newDate);
      },
      goToToday: () => {
        handleDateChange(new Date());
      },
      changeView: handleViewChange,
      selectDate: handleDateChange,
    };

    return {
      calendar: calendarCompat,
      ...viewProps,
      // Pass plugin services (if original component needs them)
      eventsService,
      dragService,
    };
  }, [
    currentDate,
    events,
    currentView,
    handleEventUpdate,
    handleEventDelete,
    handleEventCreate,
    handleDateChange,
    handleViewChange,
    viewProps,
    eventsService,
    dragService,
  ]);

  return <OriginalComponent {...compatProps} />;
};

export default ViewAdapter;
