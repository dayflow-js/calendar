import { RefObject, JSX } from 'preact';
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
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
import { useResponsiveMonthConfig } from '@/hooks/virtualScroll';
import { useLocale } from '@/locale';
import { useDragForView } from '@/plugins/dragBridge';
import { calendarContainer } from '@/styles/classNames';
import {
  Event,
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
} from '@/utils';

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

  const MobileEventDrawerComponent =
    app.getCustomMobileEventRenderer() || MobileEventDrawer;

  const isMobileView = screenSize !== 'desktop';
  const columnsPerPage = isMobileView ? 2 : 7;
  const isSlidingView = isMobileView;

  const startOfWeek = config.startOfWeek ?? 1;

  const gridWidth = isSlidingView ? '300%' : '100%';

  const standardWeekStart = useMemo(
    () => getWeekStart(currentDate, startOfWeek),
    [currentDate, startOfWeek]
  );

  // Mobile Page Start (Synced with currentDate)
  // Sliding window: always start exactly at currentDate
  const [mobilePageStart, setMobilePageStart] = useState<Date>(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Sync mobilePageStart with currentDate
  useEffect(() => {
    if (!isSlidingView) return;
    setMobilePageStart(prev => {
      const target = new Date(currentDate);
      target.setHours(0, 0, 0, 0);

      const windowStart = new Date(prev);
      const windowEnd = new Date(prev);
      windowEnd.setDate(windowEnd.getDate() + columnsPerPage - 1);

      // If the new date is already within the visible window, don't move the window anchor
      if (target >= windowStart && target <= windowEnd) {
        return prev;
      }

      return target;
    });
  }, [currentDate, isSlidingView, columnsPerPage]);

  const currentWeekStart = isSlidingView ? mobilePageStart : standardWeekStart;

  // For mobile sliding mode, we render 3 pages to allow for smooth swipe transitions
  // Page 1: Previous columns
  // Page 2: Current columns (mobilePageStart)
  // Page 3: Next columns
  const displayDays = isSlidingView ? columnsPerPage * 3 : 7;
  const displayStart = useMemo(() => {
    if (!isSlidingView) return currentWeekStart;
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - columnsPerPage);
    return d;
  }, [currentWeekStart, isSlidingView, columnsPerPage]);

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
  const [draftEvent, setDraftEvent] = useState<Event | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile Swipe Navigation Logic
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // References
  const allDayRowRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const topFrozenContentRef = useRef<HTMLDivElement>(null);
  const leftFrozenContentRef = useRef<HTMLDivElement>(null);
  const swipeContentRef = useRef<HTMLDivElement>(null);

  const handleScroll = (
    e: JSX.TargetedEvent<HTMLDivElement, globalThis.Event>
  ) => {
    const { scrollLeft } = e.currentTarget;
    if (topFrozenContentRef.current) {
      const baseTranslateX = isSlidingView ? 'calc(-100% / 3)' : '0px';
      const horizontalOffset = isSlidingView
        ? `${swipeOffset}px`
        : `-${scrollLeft}px`;
      topFrozenContentRef.current.style.transform = `translateX(calc(${baseTranslateX} + ${horizontalOffset}))`;
      topFrozenContentRef.current.style.transition =
        isSlidingView && isTransitioning ? 'transform 0.3s ease-out' : 'none';
    }
    // Note: leftFrozenContentRef is now inside the scroller and scrolls natively.
    // No JS sync needed.
  };

  const touchStartPos = useRef({ x: 0, y: 0 });
  const isHorizontalSwipe = useRef(false);
  // Tracks the live drag offset during touchmove without triggering React re-renders
  const liveSwipeOffsetRef = useRef(0);

  useEffect(() => {
    if (!isSlidingView) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScrollerTouchStart = (e: TouchEvent) => {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      isHorizontalSwipe.current = false;
      liveSwipeOffsetRef.current = 0;
      setIsTransitioning(false);
    };

    const handleScrollerTouchMove = (e: TouchEvent) => {
      if (isTransitioning) return;

      const deltaX = e.touches[0].clientX - touchStartPos.current.x;
      const deltaY = e.touches[0].clientY - touchStartPos.current.y;

      // Detect horizontal swipe on first move
      if (
        !isHorizontalSwipe.current &&
        Math.abs(deltaX) > 10 &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        isHorizontalSwipe.current = true;
      }

      if (isHorizontalSwipe.current) {
        if (e.cancelable) e.preventDefault();
        const containerWidth = scroller.clientWidth;
        const maxOffset = containerWidth / 2;
        const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));

        // Direct DOM update — bypass React state/useEffect to eliminate per-frame lag
        const transform = `translateX(calc(-100% / 3 + ${offset}px))`;
        if (topFrozenContentRef.current) {
          topFrozenContentRef.current.style.transition = 'none';
          topFrozenContentRef.current.style.transform = transform;
        }
        if (swipeContentRef.current) {
          swipeContentRef.current.style.transition = 'none';
          swipeContentRef.current.style.transform = transform;
        }
        liveSwipeOffsetRef.current = offset;
      }
    };

    const handleScrollerTouchEnd = () => {
      if (!isHorizontalSwipe.current) {
        liveSwipeOffsetRef.current = 0;
        return;
      }

      const offset = liveSwipeOffsetRef.current;
      const threshold = 100; // Snap threshold
      const containerWidth =
        swipeContentRef.current?.clientWidth || scroller.clientWidth;
      const dayWidth = containerWidth / displayDays;

      if (offset > threshold) {
        // Snap to Previous Day — CSS transition takes over from current drag position
        setIsTransitioning(true);
        setSwipeOffset(dayWidth);
        setTimeout(() => {
          const nextDate = new Date(mobilePageStart);
          nextDate.setDate(nextDate.getDate() - 1);
          setMobilePageStart(nextDate); // Explicitly move the window anchor
          app.setCurrentDate(nextDate);
          setSwipeOffset(0);
          liveSwipeOffsetRef.current = 0;
          setIsTransitioning(false);
        }, 300);
      } else if (offset < -threshold) {
        // Snap to Next Day
        setIsTransitioning(true);
        setSwipeOffset(-dayWidth);
        setTimeout(() => {
          const nextDate = new Date(mobilePageStart);
          nextDate.setDate(nextDate.getDate() + 1);
          setMobilePageStart(nextDate); // Explicitly move the window anchor
          app.setCurrentDate(nextDate);
          setSwipeOffset(0);
          liveSwipeOffsetRef.current = 0;
          setIsTransitioning(false);
        }, 300);
      } else {
        // Bounce back
        setIsTransitioning(true);
        setSwipeOffset(0);
        liveSwipeOffsetRef.current = 0;
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
  }, [
    isSlidingView,
    app,
    currentWeekStart,
    isTransitioning,
    columnsPerPage,
    displayDays,
  ]);

  // Events for the current week (or custom range)
  const currentWeekEvents = useMemo(
    () => filterWeekEvents(events, displayStart, displayDays),
    [events, displayStart, displayDays]
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
  const organizedAllDaySegments = useMemo(
    () => organizeAllDaySegments(currentWeekEvents, displayStart, displayDays),
    [currentWeekEvents, displayStart, displayDays]
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
    () => calculateEventLayouts(currentWeekEvents, displayStart, displayDays),
    [currentWeekEvents, displayStart, displayDays]
  );

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
    timeGridRef,
    viewType: DragViewType.WEEK,
    onEventsUpdate: (
      updateFunc: (events: Event[]) => Event[],
      isResizing?: boolean,
      source?: 'drag' | 'resize'
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
        return oldEvent && hasEventChanged(oldEvent, e);
      });

      // Perform operations - updateEvent will automatically trigger onEventUpdate callback
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
    gridWidth,
    displayDays,
  });

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
    onEventCreated: (event: Event) => {
      setNewlyCreatedEventId(event.id);
    },
  });

  const weekDaysLabels = useMemo(() => {
    if (isSlidingView) {
      return Array.from({ length: displayDays }, (_, i) => {
        const d = new Date(displayStart);
        d.setDate(d.getDate() + i);
        return d.toLocaleDateString(locale, { weekday: 'short' });
      });
    }
    return getWeekDaysLabels(locale, 'short', startOfWeek);
  }, [
    locale,
    getWeekDaysLabels,
    isSlidingView,
    displayStart,
    displayDays,
    startOfWeek,
  ]);

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

  const allDayLabelText = useMemo(() => t('allDay'), [t]);

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
    if (!isSlidingView) {
      if (topFrozenContentRef.current) {
        topFrozenContentRef.current.style.transform = '';
        topFrozenContentRef.current.style.transition = '';
      }
      if (swipeContentRef.current) {
        swipeContentRef.current.style.transform = '';
        swipeContentRef.current.style.transition = '';
      }
      return;
    }

    const baseTranslateX = 'calc(-100% / 3)';
    const transition = isTransitioning ? 'transform 0.3s ease-out' : 'none';
    const transform = `translateX(calc(${baseTranslateX} + ${swipeOffset}px))`;

    if (topFrozenContentRef.current) {
      topFrozenContentRef.current.style.transition = transition;
      topFrozenContentRef.current.style.transform = transform;
    }

    if (swipeContentRef.current) {
      swipeContentRef.current.style.transition = transition;
      swipeContentRef.current.style.transform = transform;
    }
  }, [swipeOffset, isTransitioning, isSlidingView]);

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
    today.setHours(0, 0, 0, 0);
    const start = new Date(displayStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + displayDays);

    return today >= start && today < end;
  }, [displayStart, displayDays]);

  // Initial scroll to current time
  useLayoutEffect(() => {
    if (config.scrollToCurrentTime && scrollerRef.current) {
      const scrollContainer = scrollerRef.current;
      const now = new Date();
      const hour = now.getHours() + now.getMinutes() / 60;
      const containerHeight = scrollContainer.clientHeight;

      scrollContainer.scrollTop = Math.max(
        0,
        (hour - FIRST_HOUR) * HOUR_HEIGHT - containerHeight / 2
      );
      // leftFrozenContentRef is now inside the scroller, so it scrolls natively — no sync needed.
    }
  }, []); // Run once on mount

  // Timer
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`${calendarContainer} df-week-view`}>
      {/* Header navigation */}
      <ViewHeader
        calendar={app}
        viewType={ViewType.WEEK}
        currentDate={currentDate}
        onPrevious={() => {
          if (isSlidingView) {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setMobilePageStart(prev => {
              const next = new Date(prev);
              next.setDate(next.getDate() - 1);
              return next;
            });
            app.setCurrentDate(d);
          } else {
            app.goToPrevious();
          }
        }}
        onNext={() => {
          if (isSlidingView) {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setMobilePageStart(prev => {
              const next = new Date(prev);
              next.setDate(next.getDate() + 1);
              return next;
            });
            app.setCurrentDate(d);
          } else {
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
          handleMoveStart as (e: MouseEvent | TouchEvent, event: Event) => void
        }
        handleResizeStart={
          handleResizeStart as (
            e: MouseEvent | TouchEvent,
            event: Event,
            direction: string
          ) => void
        }
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
          handleMoveStart as (e: MouseEvent | TouchEvent, event: Event) => void
        }
        handleResizeStart={
          handleResizeStart as (
            e: MouseEvent | TouchEvent,
            event: Event,
            direction: string
          ) => void
        }
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
        isCurrentWeek={isCurrentWeek}
        currentTime={currentTime}
        HOUR_HEIGHT={HOUR_HEIGHT}
        FIRST_HOUR={FIRST_HOUR}
        LAST_HOUR={LAST_HOUR}
        showStartOfDayLabel={showStartOfDayLabel}
        timeFormat={timeFormat}
        secondaryTimeSlots={secondaryTimeSlots}
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

export default WeekView;
