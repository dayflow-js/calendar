import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { CalendarApp } from '@/core';
import {
  formatTime,
  extractHourFromDate,
} from '@/utils';
import { useLocale } from '@/locale';
import {
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ViewType,
} from '@/types';
import { useDragForView } from '@/plugins/dragPlugin';
import { ViewType as DragViewType } from '@/types';
import { defaultDragConfig } from '@/core/config';
import ViewHeader from '@/components/common/ViewHeader';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import { temporalToDate } from '@/utils/temporal';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import {
  calendarContainer,
} from '@/styles/classNames';
import { AllDayRow } from '@/components/weekView/AllDayRow';
import { TimeGrid } from '@/components/weekView/TimeGrid';
import {
  getWeekStart,
  filterWeekEvents,
  organizeAllDaySegments,
  calculateEventLayouts,
  calculateNewEventLayout,
  calculateDragLayout
} from '@/components/weekView/util';

interface WeekViewProps {
  app: CalendarApp; // Required prop, provided by CalendarRenderer
  customDetailPanelContent?: EventDetailContentRenderer; // Custom event detail content
  customEventDetailDialog?: EventDetailDialogRenderer; // Custom event detail dialog
  calendarRef: React.RefObject<HTMLDivElement>; // The DOM reference of the entire calendar passed from CalendarRenderer
}

const WeekView: React.FC<WeekViewProps> = ({
  app,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
}) => {
  const { t, getWeekDaysLabels, locale } = useLocale();
  const currentDate = app.getCurrentDate();
  const events = app.getEvents();
  const { screenSize } = useResponsiveMonthConfig();
  const isMobile = screenSize !== 'desktop';
  const sidebarWidth = screenSize === 'mobile' ? 48 : 80;
  const [timeGridWidth, setTimeGridWidth] = useState(0);
  const timeGridRef = React.useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useLayoutEffect(() => {
    const timeGrid = timeGridRef.current;
    if (!timeGrid) return;

    const updateWidth = () => {
      setTimeGridWidth(timeGrid.offsetWidth);
    };

    // Initial measurement before paint
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(timeGrid);

    return () => observer.disconnect();
  }, []);

  const MobileEventDrawerComponent = app.getCustomMobileEventRenderer() || MobileEventDrawer;

  // Calculate the week start time for the current date
  const currentWeekStart = useMemo(
    () => getWeekStart(currentDate),
    [currentDate]
  );
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(
    null
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftEvent, setDraftEvent] = useState<Event | null>(null);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get configuration constants
  const {
    HOUR_HEIGHT,
    FIRST_HOUR,
    LAST_HOUR,
    TIME_COLUMN_WIDTH,
    ALL_DAY_HEIGHT,
  } = defaultDragConfig;

  // References
  const allDayRowRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const topFrozenContentRef = React.useRef<HTMLDivElement>(null);
  const leftFrozenContentRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (topFrozenContentRef.current) {
      topFrozenContentRef.current.scrollLeft = scrollLeft;
    }
    if (leftFrozenContentRef.current) {
      leftFrozenContentRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
  };

  // Events for the current week
  const currentWeekEvents = useMemo(() => {
    return filterWeekEvents(events, currentWeekStart);
  }, [events, currentWeekStart]);

  // Sync highlighted event from app state
  const prevHighlightedEventId = React.useRef(app.state.highlightedEventId);

  useEffect(() => {
    const hasChanged = app.state.highlightedEventId !== prevHighlightedEventId.current;

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
    return organizeAllDaySegments(currentWeekEvents, currentWeekStart);
  }, [currentWeekEvents, currentWeekStart]);

  // Calculate the required height for the all-day event area
  const allDayAreaHeight = useMemo(() => {
    if (organizedAllDaySegments.length === 0) return ALL_DAY_HEIGHT;
    const maxRow = Math.max(...organizedAllDaySegments.map(s => s.row));
    return ALL_DAY_HEIGHT + maxRow * ALL_DAY_HEIGHT;
  }, [organizedAllDaySegments, ALL_DAY_HEIGHT]);

  // Calculate event layouts
  const eventLayouts = useMemo(() => {
    return calculateEventLayouts(currentWeekEvents, currentWeekStart);
  }, [currentWeekEvents, currentWeekStart]);

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
    allDayRowRef,
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
      eventsToDelete.forEach(event => app.deleteEvent(event.id));
      eventsToAdd.forEach(event => app.addEvent(event));
      eventsToUpdate.forEach(event =>
        app.updateEvent(event.id, event, isResizing)
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
    onEventEdit: () => { },
    currentWeekStart,
    events: currentWeekEvents,
    calculateNewEventLayout: (targetDay, startHour, endHour) =>
      calculateNewEventLayout(targetDay, startHour, endHour, currentWeekEvents),
    calculateDragLayout: (draggedEvent, targetDay, targetStartHour, targetEndHour) =>
      calculateDragLayout(draggedEvent, targetDay, targetStartHour, targetEndHour, currentWeekEvents),
    TIME_COLUMN_WIDTH: sidebarWidth,
    isMobile,
  });

  const handleTouchStart = (e: React.TouchEvent, dayIndex: number, hour: number) => {
    if (!isMobile && !isTouch) return;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const target = e.currentTarget;

    longPressTimerRef.current = setTimeout(() => {
      const mockEvent = {
        preventDefault: () => { },
        stopPropagation: () => { },
        touches: [{ clientX, clientY }],
        changedTouches: [{ clientX, clientY }],
        target: target,
        currentTarget: target,
        cancelable: true,
      } as unknown as React.TouchEvent;

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
    return getWeekDaysLabels(locale, 'short');
  }, [locale, getWeekDaysLabels]);

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
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      return {
        date: date.getDate(),
        month: date.toLocaleString(locale, { month: 'short' }),
        fullDate: new Date(date),
        isToday: dateOnly.getTime() === today.getTime(),
      };
    });
  }, [currentWeekStart, weekDaysLabels, locale]);

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

  const gridWidth = isMobile ? '175%' : '100%';

  return (
    <div className={calendarContainer}>
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
        currentWeekStart={currentWeekStart}
        timeGridWidth={timeGridWidth}
        sidebarWidth={sidebarWidth}
        allDayAreaHeight={allDayAreaHeight}
        organizedAllDaySegments={organizedAllDaySegments}
        allDayLabelText={allDayLabelText}
        isMobile={isMobile}
        isTouch={isTouch}
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
        currentWeekStart={currentWeekStart}
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
      />

      <MobileEventDrawerComponent
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDraftEvent(null);
        }}
        onSave={(updatedEvent) => {
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