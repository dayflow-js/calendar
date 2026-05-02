import { RefObject } from 'preact';
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
  useCallback,
} from 'preact/hooks';

import ViewHeader from '@/components/common/ViewHeader';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import { AllDayRow } from '@/components/weekView/AllDayRow';
import { TimeGrid } from '@/components/weekView/TimeGrid';
import {
  getWeekStart,
  filterWeekEvents,
  organizeAllDaySegments,
  calculateEventLayouts,
  calculateNewEventLayout,
  calculateDragLayout,
} from '@/components/weekView/util';
import { defaultDragConfig } from '@/core/config';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import { useWeekViewSwipe } from '@/hooks/useWeekViewSwipe';
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import { useLocale } from '@/locale';
import { useDragForView } from '@/plugins/dragBridge';
import { calendarContainer } from '@/styles/classNames';
import {
  Event as CalendarEvent,
  ViewType,
  WeekViewProps,
  ViewType as DragViewType,
  WeekDayDragState,
} from '@/types';
import {
  extractHourFromDate,
  generateSecondaryTimeSlots,
  getTimezoneDisplayLabel,
  hasEventChanged,
  formatTime,
  getNowInTimeZone,
  getTodayInTimeZone,
} from '@/utils';

import {
  buildFullWeekDates,
  buildMobileWeekDayLabels,
  buildWeekDates,
  buildWeekDayLabels,
} from './utils/weekView';

