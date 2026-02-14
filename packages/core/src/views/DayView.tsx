import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'preact/hooks';
import { formatTime, extractHourFromDate } from '@/utils';
import { useLocale } from '@/locale';
import { Event, DayViewProps, ViewType } from '@/types';
import { EventLayoutCalculator } from '@/components/eventLayout';
import { useDragForView } from '@/plugins/dragPlugin';
import { ViewType as DragViewType } from '@/types';
import { defaultDragConfig } from '@/core/config';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import { temporalToDate } from '@/utils/temporal';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import { bgGray50 } from '@/styles/classNames';
import { RightPanel } from '@/components/dayView/RightPanel';
import { DayContent } from '@/components/dayView/DayContent';
import { getWeekStart } from '@/components/weekView/util';
import {
  filterDayEvents,
  normalizeLayoutEvents,
  organizeAllDayEvents,
  calculateNewEventLayout,
  calculateDragLayout,
} from '@/components/dayView/util';

const DayView = ({
  app,
  config,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
  switcherMode = 'buttons',
  selectedEventId: propSelectedEventId,
  onEventSelect: propOnEventSelect,
  onDateChange,
  detailPanelEventId: propDetailPanelEventId,
  onDetailPanelToggle: propOnDetailPanelToggle,
}: DayViewProps) => {
  const events = app.getEvents();
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize !== 'desktop';
  const [isTouch, setIsTouch] = useState(false);

  // Configuration from the typed config object
  const {
    HOUR_HEIGHT = defaultDragConfig.HOUR_HEIGHT,
    FIRST_HOUR = defaultDragConfig.FIRST_HOUR,
    LAST_HOUR = defaultDragConfig.LAST_HOUR,
    ALL_DAY_HEIGHT = defaultDragConfig.ALL_DAY_HEIGHT,
    showAllDay = true,
  } = config;

  const showStartOfDayLabel = !showAllDay;

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const MobileEventDrawerComponent =
    app.getCustomMobileEventRenderer() || MobileEventDrawer;

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null
  );
  const [internalDetailPanelEventId, setInternalDetailPanelEventId] = useState<
    string | null
  >(null);

  const selectedEventId =
    propSelectedEventId !== undefined
      ? propSelectedEventId
      : internalSelectedId;
  const detailPanelEventId =
    propDetailPanelEventId !== undefined
      ? propDetailPanelEventId
      : internalDetailPanelEventId;

  const selectedEvent = useMemo(() => {
    return selectedEventId
      ? events.find(e => e.id === selectedEventId) || null
      : null;
  }, [selectedEventId, events]);

  const setSelectedEventId = (id: string | null) => {
    if (propOnEventSelect) {
      propOnEventSelect(id);
    } else {
      setInternalSelectedId(id);
    }
  };

  const setDetailPanelEventId = (id: string | null) => {
    if (propOnDetailPanelToggle) {
      propOnDetailPanelToggle(id);
    } else {
      setInternalDetailPanelEventId(id);
    }
  };

  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftEvent, setDraftEvent] = useState<Event | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentDate = app.getCurrentDate();
  const visibleMonthDate = app.getVisibleMonth();
  // Visible Month State
  const [visibleMonth, setVisibleMonth] = useState(currentDate);
  const prevDateRef = useRef(currentDate.getTime());

  if (currentDate.getTime() !== prevDateRef.current) {
    prevDateRef.current = currentDate.getTime();
    if (
      currentDate.getFullYear() !== visibleMonth.getFullYear() ||
      currentDate.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(currentDate);
    }
  }

  const handleMonthChange = useCallback(
    (offset: number) => {
      setVisibleMonth(prev => {
        const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
        app.setVisibleMonth(next);
        return next;
      });
    },
    [app]
  );

  // Sync highlighted event from app state
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);

  useEffect(() => {
    const hasChanged =
      app.state.highlightedEventId !== prevHighlightedEventId.current;

    if (hasChanged) {
      if (app.state.highlightedEventId) {
        // setSelectedEventId is called here, but should be careful about loops if propOnEventSelect updates app state
        // In this case, highlight comes from app state, so just sync local selection
        setSelectedEventId(app.state.highlightedEventId);

        const currentEvents = app.getEvents();
        const event = currentEvents.find(
          e => e.id === app.state.highlightedEventId
        );
        if (event && !event.allDay) {
          const startHour = extractHourFromDate(event.start);
          const scrollContainer =
            calendarRef.current?.querySelector('.calendar-content');
          if (scrollContainer) {
            const top = (startHour - FIRST_HOUR) * HOUR_HEIGHT;
            requestAnimationFrame(() => {
              scrollContainer.scrollTo({
                top: Math.max(0, top - 100),
                behavior: 'smooth',
              });
            });
          }
        }
      } else {
        setSelectedEventId(null);
      }
    }
    prevHighlightedEventId.current = app.state.highlightedEventId;
  }, [app.state.highlightedEventId, FIRST_HOUR, HOUR_HEIGHT, calendarRef, app]);

  // References
  const allDayRowRef = useRef<HTMLDivElement>(null);

  // Calculate the week start time for the current date
  const currentWeekStart = useMemo(
    () => getWeekStart(currentDate),
    [currentDate]
  );

  // Events for the current date
  const currentDayEvents = useMemo(() => {
    return filterDayEvents(events, currentDate, currentWeekStart);
  }, [events, currentDate, currentWeekStart]);

  // Prepare events for layout calculation
  const layoutEvents = useMemo(() => {
    return normalizeLayoutEvents(currentDayEvents, currentDate);
  }, [currentDayEvents, currentDate]);

  // Calculate event layouts
  const eventLayouts = useMemo(() => {
    return EventLayoutCalculator.calculateDayEventLayouts(layoutEvents, {
      viewType: 'day',
    });
  }, [layoutEvents]);

  // Organize all-day events into rows to avoid overlap
  const organizedAllDayEvents = useMemo(() => {
    return organizeAllDayEvents(currentDayEvents);
  }, [currentDayEvents]);

  const allDayAreaHeight = useMemo(() => {
    if (organizedAllDayEvents.length === 0) return ALL_DAY_HEIGHT;
    const maxRow = Math.max(...organizedAllDayEvents.map(e => e.row));
    return (maxRow + 1) * ALL_DAY_HEIGHT;
  }, [organizedAllDayEvents, ALL_DAY_HEIGHT]);

  // Use drag functionality provided by the plugin
  const {
    handleMoveStart,
    handleCreateStart,
    handleResizeStart,
    handleCreateAllDayEvent,
    dragState,
    isDragging,
  } = useDragForView(app, {
    calendarRef,
    allDayRowRef: showAllDay ? allDayRowRef : undefined,
    viewType: DragViewType.DAY,
    onEventsUpdate: (updateFunc: (events: Event[]) => Event[]) => {
      const newEvents = updateFunc(currentDayEvents);

      // Find events that need to be deleted (in old list but not in new list)
      const newEventIds = new Set(newEvents.map(e => e.id));
      const eventsToDelete = currentDayEvents.filter(
        e => !newEventIds.has(e.id)
      );

      // Find events that need to be added (in new list but not in old list)
      const oldEventIds = new Set(currentDayEvents.map(e => e.id));
      const eventsToAdd = newEvents.filter(e => !oldEventIds.has(e.id));

      // Find events that need to be updated (exist in both lists but content may differ)
      const eventsToUpdate = newEvents.filter(e => {
        if (!oldEventIds.has(e.id)) return false;
        const oldEvent = currentDayEvents.find(old => old.id === e.id);
        // Check if there are real changes
        return (
          oldEvent &&
          (temporalToDate(oldEvent.start).getTime() !==
            temporalToDate(e.start).getTime() ||
            temporalToDate(oldEvent.end).getTime() !==
              temporalToDate(e.end).getTime() ||
            oldEvent.day !== e.day ||
            extractHourFromDate(oldEvent.start) !==
              extractHourFromDate(e.start) ||
            extractHourFromDate(oldEvent.end) !== extractHourFromDate(e.end) ||
            oldEvent.title !== e.title)
        );
      });

      // Perform operations - updateEvent will automatically trigger onEventUpdate callback
      app.applyEventsChanges({
        delete: eventsToDelete.map(e => e.id),
        add: eventsToAdd,
        update: eventsToUpdate.map(e => ({ id: e.id, updates: e })),
      });
    },
    onEventCreate: (event: Event) => {
      if (isMobile) {
        setDraftEvent(event);
        setIsDrawerOpen(true);
      } else {
        app.addEvent(event);
        setNewlyCreatedEventId(event.id);
      }
    },
    onEventEdit: () => {},
    currentWeekStart,
    events: currentDayEvents,
    calculateNewEventLayout: (targetDay, startHour, endHour) =>
      calculateNewEventLayout(
        targetDay,
        startHour,
        endHour,
        currentDate,
        layoutEvents
      ),
    calculateDragLayout: (
      draggedEvent,
      targetDay,
      targetStartHour,
      targetEndHour
    ) =>
      calculateDragLayout(
        draggedEvent,
        targetDay,
        targetStartHour,
        targetEndHour,
        currentDate,
        layoutEvents
      ),
    TIME_COLUMN_WIDTH: isMobile ? 48 : 80,
    isMobile,
  });

  const handleTouchStart = (e: any, dayIndex: number) => {
    if (!isMobile && !isTouch) return;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const target = e.currentTarget;

    longPressTimerRef.current = setTimeout(() => {
      const rect = calendarRef.current
        ?.querySelector('.calendar-content')
        ?.getBoundingClientRect();

      if (!rect) return;
      const container = calendarRef.current?.querySelector('.calendar-content');
      const scrollTop = container ? container.scrollTop : 0;
      const relativeY = clientY - rect.top + scrollTop;
      const clickedHour = FIRST_HOUR + relativeY / HOUR_HEIGHT;

      const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        touches: [{ clientX, clientY }],
        changedTouches: [{ clientX, clientY }],
        target: target,
        currentTarget: target,
        cancelable: true,
      } as unknown as any;

      handleCreateStart?.(mockEvent, dayIndex, clickedHour);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Use calendar drop functionality
  const { handleDrop, handleDragOver } = useCalendarDrop({
    app,
    onEventCreated: (event: Event) => {
      setNewlyCreatedEventId(event.id);
    },
  });

  // Event handling functions
  const handleEventUpdate = (updatedEvent: Event) => {
    app.updateEvent(updatedEvent.id, updatedEvent);
  };

  const handleEventDelete = (eventId: string) => {
    app.deleteEvent(eventId);
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i + FIRST_HOUR,
    label: formatTime(i + FIRST_HOUR),
  }));

  // Date selection handling
  const handleDateSelect = useCallback(
    (date: Date) => {
      const nextDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      app.setCurrentDate(nextDate);
      setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    },
    [app]
  );
  // Check if it is today
  const isToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(currentDate);
    current.setHours(0, 0, 0, 0);
    return current.getTime() === today.getTime();
  }, [currentDate]);

  // Timer
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`df-day-view flex h-full ${bgGray50}`}>
      <DayContent
        app={app}
        currentDate={currentDate}
        currentWeekStart={currentWeekStart}
        events={events}
        currentDayEvents={currentDayEvents}
        organizedAllDayEvents={organizedAllDayEvents}
        allDayAreaHeight={allDayAreaHeight}
        timeSlots={timeSlots}
        eventLayouts={eventLayouts}
        isToday={isToday}
        currentTime={currentTime}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        newlyCreatedEventId={newlyCreatedEventId}
        setNewlyCreatedEventId={setNewlyCreatedEventId}
        detailPanelEventId={detailPanelEventId}
        setDetailPanelEventId={setDetailPanelEventId}
        dragState={dragState}
        isDragging={isDragging}
        handleMoveStart={handleMoveStart}
        handleResizeStart={handleResizeStart}
        handleCreateStart={handleCreateStart}
        handleCreateAllDayEvent={handleCreateAllDayEvent}
        handleTouchStart={handleTouchStart}
        handleTouchEnd={handleTouchEnd}
        handleTouchMove={handleTouchMove}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        handleEventUpdate={handleEventUpdate}
        handleEventDelete={handleEventDelete}
        onDateChange={onDateChange}
        customDetailPanelContent={customDetailPanelContent}
        customEventDetailDialog={customEventDetailDialog}
        calendarRef={calendarRef}
        allDayRowRef={allDayRowRef}
        switcherMode={switcherMode}
        isMobile={isMobile}
        isTouch={isTouch}
        setDraftEvent={setDraftEvent}
        setIsDrawerOpen={setIsDrawerOpen}
        ALL_DAY_HEIGHT={ALL_DAY_HEIGHT}
        HOUR_HEIGHT={HOUR_HEIGHT}
        FIRST_HOUR={FIRST_HOUR}
        LAST_HOUR={LAST_HOUR}
        showAllDay={showAllDay}
        showStartOfDayLabel={showStartOfDayLabel}
      />
      <RightPanel
        app={app}
        currentDate={currentDate}
        visibleMonth={visibleMonth}
        currentDayEvents={currentDayEvents}
        selectedEvent={selectedEvent}
        setSelectedEvent={(e: any) => setSelectedEventId(e ? e.id : null)}
        handleMonthChange={handleMonthChange}
        handleDateSelect={handleDateSelect}
        switcherMode={switcherMode}
      />
      <MobileEventDrawerComponent
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        onSave={(updatedEvent: any) => {
          if (events.find(e => e.id === updatedEvent.id)) {
            app.updateEvent(updatedEvent.id, updatedEvent);
          } else {
            app.addEvent(updatedEvent);
          }
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        draftEvent={draftEvent}
        app={app}
      />
    </div>
  );
};

export default DayView;
