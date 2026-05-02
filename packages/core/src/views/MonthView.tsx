import { RefObject } from 'preact';
import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'preact/hooks';

import ViewHeader from '@/components/common/ViewHeader';
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
import {
  Event,
  MonthEventDragState,
  ViewType,
  MonthViewProps,
  WeeksData,
} from '@/types';
import {
  dateToPlainDate,
  dateToZonedDateTime,
  hasEventChanged,
  generateWeekData,
  temporalToVisualDate,
} from '@/utils';

/** Compute the 6 weeks that fill a month-view grid for the given date. */
const getMonthWeeks = (date: Date, startOfWeek: number): WeeksData[] => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const diff = (firstDay.getDay() - startOfWeek + 7) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - diff);
  gridStart.setHours(0, 0, 0, 0);

  const weeks: WeeksData[] = [];
  for (let i = 0; i < 6; i++) {
    const weekStart = new Date(gridStart);
    weekStart.setDate(gridStart.getDate() + i * 7);
    weeks.push(generateWeekData(weekStart));
  }
  return weeks;
};

const getWeekStartForDate = (date: Date, startOfWeek: number) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const diff = (day - startOfWeek + 7) % 7;
  weekStart.setDate(weekStart.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const getBucketedEventDateRange = (event: Event, appTimeZone?: string) => {
  const startFull = temporalToVisualDate(event.start, appTimeZone);
  const endFull = event.end
    ? temporalToVisualDate(event.end, appTimeZone)
    : startFull;

  const startDate = new Date(startFull);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(endFull);
  endDate.setHours(0, 0, 0, 0);

  let adjustedEnd = new Date(endDate);

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

  return { startDate, adjustedEnd };
};

const eventOverlapsWeek = (
  event: Event,
  weekStart: Date,
  startOfWeek: number,
  appTimeZone?: string
) => {
  const { startDate, adjustedEnd } = getBucketedEventDateRange(
    event,
    appTimeZone
  );
  const eventWeekStart = getWeekStartForDate(startDate, startOfWeek).getTime();
  const eventWeekEnd = getWeekStartForDate(adjustedEnd, startOfWeek).getTime();
  const targetWeek = getWeekStartForDate(weekStart, startOfWeek).getTime();

  return targetWeek >= eventWeekStart && targetWeek <= eventWeekEnd;
};

const STATIC_TRANSITION_DURATION = 300;
const EMPTY_WEEK_EVENTS: Event[] = [];

const MonthView = ({
  app,
  config,
  onDateChange: _,
  useEventDetailPanel,
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
  const appTimeZone = app.timeZone;

  const scrollDisabled = config.scroll?.disabled === true;
  const isFadeMode = scrollDisabled && config.scroll?.transition === 'fade';

  const [fadeDisplayDate, setFadeDisplayDate] = useState(currentDate);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [fadeDirection, setFadeDirection] = useState<'forward' | 'backward'>(
    'forward'
  );
  const prevFadeDateRef = useRef(currentDate);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDateYear = currentDate.getFullYear();
  const currentDateMonth = currentDate.getMonth();

  useEffect(() => {
    if (!isFadeMode) return;
    if (
      currentDateYear === prevFadeDateRef.current.getFullYear() &&
      currentDateMonth === prevFadeDateRef.current.getMonth()
    )
      return;

    const isForward = currentDate > prevFadeDateRef.current;
    prevFadeDateRef.current = currentDate;
    setFadeDirection(isForward ? 'forward' : 'backward');

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setIsFadingOut(true);

    // After fade-out completes, swap the displayed month and fade back in
    fadeTimerRef.current = setTimeout(() => {
      setFadeDisplayDate(currentDate);
      setIsFadingOut(false);
    }, STATIC_TRANSITION_DURATION);

    // Only clean up on unmount or rapid navigation (month changed again)
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [currentDateYear, currentDateMonth, isFadeMode]);

  const fadeWeeks = useMemo(
    () => (isFadeMode ? getMonthWeeks(fadeDisplayDate, startOfWeek) : []),
    [isFadeMode, fadeDisplayDate, startOfWeek]
  );

  // Slight horizontal nudge in the direction of navigation, fades alongside opacity
  const fadeStyle = useMemo((): Record<string, string | number> => {
    const xOut = fadeDirection === 'forward' ? '-6%' : '6%';
    return {
      opacity: isFadingOut ? 0 : 1,
      transform: isFadingOut ? `translateX(${xOut})` : 'translateX(0)',
      transition: `opacity ${STATIC_TRANSITION_DURATION}ms ease, transform ${STATIC_TRANSITION_DURATION}ms ease`,
    };
  }, [isFadingOut, fadeDirection]);
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

      const startFull = temporalToVisualDate(event.start, appTimeZone);
      const endFull = event.end
        ? temporalToVisualDate(event.end, appTimeZone)
        : startFull;

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
  }, [events, startOfWeek, appTimeZone]);

  // Responsive configuration
  const { screenSize } = useResponsiveMonthConfig();
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Fixed weekHeight to prevent fluctuations during scrolling
  // Initialize with estimated value based on window height to minimize initial adjustment
  const [weekHeight, setWeekHeight] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_WEEK_HEIGHT;
    const estimatedHeaderHeight = 150;
    const estimatedContainerHeight = window.innerHeight - estimatedHeaderHeight;
    return Math.max(80, Math.ceil(estimatedContainerHeight / 6));
  });
  const [isWeekHeightInitialized, setIsWeekHeightInitialized] = useState(
    () => typeof window !== 'undefined'
  );
  const previousWeekHeightRef = useRef(weekHeight);

  const previousVisibleWeeksRef = useRef<typeof virtualData.visibleItems>([]);

  // ID of newly created event, used to automatically display detail panel
  const [newlyCreatedEventId, setNewlyCreatedEventId] = useState<string | null>(
    null
  );

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
      isResizing?: boolean,
      source?: 'drag' | 'resize'
    ) => {
      const prevEvents = events;
      const newEvents = updateFunc(prevEvents);

      const prevMap = new Map(prevEvents.map(e => [e.id, e]));
      const newSet = new Set(newEvents.map(e => e.id));

      const eventsToDelete = prevEvents.filter(e => !newSet.has(e.id));
      const eventsToAdd = newEvents.filter(e => !prevMap.has(e.id));
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
    onEventCreate: (event: Event) => {
      if (screenSize === 'desktop') {
        app.addEvent(event);
      } else {
        app.onMobileEventDetailToggle(event);
      }
    },
    onEventEdit: (event: Event) => {
      // double-click create event then auto open detail panel
      setNewlyCreatedEventId(event.id);
    },
    currentWeekStart,
    events,
    isMobile: screenSize !== 'desktop',
  });
  const monthDragState = dragState as MonthEventDragState;

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

  const dragPreviewEvent = useMemo(() => {
    if (
      !isDragging ||
      !monthDragState.eventId ||
      !monthDragState.startDate ||
      !monthDragState.endDate ||
      (monthDragState.mode !== 'move' && monthDragState.mode !== 'resize')
    ) {
      return null;
    }

    const baseEvent = events.find(event => event.id === monthDragState.eventId);
    if (!baseEvent) return null;

    return {
      ...baseEvent,
      start: baseEvent.allDay
        ? dateToPlainDate(monthDragState.startDate)
        : dateToZonedDateTime(monthDragState.startDate, appTimeZone),
      end: baseEvent.allDay
        ? dateToPlainDate(monthDragState.endDate)
        : dateToZonedDateTime(monthDragState.endDate, appTimeZone),
    } as Event;
  }, [
    isDragging,
    monthDragState.eventId,
    monthDragState.startDate,
    monthDragState.endDate,
    monthDragState.mode,
    events,
    appTimeZone,
  ]);

  const getWeekEventsWithPreview = useCallback(
    (weekStartDate: Date) => {
      const baseEvents =
        eventsByWeek.get(weekStartDate.getTime()) ?? EMPTY_WEEK_EVENTS;

      if (!dragPreviewEvent) {
        return baseEvents;
      }

      const containsOriginalEvent = baseEvents.some(
        event => event.id === dragPreviewEvent.id
      );
      const previewOverlapsWeek = eventOverlapsWeek(
        dragPreviewEvent,
        weekStartDate,
        startOfWeek,
        appTimeZone
      );

      if (!containsOriginalEvent && !previewOverlapsWeek) {
        return baseEvents;
      }

      const adjustedEvents = baseEvents.filter(
        event => event.id !== dragPreviewEvent.id
      );

      if (previewOverlapsWeek) {
        adjustedEvents.push(dragPreviewEvent);
      }

      return adjustedEvents;
    },
    [eventsByWeek, dragPreviewEvent, startOfWeek, appTimeZone]
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
    snapToMonth: config.snapToMonth,
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
  useLayoutEffect(() => {
    const estimatedHeaderHeight = 150;
    const estimatedContainerHeight = window.innerHeight - estimatedHeaderHeight;
    const height = Math.max(80, Math.ceil(estimatedContainerHeight / 6));
    setWeekHeight(height);
    previousWeekHeightRef.current = height;
    setIsWeekHeightInitialized(true);
  }, []);

  // Block user-initiated scroll in disabled (no-fade) virtual-scroll mode.
  // Keep onScroll active so virtual scroll state still updates on programmatic
  // scrollTo(). Only wheel/touch events are blocked (non-passive → preventDefault works).
  useEffect(() => {
    if (isFadeMode || !scrollDisabled) return;
    const el = scrollElementRef.current;
    if (!el) return;
    const block = (e: globalThis.Event) => e.preventDefault();
    el.addEventListener('wheel', block, { passive: false });
    el.addEventListener('touchmove', block, { passive: false });
    return () => {
      el.removeEventListener('wheel', block);
      el.removeEventListener('touchmove', block);
    };
  }, [isFadeMode, scrollDisabled, scrollElementRef]);

  const handleEventUpdate = useCallback(
    (updatedEvent: Event) => app.updateEvent(updatedEvent.id, updatedEvent),
    [app]
  );

  const handleEventDelete = useCallback(
    (eventId: string) => app.deleteEvent(eventId),
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
          app.onMobileEventDetailToggle(evt);
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

  const getCustomTitle = () => {
    const isAsianLocale = locale.startsWith('zh') || locale.startsWith('ja');

    if (isFadeMode) {
      const labels = getMonthLabels(locale, isAsianLocale ? 'short' : 'long');
      const monthName = labels[fadeDisplayDate.getMonth()];
      const year = fadeDisplayDate.getFullYear();
      return isAsianLocale ? `${year}年${monthName}` : `${monthName} ${year}`;
    }

    return isAsianLocale
      ? `${currentYear}年${currentMonth}`
      : `${currentMonth} ${currentYear}`;
  };

  const handleGridDateClick = useCallback(
    (date: Date, dayEvents: Event[]) => {
      const clickAction = config?.gridDateClick;
      if (!clickAction) {
        app.selectDate(date);
        return;
      }

      if (typeof clickAction === 'function') {
        clickAction(date, dayEvents);
        return;
      }

      if (clickAction === 'week-view') {
        app.setCurrentDate(date);
        app.changeView(ViewType.WEEK);
      } else if (clickAction === 'day-view') {
        app.setCurrentDate(date);
        app.changeView(ViewType.DAY);
      }
      // 'none' → do nothing
    },
    [config.gridDateClick, app]
  );

  const handleGridDateDoubleClick = useCallback(
    (e: MouseEvent | TouchEvent, date: Date, dayEvents: Event[]) => {
      const dblClickAction = config?.gridDateDoubleClick ?? 'week-view';

      if (typeof dblClickAction === 'function') {
        dblClickAction(date, dayEvents);
        return;
      }

      if (dblClickAction === 'week-view') {
        app.setCurrentDate(date);
        app.changeView(ViewType.WEEK);
      } else if (dblClickAction === 'day-view') {
        app.setCurrentDate(date);
        app.changeView(ViewType.DAY);
      }
      // 'none' → do nothing
    },
    [config.gridDateDoubleClick, app]
  );

  return (
    <div className={monthViewContainer}>
      <ViewHeader
        calendar={app}
        viewType={ViewType.MONTH}
        currentDate={currentDate}
        customTitle={getCustomTitle()}
        onPrevious={() => {
          app.goToPrevious();
          if (!isFadeMode) handlePreviousMonth();
        }}
        onNext={() => {
          app.goToNext();
          if (!isFadeMode) handleNextMonth();
        }}
        onToday={() => {
          app.goToToday();
          if (!isFadeMode) handleToday();
        }}
      />

      <div className={weekHeaderRow} onContextMenu={e => e.preventDefault()}>
        <div className={weekGrid}>
          {weekDaysLabels.map((day, i) => (
            <div key={`${day}-${i}`} className={dayLabel}>
              {day}
            </div>
          ))}
        </div>
      </div>

      {isFadeMode ? (
        <div
          ref={scrollElementRef}
          className={`${scrollContainer} df-month-view-fade-scroller`}
          data-layout-ready={isWeekHeightInitialized ? 'true' : 'false'}
        >
          <div className='df-month-view-fade-body' style={fadeStyle}>
            {fadeWeeks.map((weekData, index) => {
              const weekEvents = getWeekEventsWithPreview(weekData.startDate);
              const item = {
                index,
                weekData,
                top: index * weekHeight,
                height: weekHeight,
              };
              const adjustedItem =
                index === 5
                  ? { ...item, height: item.height + remainingSpace }
                  : item;
              return (
                <WeekComponent
                  key={`week-${weekData.startDate.getTime()}`}
                  item={adjustedItem}
                  weekHeight={weekHeight}
                  showWeekNumbers={config.showWeekNumbers}
                  showMonthIndicator={false}
                  currentMonth={''}
                  currentYear={0}
                  screenSize={screenSize}
                  isScrolling={false}
                  calendarRef={calendarRef}
                  events={weekEvents}
                  onEventUpdate={handleEventUpdate}
                  onEventDelete={handleEventDelete}
                  onMoveStart={handleMoveStart}
                  onCreateStart={handleCreateStart}
                  onResizeStart={handleResizeStart}
                  isDragging={isDragging}
                  dragState={monthDragState}
                  newlyCreatedEventId={newlyCreatedEventId}
                  onDetailPanelOpen={handleDetailPanelOpen}
                  onMoreEventsClick={app.onMoreEventsClick}
                  onChangeView={handleChangeView}
                  onSelectDate={app.selectDate}
                  onGridDateClick={handleGridDateClick}
                  onGridDateDoubleClick={handleGridDateDoubleClick}
                  selectedEventId={selectedEventId}
                  onEventSelect={handleWeekEventSelect}
                  onEventLongPress={handleWeekEventLongPress}
                  detailPanelEventId={detailPanelEventId}
                  onDetailPanelToggle={setDetailPanelEventId}
                  useEventDetailPanel={useEventDetailPanel}
                  onCalendarDrop={handleDrop}
                  onCalendarDragOver={handleDragOver}
                  calendarSignature={calendarSignature}
                  app={app}
                  enableTouch={isTouch}
                  appTimeZone={appTimeZone}
                />
              );
            })}
          </div>
        </div>
      ) : (
        // Virtual-scroll mode (default, or disabled without fade)
        <div
          ref={scrollElementRef}
          className={`${scrollContainer} df-month-view-virtual-scroller`}
          data-layout-ready={isWeekHeightInitialized ? 'true' : 'false'}
          onScroll={handleScroll}
        >
          <div style={{ height: topSpacerHeight }} />
          {visibleWeeks.map((item, index) => {
            const weekEvents = getWeekEventsWithPreview(
              item.weekData.startDate
            );

            const adjustedItem =
              index === 5
                ? { ...item, height: item.height + remainingSpace }
                : item;

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
                dragState={monthDragState}
                newlyCreatedEventId={newlyCreatedEventId}
                onDetailPanelOpen={handleDetailPanelOpen}
                onMoreEventsClick={app.onMoreEventsClick}
                onChangeView={handleChangeView}
                onSelectDate={app.selectDate}
                onGridDateClick={handleGridDateClick}
                onGridDateDoubleClick={handleGridDateDoubleClick}
                selectedEventId={selectedEventId}
                onEventSelect={handleWeekEventSelect}
                onEventLongPress={handleWeekEventLongPress}
                detailPanelEventId={detailPanelEventId}
                onDetailPanelToggle={setDetailPanelEventId}
                useEventDetailPanel={useEventDetailPanel}
                onCalendarDrop={handleDrop}
                onCalendarDragOver={handleDragOver}
                calendarSignature={calendarSignature}
                app={app}
                enableTouch={isTouch}
                appTimeZone={appTimeZone}
              />
            );
          })}
          <div style={{ height: bottomSpacerHeight }} />
        </div>
      )}
    </div>
  );
};

export default MonthView;
