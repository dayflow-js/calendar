import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'preact/hooks';
import { WeeksData } from '../../types';
import { generateWeekData, generateWeekRange } from '../../utils';
import {
  UseVirtualMonthScrollProps,
  UseVirtualMonthScrollReturn,
  VIRTUAL_MONTH_SCROLL_CONFIG,
  VirtualWeekItem,
  WeekDataCache,
} from '../../types/monthView';

let cachedConfig: {
  weekHeight: number;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  weeksPerView: number;
} | null = null;

// Responsive configuration Hook
export const useResponsiveMonthConfig = () => {
  const [config, setConfig] = useState<{
    weekHeight: number;
    screenSize: 'mobile' | 'tablet' | 'desktop';
    weeksPerView: number;
  }>(() => {
    // During initialization (SSR/Hydration), use cached value or default
    if (cachedConfig) return cachedConfig;

    return {
      weekHeight: VIRTUAL_MONTH_SCROLL_CONFIG.WEEK_HEIGHT,
      screenSize: 'desktop',
      weeksPerView: 6,
    };
  });

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const headerHeight = 150;
      const availableHeight = height - headerHeight;
      const weeksPerView = 6;
      const dynamicWeekHeight = Math.max(
        80,
        Math.floor(availableHeight / weeksPerView)
      );

      const newConfig = (() => {
        if (width < 768) {
          return {
            weekHeight: Math.max(
              VIRTUAL_MONTH_SCROLL_CONFIG.MOBILE_WEEK_HEIGHT,
              dynamicWeekHeight
            ),
            screenSize: 'mobile' as const,
            weeksPerView,
          };
        } else if (width < 1024) {
          return {
            weekHeight: Math.max(
              VIRTUAL_MONTH_SCROLL_CONFIG.TABLET_WEEK_HEIGHT,
              dynamicWeekHeight
            ),
            screenSize: 'tablet' as const,
            weeksPerView,
          };
        } else {
          return {
            weekHeight: Math.max(
              VIRTUAL_MONTH_SCROLL_CONFIG.WEEK_HEIGHT,
              dynamicWeekHeight
            ),
            screenSize: 'desktop' as const,
            weeksPerView,
          };
        }
      })();

      // Update global cache
      cachedConfig = newConfig;

      // fix: In the mobile month view, when events are initially rendered, only the event start time is shown,
      // but it should show only the event title instead.
      // always sync local state on mount/resize, but skip if effectively the same
      setConfig(prev => {
        if (
          prev.screenSize === newConfig.screenSize &&
          prev.weekHeight === newConfig.weekHeight &&
          prev.weeksPerView === newConfig.weeksPerView
        ) {
          return prev;
        }
        return newConfig;
      });
    };

    updateConfig();
    window.addEventListener('resize', updateConfig);
    return () => window.removeEventListener('resize', updateConfig);
  }, []);

  return config;
};