const WeekView = ({
  app,
  config,
  onDateChange,
  useEventDetailPanel,
  calendarRef,
  selectedEventId: propSelectedEventId,
  onEventSelect: propOnEventSelect,
  detailPanelEventId: propDetailPanelEventId,
  onDetailPanelToggle: propOnDetailPanelToggle,
}: WeekViewProps & { calendarRef: RefObject<HTMLDivElement> }) => {
  const { t, getWeekDaysLabels, locale } = useLocale();

  // Stabilize currentDate reference to avoid unnecessary re-renders
  // app.getCurrentDate() returns a new Date object every time
  const rawCurrentDate = app.getCurrentDate();
  const currentDate = useMemo(() => rawCurrentDate, [rawCurrentDate.getTime()]);

  const events = app.getEvents();
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize !== 'desktop';
  const timeGridRef = useRef<HTMLDivElement>(null);
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

  const sidebarWidth =
    secondaryTimeZone && screenSize !== 'mobile'
      ? 88
      : screenSize === 'mobile'
        ? 48
        : 80;

  // Use standardized names internally (matching previous uppercase names for compatibility with minimal changes)
  const HOUR_HEIGHT = configHourHeight;
  const FIRST_HOUR = configFirstHour;
  const LAST_HOUR = configLastHour;
  const ALL_DAY_HEIGHT = configAllDayHeight;

  const showStartOfDayLabel = !showAllDay;

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const MobileEventDrawerComponent = MobileEventDrawer;

  const isMobileView = screenSize !== 'desktop';
  const columnsPerPage = isMobileView ? 2 : 7;
  const isSlidingView = isMobileView;

  const startOfWeek = config.startOfWeek ?? 1;

  const gridWidth = isSlidingView ? '300%' : '100%';

  const standardWeekStart = useMemo(
    () => getWeekStart(currentDate, startOfWeek),
    [currentDate, startOfWeek]
  );

  const displayDays = isSlidingView ? columnsPerPage * 3 : 7;

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
  const [draftEvent, setDraftEvent] = useState<CalendarEvent | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // References
  const allDayRowRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const topFrozenContentRef = useRef<HTMLDivElement>(null);
  const leftFrozenContentRef = useRef<HTMLDivElement>(null);
  const swipeContentRef = useRef<HTMLDivElement>(null);

  const { handleScroll, goToNext, goToPrevious, mobilePageStart } =
    useWeekViewSwipe({
      app,
      columnsPerPage,
      currentDate,
      displayDays,
      isSlidingView,
      scrollerRef,
      swipeContentRef,
      topFrozenContentRef,
    });

  const currentWeekStart = isSlidingView ? mobilePageStart : standardWeekStart;
  const displayStart = useMemo(() => {
    if (!isSlidingView) return currentWeekStart;
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() - columnsPerPage);
    return date;
  }, [columnsPerPage, currentWeekStart, isSlidingView]);

  const appTimeZone = app.timeZone;

  //CalendarEvents for the current week (or custom range)
  const currentWeekEvents = useMemo(
    () => filterWeekEvents(events, displayStart, displayDays, appTimeZone),
    [events, displayStart, displayDays, appTimeZone]
  );

  // Sync highlighted event from app state
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);

  useEffect(() => {
    const hasChanged =
      app.state.highlightedEventId !== prevHighlightedEventId.current;

    if (hasChanged) {
      if (app.state.highlightedEventId) {
        setSelectedEventId(app.state.highlightedEventId);

        // Auto scroll to highlighted event
        const highlightedEvent = currentWeekEvents.find(
          e => e.id === app.state.highlightedEventId
        );
        if (highlightedEvent && !highlightedEvent.allDay) {
          const startHour = extractHourFromDate(highlightedEvent.start);
          const scrollContainer = scrollerRef.current;
          if (scrollContainer) {
            const top = (startHour - FIRST_HOUR) * HOUR_HEIGHT;
            // Scroll with some padding using requestAnimationFrame for smoother performance
            requestAnimationFrame(() => {
              scrollContainer.scrollTo({
                top: Math.max(0, top - 100),
                behavior: 'smooth',
              });
            });
          }
        }
      } else if (
        prevHighlightedEventId.current &&
        selectedEventId === prevHighlightedEventId.current
      ) {
        setSelectedEventId(null);
      }
    }
    prevHighlightedEventId.current = app.state.highlightedEventId;
  }, [
    app.state.highlightedEventId,
    currentWeekEvents,
    FIRST_HOUR,
    HOUR_HEIGHT,
  ]);

  // Organize the hierarchy of all-day events to avoid overlap
  const organizedAllDaySegments = useMemo(
    () =>
      organizeAllDaySegments(
        currentWeekEvents,
        displayStart,
        displayDays,
        app.state.allDaySortComparator
      ),
    [
      currentWeekEvents,
      displayStart,
      displayDays,
      app.state.allDaySortComparator,
    ]
  );

  // Calculate the required height for the all-day event area
  const allDayAreaHeight = useMemo(() => {
    const relevantSegments = isSlidingView
      ? organizedAllDaySegments.filter(
          s =>
            s.endDayIndex >= columnsPerPage &&
            s.startDayIndex <= columnsPerPage * 2 - 1
        )
      : organizedAllDaySegments;

    if (relevantSegments.length === 0) return ALL_DAY_HEIGHT;
    const maxRow = Math.max(...relevantSegments.map(s => s.row));
    return ALL_DAY_HEIGHT + maxRow * ALL_DAY_HEIGHT;
  }, [organizedAllDaySegments, ALL_DAY_HEIGHT, isSlidingView, columnsPerPage]);

  // Calculate event layouts
  const eventLayouts = useMemo(
    () =>
      calculateEventLayouts(
        currentWeekEvents,
        displayStart,
        displayDays,
        appTimeZone
      ),
    [currentWeekEvents, displayStart, displayDays, appTimeZone]
  );

  const handleEventsUpdate = useCallback(
    (
      updateFunc: (events: CalendarEvent[]) => CalendarEvent[],
      isResizing?: boolean,
      source?: 'drag' | 'resize'
    ) => {
      const prevEvents = currentWeekEvents;
      const newEvents = updateFunc(prevEvents);

      // Build a Map for O(1) lookups instead of O(N) .find() per element.
      // The previous O(N²) pattern (filter + find) was the primary drag bottleneck.
      const prevMap = new Map(prevEvents.map(e => [e.id, e]));
      const newSet = new Set(newEvents.map(e => e.id));

      const eventsToDelete = prevEvents.filter(e => !newSet.has(e.id));
      const eventsToAdd = newEvents.filter(e => !prevMap.has(e.id));
      // Reference equality short-circuits hasEventChanged for unchanged events
      const eventsToUpdate = newEvents.filter(e => {
        const old = prevMap.get(e.id);
        return old !== undefined && old !== e && hasEventChanged(old, e);
      });

      // Apply batched changes.
      // Non-drag updates notify onEventBatchChange; drag/resize persistence is
      // handled separately via onEventDrop/onEventResize.
      app.applyEventsChanges(
        {
          delete: eventsToDelete.map(e => e.id),
          add: eventsToAdd,
          update: eventsToUpdate.map(e => ({ id: e.id, updates: e })),
        },
        isResizing,
        source
      );
    },
    [currentWeekEvents, app]
  );

  const handleEventCreate = useCallback(
    (event: CalendarEvent) => {
      if (isMobile) {
        setDraftEvent(event);
        setIsDrawerOpen(true);
      } else {
        app.addEvent(event);
        setNewlyCreatedEventId(event.id);
      }
    },
    [isMobile, app]
  );

  const handleEventEdit = useCallback(() => {
    /* noop */
  }, []);

  const handleCalculateNewEventLayout = useCallback(
    (targetDay: number, startHour: number, endHour: number) =>
      calculateNewEventLayout(
        targetDay,
        startHour,
        endHour,
        currentWeekEvents,
        displayStart,
        displayDays,
        appTimeZone
      ),
    [currentWeekEvents, displayStart, displayDays, appTimeZone]
  );

  const handleCalculateDragLayout = useCallback(
    (
      draggedEvent: CalendarEvent,
      targetDay: number,
      targetStartHour: number,
      targetEndHour: number
    ) =>
      calculateDragLayout(
        draggedEvent,
        targetDay,
        targetStartHour,
        targetEndHour,
        currentWeekEvents,
        displayStart,
        displayDays,
        appTimeZone
      ),
    [currentWeekEvents, displayStart, displayDays, appTimeZone]
  );

  const dragOptions = useMemo(
    () => ({
      calendarRef,
      allDayRowRef: showAllDay ? allDayRowRef : undefined,
      timeGridRef,
      viewType: DragViewType.WEEK,
      onEventsUpdate: handleEventsUpdate,
      onEventCreate: handleEventCreate,
      onEventEdit: handleEventEdit,
      currentWeekStart: displayStart,
      events: currentWeekEvents,
      calculateNewEventLayout: handleCalculateNewEventLayout,
      calculateDragLayout: handleCalculateDragLayout,
      TIME_COLUMN_WIDTH: sidebarWidth,
      isMobile,
      gridWidth,
      displayDays,
    }),
    [
      calendarRef,
      showAllDay,
      handleEventsUpdate,
      handleEventCreate,
      handleEventEdit,
      displayStart,
      currentWeekEvents,
      handleCalculateNewEventLayout,
      handleCalculateDragLayout,
      sidebarWidth,
      isMobile,
      gridWidth,
      displayDays,
    ]
  );

  const {
    handleMoveStart,
    handleCreateStart,
    handleResizeStart,
    handleCreateAllDayEvent,
    dragState,
    isDragging,
  } = useDragForView(app, dragOptions);

  const handleTouchStart = (e: TouchEvent, dayIndex: number, hour: number) => {
    if (!isMobile && !isTouch) return;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const target = e.currentTarget as HTMLElement;

    longPressTimerRef.current = setTimeout(() => {
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

      handleCreateStart?.(mockEvent, dayIndex, hour);
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
    onEventCreated: (event: CalendarEvent) => {
      setNewlyCreatedEventId(event.id);
    },
  });

  const weekDaysLabels = useMemo(
    () =>
      buildWeekDayLabels({
        displayDays,
        displayStart,
        getWeekDaysLabels,
        isSlidingView,
        locale,
        startOfWeek,
      }),
    [
      displayDays,
      displayStart,
      getWeekDaysLabels,
      isSlidingView,
      locale,
      startOfWeek,
    ]
  );

  const mobileWeekDaysLabels = useMemo(
    () =>
      buildMobileWeekDayLabels(
        isMobile,
        locale,
        getWeekDaysLabels,
        weekDaysLabels
      ),
    [getWeekDaysLabels, isMobile, locale, weekDaysLabels]
  );

  const allDayLabelText = useMemo(() => t('allDay'), [t]);

  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i + FIRST_HOUR,
    label: formatTime(i + FIRST_HOUR, 0, timeFormat),
  }));

  const secondaryTimeSlots = useMemo(
    () =>
      secondaryTimeZone
        ? generateSecondaryTimeSlots(
            timeSlots,
            secondaryTimeZone,
            timeFormat,
            currentDate,
            appTimeZone
          )
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [secondaryTimeZone, timeFormat, FIRST_HOUR, currentDate, appTimeZone]
  );

  const primaryTzLabel = useMemo(
    () =>
      secondaryTimeZone
        ? getTimezoneDisplayLabel(appTimeZone, currentDate)
        : undefined,
    [secondaryTimeZone, appTimeZone, currentDate]
  );

  const secondaryTzLabel = useMemo(
    () =>
      secondaryTimeZone
        ? getTimezoneDisplayLabel(secondaryTimeZone, currentDate)
        : undefined,
    [secondaryTimeZone, currentDate]
  );

  const weekDates = useMemo(
    () => buildWeekDates(displayStart, weekDaysLabels, locale, appTimeZone),
    [appTimeZone, displayStart, locale, weekDaysLabels]
  );

  const fullWeekDates = useMemo(
    () =>
      buildFullWeekDates(standardWeekStart, locale, currentDate, appTimeZone),
    [appTimeZone, currentDate, locale, standardWeekStart]
  );

  //CalendarEvent handling functions
  const handleEventUpdate = (updatedEvent: CalendarEvent) =>
    app.updateEvent(updatedEvent.id, updatedEvent);

  const handleEventDelete = (eventId: string) => app.deleteEvent(eventId);

  // Check if it is the current week
  const isCurrentWeek = useMemo(() => {
    const today = getTodayInTimeZone(appTimeZone);
    today.setHours(0, 0, 0, 0);
    const start = new Date(displayStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + displayDays);

    return today >= start && today < end;
  }, [displayStart, displayDays, appTimeZone]);

  // Initial scroll to current time
  useLayoutEffect(() => {
    if (config.scrollToCurrentTime && scrollerRef.current) {
      const scrollContainer = scrollerRef.current;
      const now = getNowInTimeZone(appTimeZone);
      const hour = now.getHours() + now.getMinutes() / 60;
      const containerHeight = scrollContainer.clientHeight;

      scrollContainer.scrollTop = Math.max(
        0,
        (hour - FIRST_HOUR) * HOUR_HEIGHT - containerHeight / 2
      );
      // leftFrozenContentRef is now inside the scroller, so it scrolls natively — no sync needed.
    }
  }, [appTimeZone, config.scrollToCurrentTime, FIRST_HOUR, HOUR_HEIGHT]); // Run on mount and timezone changes

  // Timer
  useEffect(() => {
    setCurrentTime(getNowInTimeZone(appTimeZone));
    const timer = setInterval(
      () => setCurrentTime(getNowInTimeZone(appTimeZone)),
      60_000
    );
    return () => clearInterval(timer);
  }, [appTimeZone]);

  const handleGridDateClick = useCallback(
    (date: Date, dayEvents: CalendarEvent[]) => {
      const clickAction = config?.gridDateClick;
      if (!clickAction) {
        onDateChange?.(date);
        return;
      }

      if (typeof clickAction === 'function') {
        clickAction(date, dayEvents);
        return;
      }

      if (clickAction === 'day-view') {
        app.setCurrentDate(date);
        app.changeView(ViewType.DAY);
      }
      // 'none' → do nothing
    },
    [config.gridDateClick, app, onDateChange]
  );

  const handleGridDateDoubleClick = useCallback(
    (date: Date, dayEvents: CalendarEvent[]) => {
      const dblClickAction = config?.gridDateDoubleClick ?? 'day-view';

      if (typeof dblClickAction === 'function') {
        dblClickAction(date, dayEvents);
        return;
      }

      if (dblClickAction === 'day-view') {
        app.setCurrentDate(date);
        app.changeView(ViewType.DAY);
      }
      // 'none' → do nothing
    },
    [config.gridDateDoubleClick, app]
  );

  return (
    <div className={`${calendarContainer} df-week-view`}>
      {/* Header navigation */}
      <ViewHeader
        calendar={app}
        viewType={ViewType.WEEK}
        currentDate={currentDate}
        onPrevious={() => {
          if (!goToPrevious()) {
            app.goToPrevious();
          }
        }}
        onNext={() => {
          if (!goToNext()) {
            app.goToNext();
          }
        }}
        onToday={() => app.goToToday()}
      />

      <AllDayRow
        app={app}
        weekDaysLabels={weekDaysLabels}
        mobileWeekDaysLabels={mobileWeekDaysLabels}
        weekDates={weekDates}
        fullWeekDates={fullWeekDates}
        isSlidingView={isSlidingView}
        mobilePageStart={mobilePageStart}
        currentWeekStart={displayStart}
        currentWeekEvents={currentWeekEvents}
        gridWidth={gridWidth}
        allDayAreaHeight={allDayAreaHeight}
        organizedAllDaySegments={organizedAllDaySegments}
        allDayLabelText={allDayLabelText}
        isMobile={isMobile}
        isTouch={isTouch}
        showAllDay={showAllDay}
        calendarRef={calendarRef}
        allDayRowRef={allDayRowRef}
        topFrozenContentRef={topFrozenContentRef}
        ALL_DAY_HEIGHT={ALL_DAY_HEIGHT}
        HOUR_HEIGHT={HOUR_HEIGHT}
        FIRST_HOUR={FIRST_HOUR}
        dragState={dragState as WeekDayDragState | null}
        isDragging={isDragging}
        secondaryTimeSlots={secondaryTimeSlots}
        primaryTzLabel={primaryTzLabel}
        secondaryTzLabel={secondaryTzLabel}
        handleMoveStart={
          handleMoveStart as (
            e: MouseEvent | TouchEvent,
            event: CalendarEvent
          ) => void
        }
        handleResizeStart={
          handleResizeStart as (
            e: MouseEvent | TouchEvent,
            event: CalendarEvent,
            direction: string
          ) => void
        }
        handleEventUpdate={handleEventUpdate}
        handleEventDelete={handleEventDelete}
        setDraftEvent={e => setDraftEvent(e)}
        setIsDrawerOpen={setIsDrawerOpen}
        onDateChange={onDateChange}
        onGridDateClick={handleGridDateClick}
        onGridDateDoubleClick={handleGridDateDoubleClick}
        newlyCreatedEventId={newlyCreatedEventId}
        setNewlyCreatedEventId={setNewlyCreatedEventId}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        detailPanelEventId={detailPanelEventId}
        setDetailPanelEventId={setDetailPanelEventId}
        handleCreateAllDayEvent={handleCreateAllDayEvent}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        useEventDetailPanel={useEventDetailPanel}
      />

      <TimeGrid
        app={app}
        timeSlots={timeSlots}
        weekDaysLabels={weekDaysLabels}
        currentWeekStart={displayStart}
        currentWeekEvents={currentWeekEvents}
        eventLayouts={eventLayouts}
        gridWidth={gridWidth}
        isMobile={isMobile}
        isSlidingView={isSlidingView}
        isTouch={isTouch}
        scrollerRef={scrollerRef}
        timeGridRef={timeGridRef}
        leftFrozenContentRef={leftFrozenContentRef}
        swipeContentRef={swipeContentRef}
        calendarRef={calendarRef}
        handleScroll={handleScroll}
        handleCreateStart={handleCreateStart}
        handleTouchStart={handleTouchStart}
        handleTouchEnd={handleTouchEnd}
        handleTouchMove={handleTouchMove}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        dragState={dragState as WeekDayDragState | null}
        isDragging={isDragging}
        handleMoveStart={
          handleMoveStart as (
            e: MouseEvent | TouchEvent,
            event: CalendarEvent
          ) => void
        }
        handleResizeStart={
          handleResizeStart as (
            e: MouseEvent | TouchEvent,
            event: CalendarEvent,
            direction: string
          ) => void
        }
        handleEventUpdate={handleEventUpdate}
        handleEventDelete={handleEventDelete}
        setDraftEvent={e => setDraftEvent(e)}
        setIsDrawerOpen={setIsDrawerOpen}
        onDateChange={onDateChange}
        onGridDateClick={handleGridDateClick}
        onGridDateDoubleClick={handleGridDateDoubleClick}
        newlyCreatedEventId={newlyCreatedEventId}
        setNewlyCreatedEventId={setNewlyCreatedEventId}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        detailPanelEventId={detailPanelEventId}
        setDetailPanelEventId={setDetailPanelEventId}
        useEventDetailPanel={useEventDetailPanel}
        isCurrentWeek={isCurrentWeek}
        currentTime={currentTime}
        HOUR_HEIGHT={HOUR_HEIGHT}
        FIRST_HOUR={FIRST_HOUR}
        LAST_HOUR={LAST_HOUR}
        showStartOfDayLabel={showStartOfDayLabel}
        timeFormat={timeFormat}
        secondaryTimeSlots={secondaryTimeSlots}
        appTimeZone={appTimeZone}
      />

      <MobileEventDrawerComponent
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        onSave={(updatedEvent: CalendarEvent) => {
          if (events.some(e => e.id === updatedEvent.id)) {
            app.updateEvent(updatedEvent.id, updatedEvent);
          } else {
            app.addEvent(updatedEvent);
          }
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        draftEvent={draftEvent as CalendarEvent | null}
        app={app}
        timeFormat={timeFormat}
      />
    </div>
  );
};

export default WeekView;
