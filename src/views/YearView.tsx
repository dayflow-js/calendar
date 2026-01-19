import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale } from '@/locale';
import { CalendarApp } from '@/core';
import {
  useVirtualScroll,
  useResponsiveConfig,
  YearDataCache,
  VIRTUAL_SCROLL_CONFIG,
} from '@/hooks/virtualScroll';
import { VirtualItem } from '@/types';

interface YearViewProps {
  app: CalendarApp; // Required prop, provided by CalendarRenderer
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

import ViewHeader from '@/components/common/ViewHeader';

// Main component
const VirtualizedYearView: React.FC<YearViewProps> = ({ app }) => {
  const { t, getWeekDaysLabels, locale } = useLocale();
  const currentDate = app.getCurrentDate();

  // Responsive configuration
  const { yearHeight, screenSize } = useResponsiveConfig();

  // State management
  const [showDebugger, setShowDebugger] = useState(false);

  // Cache and references
  const yearDataCache = React.useRef(new YearDataCache<YearData>());
  const todayRef = React.useRef(new Date());

  // Virtual scroll
  const {
    currentYear,
    isScrolling,
    virtualData,
    scrollElementRef,
    handleScroll,
    scrollToYear,
    handlePreviousYear,
    handleNextYear,
    handleToday: virtualHandleToday,
  } = useVirtualScroll({
    currentDate,
    yearHeight,
  });

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

      const monthDate = new Date(year, month, 1);
      const localizedMonthName = monthDate.toLocaleDateString(locale, { month: 'long' });

      return { year, month, monthName: localizedMonthName, days };
    },
    [currentDate, locale]
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

  const weekDayLabels = useMemo(() => {
    return getWeekDaysLabels(locale, 'narrow');
  }, [locale, getWeekDaysLabels]);

  // Navigation functions
  const handleToday = useCallback(() => {
    app.goToToday();
    virtualHandleToday();
  }, [app, virtualHandleToday]);

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
            className={`text-red-600 font-semibold mb-2 sm:mb-3 ${screenSize === 'mobile' ? 'text-xs' : 'text-xs sm:text-sm'
              } `}
          >
            {monthData.monthName}
          </div>

          <div className="grid grid-cols-7 gap-0 mb-1 sm:mb-2">
            {weekDayLabels.map((day, i) => (
              <div
                key={i}
                className={`text-center text-gray-500 py-0.5 text-xs w-10`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {monthData.days.map((day, i) => (
              <button
                key={i}
                className={`
                text-center rounded-sm transition-colors
                w-10
                ${screenSize === 'mobile'
                    ? 'text-xs py-1 min-h-4.5'
                    : 'text-xs py-1 sm:py-1.5 min-h-5 sm:min-h-6.5'
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

  // Virtual year item
  const VirtualYearItem = React.memo<{ item: VirtualItem }>(({ item }) => {
    const yearData = getYearData(item.year);

    return (
      <div
        className="absolute w-full"
        style={{
          top: item.top,
          height: item.height,
          contain: 'layout style paint',
        }}
      >
        <div className="px-4 py-2 bg-white">
          <div className="mx-auto px-8">
            {/* Month grid - corrected to 3 rows 4 columns layout */}
            <div
              className={`grid gap-3 lg:gap-8 ${screenSize === 'mobile'
                ? 'grid-cols-2 grid-rows-6' // Mobile: 2 columns 6 rows
                : screenSize === 'tablet'
                  ? 'grid-cols-3 grid-rows-4' // Tablet: 3 columns 4 rows
                  : 'grid-cols-4 grid-rows-3' // Desktop: 4 columns 3 rows
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
    <div className="relative flex flex-col bg-white shadow-md w-full overflow-hidden h-full">
      {/* Header navigation */}
      <ViewHeader
        calendar={app}
        viewType="year"
        currentDate={currentDate}
        customTitle={currentYear.toString()}
        onPrevious={() => {
          app.goToPrevious();
          handlePreviousYear();
        }}
        onNext={() => {
          app.goToNext();
          handleNextYear();
        }}
        onToday={handleToday}
      />

      {/* Scrolling year indicator */}
      {isScrolling && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-40 bg-white/95 backdrop-blur-sm py-2 px-4 rounded-lg shadow-lg border border-gray-200 transition-all duration-200 pointer-events-none">
          <span className="text-xl font-bold text-gray-900">{currentYear}</span>
        </div>
      )}

      {/* Virtual scroll container - completely seamless */}
      <div
        ref={scrollElementRef}
        className="flex-1 overflow-auto bg-gray-50"
        onScroll={handleScroll}
        style={{
          contain: 'layout style paint',
          scrollBehavior: 'auto',
        }}
      >
        <div className="relative" style={{ height: virtualData.totalHeight }}>
          {virtualData.visibleItems.map(item => (
            <VirtualYearItem key={item.year} item={item} />
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-30 hover:opacity-70 transition-opacity">
        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded">
          {Math.round(
            ((currentYear - VIRTUAL_SCROLL_CONFIG.MIN_YEAR) /
              (VIRTUAL_SCROLL_CONFIG.MAX_YEAR -
                VIRTUAL_SCROLL_CONFIG.MIN_YEAR)) *
            100
          )}
          %
        </div>
      </div>
    </div>
  );
};

export default VirtualizedYearView;