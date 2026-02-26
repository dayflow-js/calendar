import { RefObject } from 'preact';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect,
} from 'preact/hooks';

import { DayContent } from '@/components/dayView/DayContent';
import { RightPanel } from '@/components/dayView/RightPanel';
import {
  filterDayEvents,
  normalizeLayoutEvents,
  organizeAllDayEvents,
  calculateNewEventLayout,
  calculateDragLayout,
} from '@/components/dayView/util';
import { EventLayoutCalculator } from '@/components/eventLayout';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import { getWeekStart } from '@/components/weekView/util';
import { defaultDragConfig } from '@/core/config';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import { useDragForView } from '@/plugins/dragBridge';
import { bgGray50 } from '@/styles/classNames';
import {
  Event,
  DayViewProps,
  ViewType as DragViewType,
  WeekDayDragState,
} from '@/types';
import {
  formatTime,
  extractHourFromDate,
  generateSecondaryTimeSlots,
  getTimezoneDisplayLabel,
} from '@/utils';
import { temporalToDate } from '@/utils/temporal';

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
}: DayViewProps & { calendarRef: RefObject<HTMLDivElement> }) => {
  const events = app.getEvents();
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize !== 'desktop';
  const [isTouch, setIsTouch] = useState(false);

  // Configuration from the typed config object
  const {
    hourHeight: configHourHeight = defaultDragConfig.HOUR_HEIGHT,
    firstHour: configFirstHour = defaultDragConfig.FIRST_HOUR,
    lastHour: configLastHour = defaultDragConfig.LAST_HOUR,
    allDayHeight: configAllDayHeight = defaultDragConfig.ALL_DAY_HEIGHT,
    showAllDay = true,
    timeFormat = '24h',
    secondaryTimeZone,
  } = config;

  const HOUR_HEIGHT = configHourHeight;
  const FIRST_HOUR = configFirstHour;
  const LAST_HOUR = configLastHour;
  const ALL_DAY_HEIGHT = configAllDayHeight;

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
    propSelectedEventId === undefined
      ? internalSelectedId
      : propSelectedEventId;
  const detailPanelEventId =
    propDetailPanelEventId === undefined
      ? internalDetailPanelEventId
      : propDetailPanelEventId;

  const selectedEvent = useMemo(
    () =>
      selectedEventId
        ? events.find(e => e.id === selectedEventId) || null
        : null,
    [selectedEventId, events]
  );

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
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentDate = app.getCurrentDate();
  // const visibleMonthDate = app.getVisibleMonth();
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
  const currentDayEvents = useMemo(
    () => filterDayEvents(events, currentDate, currentWeekStart),
    [events, currentDate, currentWeekStart]
  );

  // Prepare events for layout calculation
  const layoutEvents = useMemo(
    () => normalizeLayoutEvents(currentDayEvents, currentDate),
    [currentDayEvents, currentDate]
  );

  // Calculate event layouts
  const eventLayouts = useMemo(
    () =>
      EventLayoutCalculator.calculateDayEventLayouts(layoutEvents, {
        viewType: 'day',
      }),
    [layoutEvents]
  );

  // Organize all-day events into rows to avoid overlap
  const organizedAllDayEvents = useMemo(
    () => organizeAllDayEvents(currentDayEvents),
    [currentDayEvents]
  );

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
    onEventEdit: () => {
      /* noop */
    },
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
    TIME_COLUMN_WIDTH: secondaryTimeZone && !isMobile ? 88 : isMobile ? 48 : 80,
    isMobile,
  });

  const handleTouchStart = (e: TouchEvent, dayIndex: number) => {
    if (!isMobile && !isTouch) return;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const target = e.currentTarget as HTMLElement;

    longPressTimerRef.current = setTimeout(() => {
      const rect = (calendarRef.current as HTMLElement)
        ?.querySelector('.calendar-content')
        ?.getBoundingClientRect();

      if (!rect) return;
      const container = (calendarRef.current as HTMLElement)?.querySelector(
        '.calendar-content'
      );
      const scrollTop = container ? container.scrollTop : 0;
      const relativeY = clientY - rect.top + scrollTop;
      const clickedHour = FIRST_HOUR + relativeY / HOUR_HEIGHT;

      const mockEvent = {
        preventDefault: () => {
          /* noop */
        },
        stopPropagation: () => {
          /* noop */
        },
        touches: [{ clientX, clientY }],
        changedTouches: [{ clientX, clientY }],
        target: target,
        currentTarget: target,
        cancelable: true,
      } as unknown as TouchEvent;

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
    label: formatTime(i + FIRST_HOUR, 0, timeFormat),
  }));

  const secondaryTimeSlots = useMemo(
    () =>
      secondaryTimeZone
        ? generateSecondaryTimeSlots(timeSlots, secondaryTimeZone, timeFormat)
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [secondaryTimeZone, timeFormat, FIRST_HOUR]
  );

  const primaryTzLabel = useMemo(
    () =>
      secondaryTimeZone
        ? getTimezoneDisplayLabel(
            Intl.DateTimeFormat().resolvedOptions().timeZone
          )
        : undefined,
    [secondaryTimeZone]
  );

  const secondaryTzLabel = useMemo(
    () =>
      secondaryTimeZone
        ? getTimezoneDisplayLabel(secondaryTimeZone)
        : undefined,
    [secondaryTimeZone]
  );

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

  // Initial scroll to current time
  useLayoutEffect(() => {
    if (config.scrollToCurrentTime) {
      const scrollContainer =
        calendarRef.current?.querySelector('.calendar-content');
      if (scrollContainer) {
        const now = new Date();
        const hour = now.getHours() + now.getMinutes() / 60;
        const containerHeight = (scrollContainer as HTMLElement).clientHeight;

        scrollContainer.scrollTop = Math.max(
          0,
          (hour - FIRST_HOUR) * HOUR_HEIGHT - containerHeight / 2
        );
      }
    }
  }, []); // Run once on mount

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
        dragState={dragState as WeekDayDragState | null}
        isDragging={isDragging}
        handleMoveStart={
          handleMoveStart as (e: MouseEvent | TouchEvent, event: Event) => void
        }
        handleResizeStart={
          handleResizeStart as (
            e: MouseEvent | TouchEvent,
            event: Event,
            direction: string
          ) => void
        }
        handleCreateStart={
          handleCreateStart as (
            e: MouseEvent | TouchEvent,
            dayIndex: number,
            hour: number
          ) => void
        }
        handleCreateAllDayEvent={
          handleCreateAllDayEvent as (
            e: MouseEvent | TouchEvent,
            dayIndex: number
          ) => void
        }
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
        timeFormat={timeFormat}
        secondaryTimeSlots={secondaryTimeSlots}
        primaryTzLabel={primaryTzLabel}
        secondaryTzLabel={secondaryTzLabel}
      />
      <RightPanel
        app={app}
        currentDate={currentDate}
        visibleMonth={visibleMonth}
        currentDayEvents={currentDayEvents}
        selectedEvent={selectedEvent}
        setSelectedEvent={e => setSelectedEventId(e ? e.id : null)}
        handleMonthChange={handleMonthChange}
        handleDateSelect={handleDateSelect}
        switcherMode={switcherMode}
        timeFormat={timeFormat}
      />
      <MobileEventDrawerComponent
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        onSave={(updatedEvent: Event) => {
          if (events.some(e => e.id === updatedEvent.id)) {
            app.updateEvent(updatedEvent.id, updatedEvent);
          } else {
            app.addEvent(updatedEvent);
          }
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        draftEvent={draftEvent}
        app={app}
        timeFormat={timeFormat}
      />
    </div>
  );
};

export default DayView;
