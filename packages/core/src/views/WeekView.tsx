import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { formatTime, extractHourFromDate } from '@/utils';
import { useLocale } from '@/locale';
import { Event, ViewType, WeekViewProps } from '@/types';
import { useDragForView } from '@/plugins/dragBridge';
import { ViewType as DragViewType } from '@/types';
import { defaultDragConfig } from '@/core/config';
import ViewHeader from '@/components/common/ViewHeader';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import { temporalToDate } from '@/utils/temporal';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import { calendarContainer } from '@/styles/classNames';
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

const WeekView = ({
  app,
  config,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
  selectedEventId: propSelectedEventId,
  onEventSelect: propOnEventSelect,
  onDateChange,
  detailPanelEventId: propDetailPanelEventId,
  onDetailPanelToggle: propOnDetailPanelToggle,
}: WeekViewProps) => {
  const { t, getWeekDaysLabels, locale } = useLocale();
  
  // Stabilize currentDate reference to avoid unnecessary re-renders
  // app.getCurrentDate() returns a new Date object every time
  const rawCurrentDate = app.getCurrentDate();
  const currentDate = useMemo(() => rawCurrentDate, [rawCurrentDate.getTime()]);
  
  const events = app.getEvents();
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize !== 'desktop';
  const sidebarWidth = screenSize === 'mobile' ? 48 : 80;
  const timeGridRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  // Configuration from the typed config object
  const {
    HOUR_HEIGHT = defaultDragConfig.HOUR_HEIGHT,
    FIRST_HOUR = defaultDragConfig.FIRST_HOUR,
    LAST_HOUR = defaultDragConfig.LAST_HOUR,
    ALL_DAY_HEIGHT = defaultDragConfig.ALL_DAY_HEIGHT,
    showAllDay = true,
    mobileColumns = 2,
  } = config;

  const showStartOfDayLabel = !showAllDay;

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const MobileEventDrawerComponent =
    app.getCustomMobileEventRenderer() || MobileEventDrawer;

  // Mobile 2-Column Logic
  const isMobileTwoColumn = isMobile && mobileColumns === 2;

  const standardWeekStart = useMemo(
    () => getWeekStart(currentDate),
    [currentDate]
  );

  // Fixed Paging Logic for Mobile 2-Column
  const getMobilePageStart = (date: Date) => {
    const startOfWeek = getWeekStart(date);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor(
      (d.getTime() - startOfWeek.getTime()) / (24 * 60 * 60 * 1000)
    );
    const pageIndex = Math.min(3, Math.floor(diff / 2)); // 0: M-T, 1: W-T, 2: F-S, 3: Sun
    const pageStart = new Date(startOfWeek);
    pageStart.setDate(startOfWeek.getDate() + pageIndex * 2);
    return pageStart;
  };

  // Mobile Page Start (Synced with currentDate group)
  const [mobilePageStart, setMobilePageStart] = useState<Date>(() =>
    getMobilePageStart(currentDate)
  );

  // Sync mobilePageStart with currentDate
  useEffect(() => {
    if (!isMobileTwoColumn) return;
    const newPageStart = getMobilePageStart(currentDate);
    setMobilePageStart(prev =>
      prev.getTime() === newPageStart.getTime() ? prev : newPageStart
    );
  }, [currentDate, isMobileTwoColumn]);

  const currentWeekStart = isMobileTwoColumn
    ? mobilePageStart
    : standardWeekStart;

  // For mobile 2-column mode, we render 3 pages (6 days) to allow for smooth swipe transitions
  // Page 1: Previous 2 days
  // Page 2: Current 2 days (mobilePageStart)
  // Page 3: Next 2 days
  const displayDays = isMobileTwoColumn ? 6 : 7;
  const displayStart = useMemo(() => {
    if (!isMobileTwoColumn) return currentWeekStart;
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 2);
    return d;
  }, [currentWeekStart, isMobileTwoColumn]);

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

  // References
  const allDayRowRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const topFrozenContentRef = useRef<HTMLDivElement>(null);
  const leftFrozenContentRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: any) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (topFrozenContentRef.current) {
      const baseTranslateX = isMobileTwoColumn ? '-33.333%' : '0px';
      const horizontalOffset = isMobileTwoColumn
        ? `${swipeOffset}px`
        : `-${scrollLeft}px`;
      topFrozenContentRef.current.style.transform = `translateX(calc(${baseTranslateX} + ${horizontalOffset}))`;
      topFrozenContentRef.current.style.transition =
        isMobileTwoColumn && isTransitioning
          ? 'transform 0.3s ease-out'
          : 'none';
    }
    if (leftFrozenContentRef.current) {
      leftFrozenContentRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
  };

  // Mobile Swipe Navigation Logic
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isHorizontalSwipe = useRef(false);

  useEffect(() => {
    if (!isMobileTwoColumn) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScrollerTouchStart = (e: TouchEvent) => {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      isHorizontalSwipe.current = false;
      setIsTransitioning(false);
    };

    const handleScrollerTouchMove = (e: TouchEvent) => {
      if (isTransitioning) return;

      const deltaX = e.touches[0].clientX - touchStartPos.current.x;
      const deltaY = e.touches[0].clientY - touchStartPos.current.y;

      // Detect horizontal swipe on first move
      if (!isHorizontalSwipe.current && Math.abs(deltaX) > 10) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          isHorizontalSwipe.current = true;
        }
      }

      if (isHorizontalSwipe.current) {
        if (e.cancelable) e.preventDefault();
        setSwipeOffset(deltaX);
      }
    };

    const handleScrollerTouchEnd = () => {
      if (!isHorizontalSwipe.current) {
        setSwipeOffset(0);
        return;
      }

      const threshold = 100; // Snap threshold
      const containerWidth = scroller.clientWidth;

      if (swipeOffset > threshold) {
        // Snap to Previous Page
        setIsTransitioning(true);
        setSwipeOffset(containerWidth);
        setTimeout(() => {
          const nextDate = new Date(mobilePageStart);
          nextDate.setDate(nextDate.getDate() - 2);
          app.setCurrentDate(nextDate);
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 300);
      } else if (swipeOffset < -threshold) {
        // Snap to Next Page
        setIsTransitioning(true);
        setSwipeOffset(-containerWidth);
        setTimeout(() => {
          const nextDate = new Date(mobilePageStart);
          nextDate.setDate(nextDate.getDate() + 2);
          app.setCurrentDate(nextDate);
          setSwipeOffset(0);
          setIsTransitioning(false);
        }, 300);
      } else {
        // Bounce back
        setIsTransitioning(true);
        setSwipeOffset(0);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      }
    };

    scroller.addEventListener('touchstart', handleScrollerTouchStart, {
      passive: true,
    });
    scroller.addEventListener('touchmove', handleScrollerTouchMove, {
      passive: false,
    });
    scroller.addEventListener('touchend', handleScrollerTouchEnd, {
      passive: true,
    });

    return () => {
      scroller.removeEventListener('touchstart', handleScrollerTouchStart);
      scroller.removeEventListener('touchmove', handleScrollerTouchMove);
      scroller.removeEventListener('touchend', handleScrollerTouchEnd);
    };
  }, [isMobileTwoColumn, app, currentWeekStart, isTransitioning, swipeOffset]);

  // Events for the current week (or custom 2-day range)
  const currentWeekEvents = useMemo(() => {
    return filterWeekEvents(events, displayStart, displayDays);
  }, [events, displayStart, displayDays]);

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
      } else {
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
  const organizedAllDaySegments = useMemo(() => {
    return organizeAllDaySegments(currentWeekEvents, displayStart, displayDays);
  }, [currentWeekEvents, displayStart, displayDays]);

  // Calculate the required height for the all-day event area
  const allDayAreaHeight = useMemo(() => {
    const relevantSegments = isMobileTwoColumn
      ? organizedAllDaySegments.filter(
          s => s.endDayIndex >= 2 && s.startDayIndex <= 3
        )
      : organizedAllDaySegments;

    if (relevantSegments.length === 0) return ALL_DAY_HEIGHT;
    const maxRow = Math.max(...relevantSegments.map(s => s.row));
    return ALL_DAY_HEIGHT + maxRow * ALL_DAY_HEIGHT;
  }, [organizedAllDaySegments, ALL_DAY_HEIGHT, isMobileTwoColumn]);

  // Calculate event layouts
  const eventLayouts = useMemo(() => {
    return calculateEventLayouts(currentWeekEvents, displayStart, displayDays);
  }, [currentWeekEvents, displayStart, displayDays]);

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
    viewType: DragViewType.WEEK,
    onEventsUpdate: (
      updateFunc: (events: Event[]) => Event[],
      isResizing?: boolean
    ) => {
      const newEvents = updateFunc(currentWeekEvents);
      // Find events that need to be deleted (in old list but not in new list)
      const newEventIds = new Set(newEvents.map(e => e.id));
      const eventsToDelete = currentWeekEvents.filter(
        e => !newEventIds.has(e.id)
      );

      // Find events that need to be added (in new list but not in old list)
      const oldEventIds = new Set(currentWeekEvents.map(e => e.id));
      const eventsToAdd = newEvents.filter(e => !oldEventIds.has(e.id));

      // Find events that need to be updated (exist in both lists but content may differ)
      const eventsToUpdate = newEvents.filter(e => {
        if (!oldEventIds.has(e.id)) return false;
        const oldEvent = currentWeekEvents.find(old => old.id === e.id);
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
      app.applyEventsChanges(
        {
          delete: eventsToDelete.map(e => e.id),
          add: eventsToAdd,
          update: eventsToUpdate.map(e => ({ id: e.id, updates: e })),
        },
        isResizing
      );
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
    currentWeekStart: displayStart,
    events: currentWeekEvents,
    calculateNewEventLayout: (targetDay, startHour, endHour) =>
      calculateNewEventLayout(targetDay, startHour, endHour, currentWeekEvents),
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
        currentWeekEvents
      ),
    TIME_COLUMN_WIDTH: sidebarWidth,
    isMobile,
  });

  const handleTouchStart = (e: any, dayIndex: number, hour: number) => {
    if (!isMobile && !isTouch) return;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const target = e.currentTarget;

    longPressTimerRef.current = setTimeout(() => {
      const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        touches: [{ clientX, clientY }],
        changedTouches: [{ clientX, clientY }],
        target: target,
        currentTarget: target,
        cancelable: true,
      } as unknown as any;

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
    onEventCreated: (event: Event) => {
      setNewlyCreatedEventId(event.id);
    },
  });

  const weekDaysLabels = useMemo(() => {
    if (isMobileTwoColumn) {
      return Array.from({ length: displayDays }, (_, i) => {
        const d = new Date(displayStart);
        d.setDate(d.getDate() + i);
        return d.toLocaleDateString(locale, { weekday: 'short' });
      });
    }
    return getWeekDaysLabels(locale, 'short');
  }, [locale, getWeekDaysLabels, isMobileTwoColumn, displayStart, displayDays]);

  const mobileWeekDaysLabels = useMemo(() => {
    if (!isMobile) return [];
    const lang = locale.split('-')[0].toLowerCase();
    if (lang === 'zh' || lang === 'ja') {
      return getWeekDaysLabels(locale, 'narrow');
    }
    // English or other languages: M, Tu, W, Th, F, Sa, Su
    return weekDaysLabels.map(label => {
      if (lang === 'en') {
        if (label.startsWith('Tu')) return 'Tu';
        if (label.startsWith('Th')) return 'Th';
        if (label.startsWith('Sa')) return 'Sa';
        if (label.startsWith('Su')) return 'Su';
      }
      return label.charAt(0);
    });
  }, [isMobile, locale, getWeekDaysLabels, weekDaysLabels]);

  const allDayLabelText = useMemo(() => {
    return t('allDay');
  }, [t]);

  const timeSlots = Array.from({ length: 24 }, (_, i) => ({
    hour: i + FIRST_HOUR,
    label: formatTime(i + FIRST_HOUR),
  }));

  // Generate week date data
  const weekDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare date part only
    return weekDaysLabels.map((_, index) => {
      const date = new Date(displayStart);
      date.setDate(displayStart.getDate() + index);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      return {
        date: date.getDate(),
        month: date.toLocaleString(locale, { month: 'short' }),
        fullDate: new Date(date),
        isToday: dateOnly.getTime() === today.getTime(),
      };
    });
  }, [displayStart, weekDaysLabels, locale]);

  // Generate full 7-day week data for mobile header
  const fullWeekDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = standardWeekStart;
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      return {
        date: date.getDate(),
        month: date.toLocaleString(locale, { month: 'short' }),
        fullDate: new Date(date),
        isToday: dateOnly.getTime() === today.getTime(),
        isCurrent:
          dateOnly.getTime() === new Date(currentDate).setHours(0, 0, 0, 0),
        dayName: date.toLocaleDateString(locale, { weekday: 'short' }),
      };
    });
  }, [standardWeekStart, locale, currentDate]);

  // Sync horizontal transform for swipe
  useEffect(() => {
    if (!isMobileTwoColumn) {
      if (topFrozenContentRef.current) {
        topFrozenContentRef.current.style.transform = '';
        topFrozenContentRef.current.style.transition = '';
      }
      if (scrollerRef.current && scrollerRef.current.firstChild) {
        const target = scrollerRef.current.firstChild as HTMLElement;
        target.style.transform = '';
        target.style.transition = '';
      }
      return;
    }

    const baseTranslateX = '-33.333%';
    const transition = isTransitioning ? 'transform 0.3s ease-out' : 'none';
    const transform = `translateX(calc(${baseTranslateX} + ${swipeOffset}px))`;

    if (topFrozenContentRef.current) {
      topFrozenContentRef.current.style.transition = transition;
      topFrozenContentRef.current.style.transform = transform;
    }

    if (scrollerRef.current && scrollerRef.current.firstChild) {
      const target = scrollerRef.current.firstChild as HTMLElement;
      target.style.transition = transition;
      target.style.transform = transform;
    }
  }, [swipeOffset, isTransitioning, isMobileTwoColumn]);

  // Event handling functions
  const handleEventUpdate = (updatedEvent: Event) => {
    app.updateEvent(updatedEvent.id, updatedEvent);
  };

  const handleEventDelete = (eventId: string) => {
    app.deleteEvent(eventId);
  };

  // Check if it is the current week
  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const todayWeekStart = getWeekStart(today);
    return currentWeekStart.getTime() === todayWeekStart.getTime();
  }, [currentWeekStart]);

  // Timer
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const gridWidth =
    isMobile && !isMobileTwoColumn
      ? mobileColumns === 4
        ? '175%'
        : '100%'
      : isMobileTwoColumn
        ? '300%'
        : '100%';

  return (
    <div className={`${calendarContainer} df-week-view`}>
      {/* Header navigation */}
      <ViewHeader
        calendar={app}
        viewType={ViewType.WEEK}
        currentDate={currentDate}
        onPrevious={() => app.goToPrevious()}
        onNext={() => app.goToNext()}
        onToday={() => app.goToToday()}
      />

      <AllDayRow
        app={app}
        weekDaysLabels={weekDaysLabels}
        mobileWeekDaysLabels={mobileWeekDaysLabels}
        weekDates={weekDates}
        fullWeekDates={fullWeekDates}
        isMobileTwoColumn={isMobileTwoColumn}
        mobilePageStart={mobilePageStart}
        currentWeekStart={displayStart}
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
        dragState={dragState}
        isDragging={isDragging}
        handleMoveStart={handleMoveStart}
        handleResizeStart={handleResizeStart}
        handleEventUpdate={handleEventUpdate}
        handleEventDelete={handleEventDelete}
        onDateChange={onDateChange}
        newlyCreatedEventId={newlyCreatedEventId}
        setNewlyCreatedEventId={setNewlyCreatedEventId}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        detailPanelEventId={detailPanelEventId}
        setDetailPanelEventId={setDetailPanelEventId}
        handleCreateAllDayEvent={handleCreateAllDayEvent}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        customDetailPanelContent={customDetailPanelContent}
        customEventDetailDialog={customEventDetailDialog}
        events={events}
        setDraftEvent={setDraftEvent}
        setIsDrawerOpen={setIsDrawerOpen}
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
        isTouch={isTouch}
        scrollerRef={scrollerRef}
        timeGridRef={timeGridRef}
        leftFrozenContentRef={leftFrozenContentRef}
        calendarRef={calendarRef}
        handleScroll={handleScroll}
        handleCreateStart={handleCreateStart}
        handleTouchStart={handleTouchStart}
        handleTouchEnd={handleTouchEnd}
        handleTouchMove={handleTouchMove}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        dragState={dragState}
        isDragging={isDragging}
        handleMoveStart={handleMoveStart}
        handleResizeStart={handleResizeStart}
        handleEventUpdate={handleEventUpdate}
        handleEventDelete={handleEventDelete}
        onDateChange={onDateChange}
        newlyCreatedEventId={newlyCreatedEventId}
        setNewlyCreatedEventId={setNewlyCreatedEventId}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        detailPanelEventId={detailPanelEventId}
        setDetailPanelEventId={setDetailPanelEventId}
        customDetailPanelContent={customDetailPanelContent}
        customEventDetailDialog={customEventDetailDialog}
        events={events}
        setDraftEvent={setDraftEvent}
        setIsDrawerOpen={setIsDrawerOpen}
        isCurrentWeek={isCurrentWeek}
        currentTime={currentTime}
        HOUR_HEIGHT={HOUR_HEIGHT}
        FIRST_HOUR={FIRST_HOUR}
        LAST_HOUR={LAST_HOUR}
        showStartOfDayLabel={showStartOfDayLabel}
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

export default WeekView;
