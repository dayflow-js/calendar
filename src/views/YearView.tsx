import React, { useState, useEffect, useCallback, useRef } from 'react';
import { monthNames } from '@/utils';
import { CalendarApp } from '@/core';
import {
  useVirtualScroll,
  useResponsiveConfig,
  YearDataCache,
  VIRTUAL_SCROLL_CONFIG,
} from '@/hooks/virtualScroll';
import { VirtualItem, ViewType } from '@/types';
import ViewHeader, { ViewSwitcherMode } from '@/components/common/ViewHeader';

interface YearViewProps {
  app: CalendarApp; // Required prop, provided by CalendarRenderer
  switcherMode?: ViewSwitcherMode;
}

interface MonthData {
  year: number;
  month: number;
  monthName: string;
  days: Array<{
    date: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    fullDate: Date;
  }>;
}

interface YearData {
  year: number;
  months: MonthData[];
}

// Main component
const VirtualizedYearView: React.FC<YearViewProps> = ({
  app,
  switcherMode = 'buttons',
}) => {
  const currentDate = app.getCurrentDate();

  // Responsive configuration
  const { yearHeight: responsiveYearHeight, screenSize } = useResponsiveConfig();
  const YEAR_TITLE_HEIGHT = 48; // Height of year title in content area (py-2 = 8px*2 + text-2xl line-height ≈ 32px)
  const STICKY_PUSH_GAP = 20;

  // State management
  const [showDebugger, setShowDebugger] = useState(false);
  const [virtualYearHeight, setVirtualYearHeight] = useState<number>(
    responsiveYearHeight
  );
  const [headerHeight, setHeaderHeight] = useState(72);
  const [stickyHeaderState, setStickyHeaderState] = useState({
    stickyYear: currentDate.getFullYear() as number | null,
    nextYear: null as number | null,
    stickyOffset: 0,
    nextOffset: YEAR_TITLE_HEIGHT + STICKY_PUSH_GAP,
  });
  const headerRef = useRef<HTMLDivElement | null>(null);
  const yearTitleElementsRef = React.useRef(
    new Map<number, HTMLDivElement | null>()
  );
  const stickyUpdateRafRef = React.useRef<number | null>(null);
  const yearContainerElementsRef = React.useRef(
    new Map<number, HTMLDivElement | null>()
  );
  const yearContainerObserverRef = React.useRef<ResizeObserver | null>(null);

  useEffect(() => {
    setVirtualYearHeight(responsiveYearHeight);
  }, [responsiveYearHeight]);

  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;

    const updateHeight = (height: number) => {
      const roundedHeight = Math.round(height);
      setHeaderHeight(prev =>
        Math.abs(prev - roundedHeight) > 1 ? roundedHeight : prev
      );
    };

    updateHeight(element.getBoundingClientRect().height);

    const observer = new ResizeObserver(entries => {
      entries.forEach(entry => {
        updateHeight(entry.contentRect.height);
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Cache and references
  const yearDataCache = React.useRef(new YearDataCache<YearData>());
  const todayRef = React.useRef(new Date());

  // Virtual scroll
  const {
    currentYear,
    virtualData,
    scrollElementRef,
    handleScroll,
    scrollToYear,
    handlePreviousYear,
    handleNextYear,
    handleToday: virtualHandleToday,
  } = useVirtualScroll({
    currentDate,
    yearHeight: virtualYearHeight,
  });

  // Calculate virtualYearHeight based on full viewport height
  // Each year fills the entire viewport (year title + spacer + month grid)
  // When scrolled to a year: title is covered by ViewHeader, months are fully visible
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    const updateYearHeight = () => {
      // Full viewport height = scroll container clientHeight
      const viewportHeight = scrollElement.clientHeight;
      if (viewportHeight > 0) {
        setVirtualYearHeight(prev =>
          Math.abs(prev - viewportHeight) > 1 ? viewportHeight : prev
        );
      }
    };

    // Initial calculation after layout
    updateYearHeight();

    // Listen for resize
    const resizeObserver = new ResizeObserver(() => {
      updateYearHeight();
    });

    resizeObserver.observe(scrollElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollElementRef]);

  const updateStickyHeaderFromDom = useCallback(() => {
    const container = scrollElementRef.current;
    if (!container || !container.isConnected) return;

    const containerTop = container.getBoundingClientRect().top;

    let stickyCandidateYear: number | null = null;
    let stickyCandidateDistance = -Infinity;
    let nextCandidateYear: number | null = null;
    let nextCandidateDistance = Infinity;
    let nextCandidateHeight = YEAR_TITLE_HEIGHT;

    yearTitleElementsRef.current.forEach((element, year) => {
      if (!element || !element.isConnected) return;
      const rect = element.getBoundingClientRect();
      const distance = rect.top - containerTop;

      if (distance <= 0) {
        if (distance > stickyCandidateDistance) {
          stickyCandidateYear = year;
          stickyCandidateDistance = distance;
        }
      } else if (distance < nextCandidateDistance) {
        nextCandidateYear = year;
        nextCandidateDistance = distance;
        nextCandidateHeight = rect.height;
      }
    });

    const pushDistance = nextCandidateHeight + STICKY_PUSH_GAP;

    let stickyYear = stickyCandidateYear;
    let nextYear: number | null = null;
    let stickyOffset = 0;
    let nextOffset = pushDistance;

    if (stickyYear !== null && nextCandidateYear !== null) {
      if (nextCandidateDistance <= pushDistance) {
        nextYear = nextCandidateYear;
        stickyOffset = pushDistance - nextCandidateDistance;
        nextOffset = Math.max(0, nextCandidateDistance);
      }
    }

    setStickyHeaderState(prev => {
      if (
        prev.stickyYear === stickyYear &&
        prev.nextYear === nextYear &&
        prev.stickyOffset === stickyOffset &&
        prev.nextOffset === nextOffset
      ) {
        return prev;
      }

      return { stickyYear, nextYear, stickyOffset, nextOffset };
    });
  }, [STICKY_PUSH_GAP, YEAR_TITLE_HEIGHT, scrollElementRef]);

  const scheduleStickyHeaderUpdate = useCallback(() => {
    if (stickyUpdateRafRef.current !== null) return;

    stickyUpdateRafRef.current = requestAnimationFrame(() => {
      stickyUpdateRafRef.current = null;
      updateStickyHeaderFromDom();
    });
  }, [updateStickyHeaderFromDom]);

  useEffect(() => {
    return () => {
      if (stickyUpdateRafRef.current !== null) {
        cancelAnimationFrame(stickyUpdateRafRef.current);
      }
    };
  }, []);

  const registerYearContainer = useCallback(
    (year: number) => (element: HTMLDivElement | null) => {
      const map = yearContainerElementsRef.current;
      const previous = map.get(year);

      if (previous && yearContainerObserverRef.current) {
        yearContainerObserverRef.current.unobserve(previous);
      }

      if (element) {
        map.set(year, element);
        yearContainerObserverRef.current?.observe(element);
      } else {
        map.delete(year);
      }

      scheduleStickyHeaderUpdate();
    },
    [scheduleStickyHeaderUpdate]
  );

  const registerYearTitle = useCallback(
    (year: number) => (element: HTMLDivElement | null) => {
      const map = yearTitleElementsRef.current;
      if (element) {
        map.set(year, element);
      } else {
        map.delete(year);
      }

      scheduleStickyHeaderUpdate();
    },
    [scheduleStickyHeaderUpdate]
  );

  useEffect(() => {
    scheduleStickyHeaderUpdate();
  }, [scheduleStickyHeaderUpdate]);

  useEffect(() => {
    scheduleStickyHeaderUpdate();
  }, [virtualYearHeight, scheduleStickyHeaderUpdate]);

  const stickyYearValue = stickyHeaderState.stickyYear;
  const upcomingYear = stickyHeaderState.nextYear;

  const handleYearViewScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      handleScroll(event);
      scheduleStickyHeaderUpdate();
    },
    [handleScroll, scheduleStickyHeaderUpdate]
  );

  // High-performance month data generation
  const generateMonthData = useCallback(
    (year: number, month: number): MonthData => {
      const firstDay = new Date(year, month, 1);
      // const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek =
        firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

      const days = [];
      const today = todayRef.current;
      const selected = currentDate;

      // Batch generate 42 days of data
      for (let i = 0; i < 42; i++) {
        const dayOffset = i - firstDayOfWeek;
        const date = new Date(year, month, dayOffset + 1);
        const dayNum = date.getDate();
        const isCurrentMonth = date.getMonth() === month;

        days.push({
          date: dayNum,
          isCurrentMonth,
          isToday:
            isCurrentMonth && date.toDateString() === today.toDateString(),
          isSelected:
            isCurrentMonth && date.toDateString() === selected.toDateString(),
          fullDate: date,
        });
      }

      return { year, month, monthName: monthNames[month], days };
    },
    [currentDate]
  );

  // Cached year data retrieval
  const getYearData = useCallback(
    (year: number): YearData => {
      let yearData = yearDataCache.current.get(year);

      if (!yearData) {
        const months = [];
        for (let month = 0; month < 12; month++) {
          months.push(generateMonthData(year, month));
        }
        yearData = { year, months };
        yearDataCache.current.set(year, yearData);
      }

      return yearData;
    },
    [generateMonthData]
  );

  // Navigation functions
  const handleToday = useCallback(() => {
    app.goToToday();
    virtualHandleToday();
  }, [app, virtualHandleToday]);

  // Ensure scroll to current year on mount only (not on every render)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      const targetYear = currentDate.getFullYear();
      scrollToYear(targetYear, false);
      hasInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handlePreviousYear();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleNextYear();
          break;
        case 'Home':
          e.preventDefault();
          handleToday();
          break;
        case 'PageUp':
          e.preventDefault();
          const prev = Math.max(
            VIRTUAL_SCROLL_CONFIG.MIN_YEAR,
            currentYear - 5
          );
          scrollToYear(prev);
          break;
        case 'PageDown':
          e.preventDefault();
          const next = Math.min(
            VIRTUAL_SCROLL_CONFIG.MAX_YEAR,
            currentYear + 5
          );
          scrollToYear(next);
          break;
        case 'F12':
          if (e.shiftKey) {
            e.preventDefault();
            setShowDebugger(!showDebugger);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentYear,
    handlePreviousYear,
    handleNextYear,
    handleToday,
    scrollToYear,
    showDebugger,
  ]);


  // Month component - optimized for mobile display
  const MonthComponent = React.memo<{ monthData: MonthData }>(
    ({ monthData }) => {
      return (
        <div className="h-fit">
          <div
            className={`text-red-600 font-semibold mb-1 ${screenSize === 'mobile' ? 'text-xs' : 'text-xs sm:text-sm'
              } `}
          >
            {monthData.monthName}
          </div>

          <div className="grid grid-cols-7 gap-0 mb-0.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div
                key={i}
                className={`text-center text-gray-500 py-0.5 text-xs w-10`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-6 gap-0">
            {monthData.days.map((day, i) => (
              <button
                key={i}
                className={`
                text-center rounded-sm transition-colors
                w-10
                ${screenSize === 'mobile'
                    ? 'text-xs py-1 min-h-[18px]'
                    : 'text-xs py-1 sm:py-1.5 min-h-[20px] sm:min-h-[26px]'
                  }
                ${day.isCurrentMonth
                    ? 'text-gray-900 font-medium hover:bg-gray-100 active:bg-gray-200'
                    : 'text-gray-300 cursor-not-allowed'
                  }
                ${day.isToday
                    ? 'bg-red-500 text-white hover:bg-red-600 font-bold shadow-sm ring-2 ring-red-200'
                    : ''
                  }
                ${day.isSelected && !day.isToday
                    ? 'bg-red-100 text-red-600 font-semibold ring-1 ring-red-300'
                    : ''
                  }
              `}
                onClick={() =>
                  day.isCurrentMonth && app.selectDate(day.fullDate)
                }
                disabled={!day.isCurrentMonth}
              >
                {day.date}
              </button>
            ))}
          </div>
        </div>
      );
    }
  );

  // Spacer height: gap between year title and month grid to ensure months start below ViewHeader
  // Year title area = pt-2 (8px) + YEAR_TITLE_HEIGHT (48px) = 56px
  // Spacer fills the gap: headerHeight - 56px
  const spacerHeight = Math.max(0, headerHeight - YEAR_TITLE_HEIGHT - 8);

  // Virtual year item
  const VirtualYearItem = React.memo<{ item: VirtualItem; spacer: number }>(({ item, spacer }) => {
    const yearData = getYearData(item.year);

    return (
      <div
        ref={registerYearContainer(item.year)}
        className="absolute w-full"
        style={{
          top: item.top,
          height: item.height,
          contain: 'layout style paint',
          scrollSnapAlign: 'start',
        }}
      >
        <div className="px-4 pt-2 bg-white h-full">
          {/* Year header - visible in content, will be covered by ViewHeader when at top */}
          <div
            ref={registerYearTitle(item.year)}
            className="text-2xl font-bold text-gray-900 dark:text-gray-100 py-2 px-2"
          >
            {item.year}
          </div>

          {spacer > 0 && <div style={{ height: spacer }} />}
          <div className="mx-auto px-2 pb-2">
            {/* Month grid - optimized layout to fit in one screen */}
            <div
              className={`grid ${screenSize === 'mobile'
                ? 'grid-cols-2 gap-y-4 gap-x-2' // Mobile: vertical gap 4, horizontal gap 2
                : screenSize === 'tablet'
                  ? 'grid-cols-3 gap-y-5 gap-x-3' // Tablet: vertical gap 5, horizontal gap 3
                  : 'grid-cols-4 gap-y-6 gap-x-4' // Desktop: vertical gap 6, horizontal gap 4
                }`}
            >
              {yearData.months.map(monthData => (
                <MonthComponent
                  key={`${monthData.year}-${monthData.month}`}
                  monthData={monthData}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  });

  MonthComponent.displayName = 'MonthComponent';
  VirtualYearItem.displayName = 'VirtualYearItem';

  return (
    <div className="relative bg-white shadow-md w-full overflow-hidden h-full">
      {/* Virtual scroll container - fills entire space */}
      <div
        ref={scrollElementRef}
        className="absolute inset-0 overflow-auto bg-white"
        onScroll={handleYearViewScroll}
        style={{
          contain: 'layout style paint',
          scrollBehavior: 'auto',
          scrollSnapType: 'y mandatory',
          scrollPaddingTop: `${headerHeight}px`,
        }}
      >
        <div className="relative" style={{ height: virtualData.totalHeight }}>
          {virtualData.visibleItems.map(item => (
            <VirtualYearItem key={item.year} item={item} spacer={spacerHeight} />
          ))}
        </div>
      </div>

      {/* Header navigation - overlays on top of scroll container */}
      <div
        ref={headerRef}
        className="absolute top-0 left-0 right-0 z-10 bg-white"
      >
        <ViewHeader
          calendar={app}
          viewType={ViewType.YEAR}
          currentDate={currentDate}
          onPrevious={() => app.goToPrevious()}
          onNext={() => app.goToNext()}
          onToday={() => app.goToToday()}
          switcherMode={switcherMode}
          stickyYear={stickyYearValue}
          stickyYearOffset={stickyHeaderState.stickyOffset}
          nextYear={upcomingYear}
          nextYearOffset={stickyHeaderState.nextOffset}
        />
      </div>

    </div>
  );
};

export default VirtualizedYearView;