// Virtual scroll main Hook
export const useVirtualMonthScroll = ({
  currentDate,
  weekHeight,
  onCurrentMonthChange,
  initialWeeksToLoad = 104,
  locale = 'en-US',
  isEnabled = true,
}: UseVirtualMonthScrollProps): UseVirtualMonthScrollReturn => {
  const targetNavigationRef = useRef<{ month: string; year: number } | null>(
    null
  );

  const getMonthName = useCallback(
    (monthIndex: number, year: number) => {
      const date = new Date(year, monthIndex, 1);
      const isAsian = locale.startsWith('zh') || locale.startsWith('ja');
      return date.toLocaleDateString(locale, {
        month: isAsian ? 'short' : 'long',
      });
    },
    [locale]
  );

  const initialWeeksData = useMemo(() => {
    const firstDayOfMonth = new Date(currentDate);
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    return generateWeekRange(firstDayOfMonth, initialWeeksToLoad);
  }, [currentDate, initialWeeksToLoad]);

  const initialScrollTop = useMemo(() => {
    const firstDayOfMonth = new Date(currentDate);
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const targetWeekIndex = initialWeeksData.findIndex(week =>
      week.days.some(
        day => day.date.toDateString() === firstDayOfMonth.toDateString()
      )
    );

    return targetWeekIndex > 0 ? targetWeekIndex * weekHeight : 0;
  }, [initialWeeksData, currentDate, weekHeight]);

  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const [containerHeight, setContainerHeight] = useState(600);
  const [currentMonth, setCurrentMonth] = useState(
    getMonthName(currentDate.getMonth(), currentDate.getFullYear())
  );
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [isScrolling, setIsScrolling] = useState(false);
  const [weeksData, setWeeksData] = useState<WeeksData[]>(initialWeeksData);
  const [isNavigating, setIsNavigating] = useState(false);
  const isNavigatingRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousDateRef = useRef<Date>(currentDate);

  // References and cache
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weekDataCache = useRef(new WeekDataCache());
  const lastScrollTime = useRef(0);
  const lastScrollTop = useRef(0);
  const loadingRef = useRef(false);

  // Callback ref for scroll element
  const scrollElementRefCallback = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) {
        (
          scrollElementRef as React.MutableRefObject<HTMLDivElement | null>
        ).current = element;
      }
    },
    []
  );

  // Cached week data retrieval
  const getCachedWeekData = useCallback((weekStartDate: Date): WeeksData => {
    let weekData = weekDataCache.current.get(weekStartDate);
    console.log('weekData', weekData);

    if (!weekData) {
      weekData = generateWeekData(weekStartDate);
      weekDataCache.current.set(weekStartDate, weekData);
    }

    return weekData;
  }, []);

  // Dynamically load more week data
  const loadMoreWeeks = useCallback(
    (direction: 'past' | 'future', count: number = 26) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      setTimeout(() => {
        try {
          if (direction === 'future') {
            const lastWeek = weeksData[weeksData.length - 1];
            const newWeeks: WeeksData[] = [];

            for (let i = 1; i <= count; i++) {
              const weekStart = new Date(lastWeek.startDate);
              weekStart.setDate(weekStart.getDate() + i * 7);
              newWeeks.push(getCachedWeekData(weekStart));
            }

            setWeeksData(prev => [...prev, ...newWeeks]);
          } else {
            const firstWeek = weeksData[0];
            const newWeeks: WeeksData[] = [];

            for (let i = count; i >= 1; i--) {
              const weekStart = new Date(firstWeek.startDate);
              weekStart.setDate(weekStart.getDate() - i * 7);
              newWeeks.push(getCachedWeekData(weekStart));
            }

            const addedHeight = newWeeks.length * weekHeight;
            setWeeksData(prev => [...newWeeks, ...prev]);

            requestAnimationFrame(() => {
              setScrollTop(prev => prev + addedHeight);
              if (scrollElementRef.current) {
                scrollElementRef.current.scrollTop += addedHeight;
              }
            });
          }
        } finally {
          setTimeout(() => {
            loadingRef.current = false;
          }, 200);
        }
      }, 0);
    },
    [weeksData, getCachedWeekData, weekHeight]
  );

  // Virtual scroll calculation - fixed 6 weeks display
  const virtualData = useMemo(() => {
    const totalHeight = weeksData.length * weekHeight;
    const FIXED_WEEKS_TO_SHOW = 6;

    const startIndex = Math.floor(scrollTop / weekHeight);
    let displayStartIndex = Math.max(0, startIndex);

    displayStartIndex = Math.min(
      displayStartIndex,
      Math.max(0, weeksData.length - FIXED_WEEKS_TO_SHOW)
    );

    const displayEndIndex = Math.min(
      weeksData.length - 1,
      displayStartIndex + FIXED_WEEKS_TO_SHOW - 1
    );

    // Buffer: 15 weeks before and after
    const bufferStart = Math.max(0, displayStartIndex - 15);
    const bufferEnd = Math.min(weeksData.length - 1, displayEndIndex + 15);

    const visibleItems: VirtualWeekItem[] = [];
    for (let i = bufferStart; i <= bufferEnd; i++) {
      visibleItems.push({
        index: i,
        weekData: weeksData[i],
        top: i * weekHeight,
        height: weekHeight,
      });
    }

    return {
      totalHeight,
      visibleItems,
      displayStartIndex,
    };
  }, [scrollTop, containerHeight, weekHeight, weeksData]);

  // Detect currently displayed main month
  const detectCurrentMonth = useCallback(
    (visibleItems: VirtualWeekItem[]) => {
      if (
        isNavigating ||
        isScrolling ||
        visibleItems.length === 0 ||
        !isInitialized
      ) {
        return;
      }

      const viewportCenter = scrollTop + containerHeight / 2;
      const centerItem =
        visibleItems.find(
          item =>
            item.top <= viewportCenter &&
            item.top + item.height > viewportCenter
        ) || visibleItems[Math.floor(visibleItems.length / 2)];

      if (!centerItem) return;

      const monthDayCounts: Record<string, number> = {};

      centerItem.weekData.days.forEach(day => {
        const monthKey = `${getMonthName(day.month, day.year)}-${day.year}`;
        monthDayCounts[monthKey] = (monthDayCounts[monthKey] || 0) + 1;
      });

      let weekDominantMonth = '';
      let weekDominantYear = 0;
      let maxDays = 0;

      Object.entries(monthDayCounts).forEach(([monthKey, days]) => {
        if (days > maxDays) {
          maxDays = days;
          const [month, year] = monthKey.split('-');
          weekDominantMonth = month;
          weekDominantYear = parseInt(year);
        }
      });

      if (weekDominantMonth && weekDominantYear) {
        if (targetNavigationRef.current) {
          if (
            weekDominantMonth === targetNavigationRef.current.month &&
            weekDominantYear === targetNavigationRef.current.year
          ) {
            targetNavigationRef.current = null;

            if (
              weekDominantMonth !== currentMonth ||
              weekDominantYear !== currentYear
            ) {
              setCurrentMonth(weekDominantMonth);
              setCurrentYear(weekDominantYear);
              onCurrentMonthChange?.(weekDominantMonth, weekDominantYear);
            }
          }
        } else {
          if (
            weekDominantMonth !== currentMonth ||
            weekDominantYear !== currentYear
          ) {
            setCurrentMonth(weekDominantMonth);
            setCurrentYear(weekDominantYear);
            onCurrentMonthChange?.(weekDominantMonth, weekDominantYear);
          }
        }
      }
    },
    [
      containerHeight,
      currentMonth,
      currentYear,
      isNavigating,
      isScrolling,
      onCurrentMonthChange,
      scrollTop,
      isInitialized,
    ]
  );

  // Scroll handler
  const handleScroll = useCallback(
    (e: any) => {
      const now = performance.now();
      if (
        now - lastScrollTime.current <
        VIRTUAL_MONTH_SCROLL_CONFIG.SCROLL_THROTTLE
      )
        return;
      lastScrollTime.current = now;

      const element = e.currentTarget;
      const newScrollTop = element.scrollTop;
      lastScrollTop.current = newScrollTop;

      setScrollTop(newScrollTop);

      // Only trigger automatic data loading in non-navigation state
      if (!isNavigating) {
        requestAnimationFrame(() => {
          const { scrollHeight, clientHeight } = element;

          if (
            newScrollTop + clientHeight > scrollHeight - weekHeight * 10 &&
            !loadingRef.current
          ) {
            loadMoreWeeks('future', 26);
          }

          if (newScrollTop < weekHeight * 10 && !loadingRef.current) {
            loadMoreWeeks('past', 26);
          }
        });
      }

      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, VIRTUAL_MONTH_SCROLL_CONFIG.SCROLL_DEBOUNCE);
    },
    [weekHeight, loadMoreWeeks, isNavigating]
  );

  // Scroll to specified date
  const scrollToDate = useCallback(
    (targetDate: Date, smooth = true) => {
      if (!scrollElementRef.current) return;

      setIsNavigating(true);
      isNavigatingRef.current = true;

      const resetNavigatingState = () => {
        const delay = smooth ? 500 : 200;
        setTimeout(() => {
          setIsNavigating(false);
          isNavigatingRef.current = false;
        }, delay);
      };

      const targetWeekIndex = weeksData.findIndex(week =>
        week.days.some(
          day => day.date.toDateString() === targetDate.toDateString()
        )
      );

      if (targetWeekIndex !== -1) {
        const targetTop = targetWeekIndex * weekHeight;

        scrollElementRef.current.scrollTo({
          top: targetTop,
          behavior: smooth ? 'smooth' : 'auto',
        });
        resetNavigatingState();
        return;
      }

      // Calculate Monday of the week containing target date
      const dayOfWeek = targetDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const targetWeekStart = new Date(targetDate);
      targetWeekStart.setDate(targetDate.getDate() - daysToMonday);
      targetWeekStart.setHours(0, 0, 0, 0);

      const firstWeek = weeksData[0];
      const lastWeek = weeksData[weeksData.length - 1];

      let weeksDiff = 0;
      let needsPastData = false;
      let needsFutureData = false;

      if (targetWeekStart < firstWeek.startDate) {
        weeksDiff = Math.ceil(
          (firstWeek.startDate.getTime() - targetWeekStart.getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        );
        needsPastData = true;
      } else if (targetWeekStart > lastWeek.startDate) {
        weeksDiff = Math.ceil(
          (targetWeekStart.getTime() - lastWeek.startDate.getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        );
        needsFutureData = true;
      }

      const maxBatchSize = 52;
      const batchSize = Math.min(weeksDiff + 10, maxBatchSize);

      if (needsPastData) {
        const newWeeks: WeeksData[] = [];
        for (let i = batchSize; i >= 1; i--) {
          const weekStart = new Date(firstWeek.startDate);
          weekStart.setDate(weekStart.getDate() - i * 7);
          newWeeks.push(getCachedWeekData(weekStart));
        }

        const addedHeight = newWeeks.length * weekHeight;
        setWeeksData(prev => [...newWeeks, ...prev]);

        requestAnimationFrame(() => {
          const combinedWeeks = [...newWeeks, ...weeksData];
          const newTargetIndex = combinedWeeks.findIndex(week =>
            week.days.some(
              day => day.date.toDateString() === targetDate.toDateString()
            )
          );

          if (scrollElementRef.current && newTargetIndex !== -1) {
            const targetTop = newTargetIndex * weekHeight;
            scrollElementRef.current.scrollTop += addedHeight;
            setScrollTop(prev => prev + addedHeight);

            setTimeout(() => {
              if (scrollElementRef.current) {
                scrollElementRef.current.scrollTo({
                  top: targetTop,
                  behavior: smooth ? 'smooth' : 'auto',
                });
              }
            }, 50);
          }
          resetNavigatingState();
        });
      } else if (needsFutureData) {
        const newWeeks: WeeksData[] = [];
        for (let i = 1; i <= batchSize; i++) {
          const weekStart = new Date(lastWeek.startDate);
          weekStart.setDate(weekStart.getDate() + i * 7);
          newWeeks.push(getCachedWeekData(weekStart));
        }

        setWeeksData(prev => [...prev, ...newWeeks]);

        requestAnimationFrame(() => {
          const combinedWeeks = [...weeksData, ...newWeeks];
          const newTargetIndex = combinedWeeks.findIndex(week =>
            week.days.some(
              day => day.date.toDateString() === targetDate.toDateString()
            )
          );

          if (scrollElementRef.current && newTargetIndex !== -1) {
            const targetTop = newTargetIndex * weekHeight;
            scrollElementRef.current.scrollTo({
              top: targetTop,
              behavior: smooth ? 'smooth' : 'auto',
            });
          }
          resetNavigatingState();
        });
      } else {
        resetNavigatingState();
      }
    },
    [weeksData, weekHeight, getCachedWeekData]
  );

  // Navigation functions
  const handlePreviousMonth = useCallback(() => {
    // use weeksData which contains month info.
    const displayWeek = weeksData[virtualData.displayStartIndex];
    const firstDayOfDisplay = displayWeek.days[0].date;
    const targetDate = new Date(
      firstDayOfDisplay.getFullYear(),
      firstDayOfDisplay.getMonth() - 1,
      1
    );
    scrollToDate(targetDate);
  }, [virtualData.displayStartIndex, weeksData, scrollToDate]);

  const handleNextMonth = useCallback(() => {
    const displayWeek = weeksData[virtualData.displayStartIndex];
    const firstDayOfDisplay = displayWeek.days[0].date;
    const targetDate = new Date(
      firstDayOfDisplay.getFullYear(),
      firstDayOfDisplay.getMonth() + 1,
      1
    );
    scrollToDate(targetDate);
  }, [virtualData.displayStartIndex, weeksData, scrollToDate]);

  const handleToday = useCallback(() => {
    const today = new Date();
    const todayMonth = getMonthName(today.getMonth(), today.getFullYear());
    const todayYear = today.getFullYear();

    // Create date of first day of current month
    const firstDayOfMonth = new Date(todayYear, today.getMonth(), 1);

    targetNavigationRef.current = { month: todayMonth, year: todayYear };
    setCurrentMonth(todayMonth);
    setCurrentYear(todayYear);
    onCurrentMonthChange?.(todayMonth, todayYear);

    // Find week containing first day of current month
    const targetWeekIndex = weeksData.findIndex(week =>
      week.days.some(
        day => day.date.toDateString() === firstDayOfMonth.toDateString()
      )
    );

    if (targetWeekIndex !== -1) {
      const targetTop = targetWeekIndex * weekHeight;
      const element = scrollElementRef.current;

      if (element) {
        // First set navigation state (set both state and ref)
        setIsNavigating(true);
        isNavigatingRef.current = true;

        // Wait for next frame to ensure isNavigating state is updated
        requestAnimationFrame(() => {
          // Set scrollTop state, trigger virtual scroll recalculation
          setScrollTop(targetTop);

          // Wait another frame to set DOM scrollTop
          requestAnimationFrame(() => {
            if (element) {
              element.scrollTop = targetTop;

              // Delay reset navigation state
              setTimeout(() => {
                isNavigatingRef.current = false;
                setIsNavigating(false);
              }, 200);
            }
          });
        });
      }
    } else {
      // If first day of current month not found in current data, use scrollToDate method
      setIsNavigating(true);
      isNavigatingRef.current = true;
      requestAnimationFrame(() => {
        scrollToDate(firstDayOfMonth, true);
        setTimeout(() => {
          isNavigatingRef.current = false;
          setIsNavigating(false);
        }, 200);
      });
    }
  }, [weeksData, weekHeight, onCurrentMonthChange, scrollToDate]);

  // Detect current month change
  useEffect(() => {
    detectCurrentMonth(virtualData.visibleItems);
  }, [virtualData.visibleItems, detectCurrentMonth]);

  useEffect(() => {
    const previousDate = previousDateRef.current;
    const prevMonth = previousDate.getMonth();
    const prevYear = previousDate.getFullYear();
    const nextMonth = currentDate.getMonth();
    const nextYear = currentDate.getFullYear();

    if (prevMonth !== nextMonth || prevYear !== nextYear) {
      // Check if the new date is already visible in the current viewport
      const FIXED_WEEKS_TO_SHOW = 6;
      const startIndex = virtualData.displayStartIndex;
      const endIndex = Math.min(
        weeksData.length - 1,
        startIndex + FIXED_WEEKS_TO_SHOW - 1
      );

      let isVisible = false;

      // Iterate through the visible weeks to see if the date is there
      for (let i = startIndex; i <= endIndex; i++) {
        const week = weeksData[i];
        if (
          week &&
          week.days.some(
            day => day.date.toDateString() === currentDate.toDateString()
          )
        ) {
          isVisible = true;
          break;
        }
      }

      if (!isVisible) {
        const firstDayOfMonth = new Date(nextYear, nextMonth, 1);
        const monthName = getMonthName(nextMonth, nextYear);

        targetNavigationRef.current = { month: monthName, year: nextYear };
        setCurrentMonth(monthName);
        setCurrentYear(nextYear);
        onCurrentMonthChange?.(monthName, nextYear);
        scrollToDate(firstDayOfMonth, true);
      }
    }

    previousDateRef.current = currentDate;
  }, [
    currentDate,
    onCurrentMonthChange,
    scrollToDate,
    virtualData,
    weeksData,
    getMonthName,
  ]);

  // Container size listener
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element || isInitialized || !isEnabled) return;

    requestAnimationFrame(() => {
      if (element && initialScrollTop > 0) {
        element.scrollTop = initialScrollTop;
        setScrollTop(initialScrollTop);
        setIsInitialized(true);
      } else if (element) {
        setIsInitialized(true);
      }
    });
  }, [isInitialized, initialScrollTop, isEnabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return {
    scrollTop,
    containerHeight,
    currentMonth,
    currentYear,
    isScrolling,
    isNavigating,
    virtualData,
    scrollElementRef,
    handleScroll,
    scrollToDate,
    handlePreviousMonth,
    handleNextMonth,
    handleToday,
    setScrollTop,
    setContainerHeight,
    setCurrentMonth,
    setCurrentYear,
    setIsScrolling,
    cache: weekDataCache.current,
    scrollElementRefCallback,
    weeksData,
  };
};
