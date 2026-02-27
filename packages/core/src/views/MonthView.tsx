import { RefObject } from 'preact';
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'preact/hooks';

import ViewHeader from '@/components/common/ViewHeader';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import WeekComponent from '@/components/monthView/WeekComponent';
import { useCalendarDrop } from '@/hooks/useCalendarDrop';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useVirtualMonthScroll,
  useResponsiveMonthConfig,
} from '@/hooks/virtualScroll';
import { useLocale } from '@/locale';
import { useDragForView } from '@/plugins/dragBridge';
import {
  monthViewContainer,
  weekHeaderRow,
  weekGrid,
  dayLabel,
  scrollContainer,
} from '@/styles/classNames';
import { Event, MonthEventDragState, ViewType, MonthViewProps } from '@/types';
import { extractHourFromDate } from '@/utils';
import { temporalToDate } from '@/utils/temporal';

const MonthView = ({
  app,
  config,
  customDetailPanelContent,
  customEventDetailDialog,
  calendarRef,
  selectedEventId: propSelectedEventId,
  onEventSelect: propOnEventSelect,
  detailPanelEventId: propDetailPanelEventId,
  onDetailPanelToggle: propOnDetailPanelToggle,
}: MonthViewProps & { calendarRef: RefObject<HTMLDivElement> }) => {
  const { getWeekDaysLabels, getMonthLabels, locale } = useLocale();
  const currentDate = app.getCurrentDate();
  const rawEvents = app.getEvents();
  const startOfWeek = config.startOfWeek ?? 1;
  const calendarSignature = app
    .getCalendars()
    .map(c => c.id + c.colors.lineColor)
    .join('-');
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
      const diff = (day - startOfWeek + 7) % 7;
      weekStart.setDate(weekStart.getDate() - diff);
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
  }, [events, startOfWeek]);

  // Responsive configuration
  const { screenSize } = useResponsiveMonthConfig();
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const MobileEventDrawerComponent =
    app.getCustomMobileEventRenderer() || MobileEventDrawer;

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

  const setSelectedEventId = useCallback(
    (id: string | null) => {
      if (propOnEventSelect) {
        propOnEventSelect(id);
      } else {
        setInternalSelectedId(id);
      }
    },
    [propOnEventSelect]
  );

  const setDetailPanelEventId = useCallback(
    (id: string | null) => {
      if (propOnDetailPanelToggle) {
        propOnDetailPanelToggle(id);
      } else {
        setInternalDetailPanelEventId(id);
      }
    },
    [propOnDetailPanelToggle]
  );

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

  // Calculate the week start time for the current date (used for event day field calculation)
  const currentWeekStart = useMemo(() => {
    const day = currentDate.getDay();
    const diff = (day - startOfWeek + 7) % 7;
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [currentDate, startOfWeek]);

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
      if (screenSize === 'desktop') {
        app.addEvent(event);
      } else {
        setDraftEvent(event);
        setIsDrawerOpen(true);
      }
    },
    onEventEdit: (event: Event) => {
      // double-click create event then auto open detail panel
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

  const weekDaysLabels = useMemo(
    () => getWeekDaysLabels(locale, 'short', startOfWeek),
    [locale, getWeekDaysLabels, startOfWeek]
  );

  const {
    currentMonth,
    currentYear,
    isScrolling,
    virtualData,
    weeksData,
    scrollElementRef,
    isNavigating,
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
      const localizedMonths = getMonthLabels(
        locale,
        isAsian ? 'short' : 'long'
      );
      const monthIndex = localizedMonths.indexOf(monthName);

      if (monthIndex >= 0) {
        app.setVisibleMonth(new Date(year, monthIndex, 1));
      }
    },
    initialWeeksToLoad: 156,
    locale: locale,
    startOfWeek: startOfWeek,
    isEnabled: isWeekHeightInitialized,
  });

  const previousStartIndexRef = useRef(0);

  // Calculate actual container height and remaining space
  const [actualContainerHeight, setActualContainerHeight] = useState(0);
  const remainingSpace = useMemo(
    () => actualContainerHeight - weekHeight * 6,
    [actualContainerHeight, weekHeight]
  );

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

    // Pre-render 2 weeks before displayStartIndex as scroll-up buffer.
    // This prevents blank gaps when React's scrollTop state lags behind the
    // DOM scroll position during fast upward scrolling.
    const SCROLL_UP_BUFFER = 2;
    const bufferedStartIdx = Math.max(0, startIdx - SCROLL_UP_BUFFER);
    const targetWeeks = visibleItems.slice(bufferedStartIdx, startIdx + 8);
    const effectiveIdx =
      visibleItems[bufferedStartIdx]?.index ?? displayStartIndex;

    if (targetWeeks.length >= 6) {
      previousVisibleWeeksRef.current = targetWeeks;
      previousStartIndexRef.current = effectiveIdx;
    }

    return { visibleWeeks: targetWeeks, startIndex: effectiveIdx };
  }, [virtualData]);

  const topSpacerHeight = useMemo(
    () => effectiveStartIndex * weekHeight,
    [effectiveStartIndex, weekHeight]
  );

  const initialLoadRef = useRef(true);
  const pendingNavigation = useRef(false);
  const debouncedDisplayStartIndex = useDebouncedValue(
    virtualData.displayStartIndex,
    250
  );

  useEffect(() => {
    if (isNavigating) {
      pendingNavigation.current = true;
    }
  }, [isNavigating]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    const startWeek = weeksData[debouncedDisplayStartIndex];
    if (!startWeek) return;

    const start = new Date(startWeek.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 42 + 7); // visible month + buffer for partial scroll

    app.emitVisibleRange(
      start,
      end,
      pendingNavigation.current ? 'navigation' : 'scroll'
    );

    pendingNavigation.current = false;
  }, [app, weeksData, debouncedDisplayStartIndex]);

  const bottomSpacerHeight = useMemo(() => {
    const total = virtualData.totalHeight;
    const occupied =
      effectiveStartIndex * weekHeight +
      visibleWeeks.length * weekHeight +
      remainingSpace;
    return Math.max(0, total - occupied);
  }, [
    virtualData.totalHeight,
    effectiveStartIndex,
    weekHeight,
    remainingSpace,
    visibleWeeks.length,
  ]);

  // ResizeObserver - Track container height and correct weekHeight if estimate was inaccurate
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const containerHeight = entry.contentRect.height;
        // Save actual container height for other calculations
        setActualContainerHeight(containerHeight);

        if (containerHeight > 0) {
          // Use Math.ceil so 6 rows always fill (or slightly exceed) the
          // container height, preventing blank space at the bottom row.
          const calculatedWeekHeight = Math.max(
            80,
            Math.ceil(containerHeight / 6)
          );

          // Only update if the accurate measurement differs from our estimate
          if (calculatedWeekHeight !== previousWeekHeightRef.current) {
            const currentScrollTop = element.scrollTop;
            if (currentScrollTop > 0) {
              const currentWeekIndex = Math.round(
                currentScrollTop / previousWeekHeightRef.current
              );
              const newScrollTop = currentWeekIndex * calculatedWeekHeight;
              element.scrollTop = newScrollTop;
              setScrollTop(newScrollTop);
            }

            setWeekHeight(calculatedWeekHeight);
            previousWeekHeightRef.current = calculatedWeekHeight;
          }
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollElementRef, setScrollTop]);

  // Synchronously estimate weekHeight from window size and mark as initialized immediately
  // to avoid blank flash while waiting for ResizeObserver. ResizeObserver will correct
  // if the estimate is inaccurate.
  useEffect(() => {
    const estimatedHeaderHeight = 150;
    const estimatedContainerHeight = window.innerHeight - estimatedHeaderHeight;
    const height = Math.max(80, Math.ceil(estimatedContainerHeight / 6));
    setWeekHeight(height);
    previousWeekHeightRef.current = height;
    setIsWeekHeightInitialized(true);
  }, []);

  const handleEventUpdate = useCallback(
    (updatedEvent: Event) => {
      app.updateEvent(updatedEvent.id, updatedEvent);
    },
    [app]
  );

  const handleEventDelete = useCallback(
    (eventId: string) => {
      app.deleteEvent(eventId);
    },
    [app]
  );

  const handleChangeView = (view: ViewType) => {
    app.changeView(view);
  };

  // Stable callbacks for WeekComponent props so memo() can bail out during scroll
  const handleDetailPanelOpen = useCallback(
    () => setNewlyCreatedEventId(null),
    []
  );

  const handleWeekEventSelect = useCallback(
    (eventId: string | null) => {
      const isViewable = app.getReadOnlyConfig().viewable;
      if ((screenSize !== 'desktop' || isTouch) && eventId && isViewable) {
        const evt = events.find(e => e.id === eventId);
        if (evt) {
          setDraftEvent(evt);
          setIsDrawerOpen(true);
          return;
        }
      }
      setSelectedEventId(eventId);
    },
    [screenSize, isTouch, events, setSelectedEventId, app]
  );

  const handleWeekEventLongPress = useCallback(
    (eventId: string) => {
      if (screenSize !== 'desktop' || isTouch) setSelectedEventId(eventId);
    },
    [screenSize, isTouch, setSelectedEventId]
  );

  // Pending: remove getCustomTitle and using app.currentDate to fixed
  const getCustomTitle = () => {
    const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');
    return isAsianLocale
      ? `${currentYear}年${currentMonth}`
      : `${currentMonth} ${currentYear}`;
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

      <div className={weekHeaderRow} onContextMenu={e => e.preventDefault()}>
        <div className={`${weekGrid} px-2`}>
          {weekDaysLabels.map((day, i) => (
            <div key={`${day}-${i}`} className={dayLabel}>
              {day}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={scrollElementRef}
        className={scrollContainer}
        style={{
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

          // Only pass real isScrolling to the week containing the 1st of the month
          // (for month title animation). Other weeks always receive false so memo()
          // can bail out of re-rendering them when isScrolling changes.
          const weekIsScrolling =
            config.showMonthIndicator !== false &&
            item.weekData.days.some(d => d.day === 1)
              ? isScrolling
              : false;

          return (
            <WeekComponent
              key={`week-${item.weekData.startDate.getTime()}`}
              item={adjustedItem}
              weekHeight={weekHeight}
              showWeekNumbers={config.showWeekNumbers}
              showMonthIndicator={config.showMonthIndicator}
              currentMonth={currentMonth}
              currentYear={currentYear}
              screenSize={screenSize}
              isScrolling={weekIsScrolling}
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
              onDetailPanelOpen={handleDetailPanelOpen}
              onMoreEventsClick={app.onMoreEventsClick}
              onChangeView={handleChangeView}
              onSelectDate={app.selectDate}
              selectedEventId={selectedEventId}
              onEventSelect={handleWeekEventSelect}
              onEventLongPress={handleWeekEventLongPress}
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
      />
    </div>
  );
};

export default MonthView;
