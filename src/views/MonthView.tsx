import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarApp } from '@/core';
import { extractHourFromDate } from '@/utils';
import { useLocale } from '@/locale';
import {
  Event,
  MonthEventDragState,
  ViewType,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
} from '@/types';
import {
  useVirtualMonthScroll,
  useResponsiveMonthConfig,
} from '@/hooks/virtualScroll';
import { useDragForView } from '@/plugins/dragPlugin';
import ViewHeader from '@/components/common/ViewHeader';
import WeekComponent from '@/components/monthView/WeekComponent';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import { temporalToDate } from '@/utils/temporal';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import {
  monthViewContainer,
  weekHeaderRow,
  weekGrid,
  dayLabel,
  scrollContainer,
} from '@/styles/classNames';

interface MonthViewProps {
  app: CalendarApp; // Required prop, provided by CalendarRenderer
  customDetailPanelContent?: EventDetailContentRenderer; // Custom event detail content
  customEventDetailDialog?: EventDetailDialogRenderer; // Custom event detail dialog
  calendarRef: React.RefObject<HTMLDivElement>; // The DOM reference of the entire calendar passed from CalendarRenderer
}

const MonthView: React.FC<MonthViewProps> = ({
  app,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
}) => {
  const { getWeekDaysLabels, getMonthLabels, locale } = useLocale();
  const currentDate = app.getCurrentDate();
  const rawEvents = app.getEvents();
  const calendarSignature = app.getCalendars().map(c => c.id + c.colors.lineColor).join('-');
  const previousEventsRef = useRef<Event[] | null>(null);
  const DEFAULT_WEEK_HEIGHT = 119;
  // Stabilize events reference so week calculations do not rerun on every scroll frame
  const events = useMemo(() => {
    const previous = previousEventsRef.current;

    if (
      previous &&
      previous.length === rawEvents.length &&
      previous.every((event, index) => event === rawEvents[index])
    ) {
      return previous;
    }

    previousEventsRef.current = rawEvents;
    return rawEvents;
  }, [rawEvents]);

  const eventsByWeek = useMemo(() => {
    const map = new Map<number, Event[]>();

    const getWeekStart = (date: Date) => {
      const weekStart = new Date(date);
      weekStart.setHours(0, 0, 0, 0);
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    };

    const addToWeek = (weekTime: number, event: Event) => {
      const bucket = map.get(weekTime);
      if (bucket) {
        bucket.push(event);
      } else {
        map.set(weekTime, [event]);
      }
    };

    events.forEach(event => {
      if (!event.start) return;

      const startFull = temporalToDate(event.start);
      const endFull = event.end ? temporalToDate(event.end) : startFull;

      // Normalize to day boundaries
      const startDate = new Date(startFull);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(endFull);
      endDate.setHours(0, 0, 0, 0);

      let adjustedEnd = new Date(endDate);

      // Match WeekComponent's logic for non all-day events ending at midnight
      if (!event.allDay) {
        const hasTimeComponent =
          endFull.getHours() !== 0 ||
          endFull.getMinutes() !== 0 ||
          endFull.getSeconds() !== 0 ||
          endFull.getMilliseconds() !== 0;

        if (!hasTimeComponent) {
          adjustedEnd.setDate(adjustedEnd.getDate() - 1);
        }
      }

      if (adjustedEnd < startDate) {
        adjustedEnd = new Date(startDate);
      }

      const weekStart = getWeekStart(startDate);
      const weekEnd = getWeekStart(adjustedEnd);

      let cursorTime = weekStart.getTime();
      const endTime = weekEnd.getTime();

      while (cursorTime <= endTime) {
        addToWeek(cursorTime, event);
        const nextWeek = new Date(cursorTime);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);
        cursorTime = nextWeek.getTime();
      }
    });

    return map;
  }, [events]);

  // Responsive configuration
  const { screenSize } = useResponsiveMonthConfig();
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const MobileEventDrawerComponent = app.getCustomMobileEventRenderer() || MobileEventDrawer;

  // Fixed weekHeight to prevent fluctuations during scrolling
  // Initialize with estimated value based on window height to minimize initial adjustment
  const [weekHeight, setWeekHeight] = useState(DEFAULT_WEEK_HEIGHT);
  const [isWeekHeightInitialized, setIsWeekHeightInitialized] = useState(false);
  const previousWeekHeightRef = useRef(weekHeight);

  const previousVisibleWeeksRef = useRef<typeof virtualData.visibleItems>([]);

  // ID of newly created event, used to automatically display detail panel
  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftEvent, setDraftEvent] = useState<Event | null>(null);

  // Selected event ID, used for cross-week MultiDayEvent selected state synchronization
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Sync highlighted event from app state
  const prevHighlightedEventId = useRef(app.state.highlightedEventId);

  useEffect(() => {
    if (app.state.highlightedEventId) {
      setSelectedEventId(app.state.highlightedEventId);
    } else if (prevHighlightedEventId.current) {
      // Only clear if previously had a highlighted event
      setSelectedEventId(null);
    }
    prevHighlightedEventId.current = app.state.highlightedEventId;
  }, [app.state.highlightedEventId]);

  // Detail panel event ID, used to control displaying only one detail panel
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(
    null
  );

  // Calculate the week start time for the current date (used for event day field calculation)
  const currentWeekStart = useMemo(() => {
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(currentDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, [currentDate]);

  const {
    handleMoveStart,
    handleCreateStart,
    handleResizeStart,
    dragState,
    isDragging,
  } = useDragForView(app, {
    calendarRef,
    viewType: ViewType.MONTH,
    onEventsUpdate: (
      updateFunc: (events: Event[]) => Event[],
      isResizing?: boolean
    ) => {
      const newEvents = updateFunc(events);

      // Find events that need to be deleted (in old list but not in new list)
      const newEventIds = new Set(newEvents.map(e => e.id));
      const eventsToDelete = events.filter(e => !newEventIds.has(e.id));

      // Find events that need to be added (in new list but not in old list)
      const oldEventIds = new Set(events.map(e => e.id));
      const eventsToAdd = newEvents.filter(e => !oldEventIds.has(e.id));

      // Find events that need to be updated (exist in both lists but content may differ)
      const eventsToUpdate = newEvents.filter(e => {
        if (!oldEventIds.has(e.id)) return false;
        const oldEvent = events.find(old => old.id === e.id);
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
            oldEvent.title !== e.title ||
            // for All day events
            oldEvent?.start !== e?.start ||
            oldEvent?.end !== e?.end)
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
      if (screenSize !== 'desktop') {
        setDraftEvent(event);
        setIsDrawerOpen(true);
      } else {
        app.addEvent(event);
      }
    },
    onEventEdit: (event: Event) => {
      setNewlyCreatedEventId(event.id);
    },
    currentWeekStart,
    events,
  });

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

  const {
    currentMonth,
    currentYear,
    isScrolling,
    virtualData,
    scrollElementRef,
    handleScroll,
    handlePreviousMonth,
    handleNextMonth,
    handleToday,
    setScrollTop,
  } = useVirtualMonthScroll({
    currentDate,
    weekHeight,
    onCurrentMonthChange: (monthName: string, year: number) => {
      const isAsian = locale.startsWith('zh') || locale.startsWith('ja');
      const localizedMonths = getMonthLabels(locale, isAsian ? 'short' : 'long');
      const monthIndex = localizedMonths.indexOf(monthName);

      if (monthIndex >= 0) {
        app.setVisibleMonth(new Date(year, monthIndex, 1));
      }
    },
    initialWeeksToLoad: 156,
    locale: locale,
    isEnabled: isWeekHeightInitialized
  });

  const previousStartIndexRef = useRef(0);

  // Calculate actual container height and remaining space
  const [actualContainerHeight, setActualContainerHeight] = useState(0);
  const remainingSpace = useMemo(() => {
    return actualContainerHeight - weekHeight * 6;
  }, [actualContainerHeight, weekHeight]);

  const { visibleWeeks, startIndex: effectiveStartIndex } = useMemo(() => {
    const { visibleItems, displayStartIndex } = virtualData;

    const startIdx = visibleItems.findIndex(
      item => item.index === displayStartIndex
    );

    if (startIdx === -1) {
      // Fallback handling: return previous data
      if (previousVisibleWeeksRef.current.length > 0) {
        return {
          visibleWeeks: previousVisibleWeeksRef.current,
          startIndex: previousStartIndexRef.current,
        };
      }
      return { visibleWeeks: [], startIndex: displayStartIndex };
    }

    const targetWeeks = visibleItems.slice(startIdx, startIdx + 8);

    if (targetWeeks.length >= 6) {
      previousVisibleWeeksRef.current = targetWeeks;
      previousStartIndexRef.current = displayStartIndex;
    }

    return { visibleWeeks: targetWeeks, startIndex: displayStartIndex };
  }, [virtualData]);

  const topSpacerHeight = useMemo(() => {
    return effectiveStartIndex * weekHeight;
  }, [effectiveStartIndex, weekHeight]);

  const bottomSpacerHeight = useMemo(() => {
    const total = virtualData.totalHeight;
    const WEEKS_TO_LOAD = 16;
    const occupied =
      effectiveStartIndex * weekHeight + WEEKS_TO_LOAD * weekHeight + remainingSpace;
    return Math.max(0, total - occupied);
  }, [
    virtualData.totalHeight,
    effectiveStartIndex,
    weekHeight,
    remainingSpace,
  ]);

  // ResizeObserver - Initialize weekHeight and handle container height changes
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const containerHeight = entry.contentRect.height;
        // Save actual container height for other calculations
        setActualContainerHeight(containerHeight);

        // Only initialize weekHeight once to prevent fluctuations during scrolling
        if (!isWeekHeightInitialized && containerHeight > 0) {
          const calculatedWeekHeight = Math.max(
            80,
            Math.floor(containerHeight / 6)
          );

          // If weekHeight changed from initial value, adjust scrollTop to maintain position
          // Do this synchronously in the same frame to prevent visible jump
          if (calculatedWeekHeight !== previousWeekHeightRef.current) {
            const currentScrollTop = element.scrollTop;
            if (currentScrollTop > 0) {
              // Calculate which week we're currently showing
              const currentWeekIndex = Math.round(currentScrollTop / previousWeekHeightRef.current);
              // Recalculate scrollTop with new weekHeight
              const newScrollTop = currentWeekIndex * calculatedWeekHeight;

              // Synchronously update both state and DOM
              element.scrollTop = newScrollTop;
              setScrollTop(newScrollTop);
            }
          }

          setWeekHeight(calculatedWeekHeight);
          previousWeekHeightRef.current = calculatedWeekHeight;

          // Use requestAnimationFrame to ensure visibility change happens after scrollTop is set
          requestAnimationFrame(() => {
            setIsWeekHeightInitialized(true);
          });
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollElementRef, isWeekHeightInitialized, setScrollTop]);

  useEffect(() => {
    const estimatedHeaderHeight = 150;
    const estimatedContainerHeight = window.innerHeight - estimatedHeaderHeight;
    const height = Math.max(80, Math.floor(estimatedContainerHeight / 6));
    setWeekHeight(height);
  }, []);

  const handleEventUpdate = (updatedEvent: Event) => {
    app.updateEvent(updatedEvent.id, updatedEvent);
  };

  const handleEventDelete = (eventId: string) => {
    app.deleteEvent(eventId);
  };

  const handleChangeView = (view: ViewType) => {
    app.changeView(view);
  };

  // TODO: remove getCustomTitle and using app.currentDate to fixed
  const getCustomTitle = () => {
    const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');
    return isAsianLocale ? `${currentYear}年${currentMonth}` : `${currentMonth} ${currentYear}`;
  };

  return (
    <div className={monthViewContainer}>
      <ViewHeader
        calendar={app}
        viewType={ViewType.MONTH}
        currentDate={currentDate}
        customTitle={getCustomTitle()}
        onPrevious={() => {
          app.goToPrevious();
          handlePreviousMonth();
        }}
        onNext={() => {
          app.goToNext();
          handleNextMonth();
        }}
        onToday={() => {
          app.goToToday();
          handleToday();
        }}
      />

      <div className={weekHeaderRow}>
        <div className={`${weekGrid} px-2`}>
          {weekDaysLabels.map((day, i) => (
            <div key={i} className={dayLabel}>
              {day}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={scrollElementRef}
        className={scrollContainer}
        style={{
          scrollSnapType: 'y mandatory',
          overflow: 'hidden auto',
          visibility: isWeekHeightInitialized ? 'visible' : 'hidden',
        }}
        onScroll={handleScroll}
      >
        <div
          style={{
            height: topSpacerHeight,
          }}
        />
        {visibleWeeks.map((item, index) => {
          const weekEvents =
            eventsByWeek.get(item.weekData.startDate.getTime()) ?? [];

          // The 6th week (index=5) fills the remaining space to ensure the container is filled
          const adjustedItem =
            index === 5
              ? {
                ...item,
                height: item.height + remainingSpace,
              }
              : item;

          return (
            <WeekComponent
              key={`week-${item.weekData.startDate.getTime()}`}
              item={adjustedItem}
              weekHeight={weekHeight}
              currentMonth={currentMonth}
              currentYear={currentYear}
              screenSize={screenSize}
              isScrolling={isScrolling}
              calendarRef={calendarRef}
              events={weekEvents}
              onEventUpdate={handleEventUpdate}
              onEventDelete={handleEventDelete}
              onMoveStart={handleMoveStart}
              onCreateStart={handleCreateStart}
              onResizeStart={handleResizeStart}
              isDragging={isDragging}
              dragState={dragState as MonthEventDragState}
              newlyCreatedEventId={newlyCreatedEventId}
              onDetailPanelOpen={() => setNewlyCreatedEventId(null)}
              onMoreEventsClick={app.onMoreEventsClick}
              onChangeView={handleChangeView}
              onSelectDate={app.selectDate}
              selectedEventId={selectedEventId}
              onEventSelect={(eventId: string | null) => {
                const isViewable = app.getReadOnlyConfig().viewable !== false;
                if ((screenSize !== 'desktop' || isTouch) && eventId && isViewable) {
                  const evt = events.find(e => e.id === eventId);
                  if (evt) {
                    setDraftEvent(evt);
                    setIsDrawerOpen(true);
                    return;
                  }
                }
                setSelectedEventId(eventId);
              }}
              onEventLongPress={(eventId: string) => {
                if (screenSize !== 'desktop' || isTouch) setSelectedEventId(eventId);
              }}
              detailPanelEventId={detailPanelEventId}
              onDetailPanelToggle={setDetailPanelEventId}
              customDetailPanelContent={customDetailPanelContent}
              customEventDetailDialog={customEventDetailDialog}
              onCalendarDrop={handleDrop}
              onCalendarDragOver={handleDragOver}
              calendarSignature={calendarSignature}
              app={app}
              enableTouch={isTouch}
            />
          );
        })}
        <div
          style={{
            height: bottomSpacerHeight,
          }}
        />
      </div>
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

export default MonthView;