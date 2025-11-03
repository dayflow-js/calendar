import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarSidebarRenderProps, CalendarType } from '@/types';
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen } from 'lucide-react';

import {
  miniCalendarDay,
  miniCalendarDayHeader,
  miniCalendarGrid,
  miniCalendarCurrentMonth,
  miniCalendarOtherMonth,
  miniCalendarToday,
  miniCalendarSelected,
} from '@/styles/classNames';
import { generateUniKey, weekDays } from '@/utils/helpers';

const getCalendarInitials = (calendar: CalendarType): string => {
  if (calendar.icon) {
    return calendar.icon;
  }
  const name = calendar.name || calendar.id;
  return name.charAt(0).toUpperCase();
};

const DefaultCalendarSidebar: React.FC<CalendarSidebarRenderProps> = ({
  app,
  calendars,
  toggleCalendarVisibility,
  isCollapsed,
  setCollapsed,
}) => {
  const currentDate = app.getCurrentDate();
  const visibleMonthDate = app.getVisibleMonth();
  const visibleYear = visibleMonthDate.getFullYear();
  const visibleMonthIndex = visibleMonthDate.getMonth();

  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    return new Date(visibleYear, visibleMonthIndex, 1);
  });

  useEffect(() => {
    setVisibleMonth(prev => {
      if (
        prev.getFullYear() === visibleYear &&
        prev.getMonth() === visibleMonthIndex
      ) {
        return prev;
      }
      return new Date(visibleYear, visibleMonthIndex, 1);
    });
  }, [visibleYear, visibleMonthIndex]);

  const todayKey = useMemo(() => new Date().toDateString(), []);
  const currentDateKey = currentDate.toDateString();

  const weekdayLabels = useMemo(() => weekDays.map(day => day.charAt(0)), []);

  const miniCalendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday as first day
    const totalCells = 42;
    const days: Array<{
      date: number;
      fullDate: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    for (let cell = 0; cell < totalCells; cell++) {
      const cellDate = new Date(year, month, cell - startOffset + 1);
      const cellDateString = cellDate.toDateString();
      days.push({
        date: cellDate.getDate(),
        fullDate: cellDate,
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: cellDateString === todayKey,
        isSelected: cellDateString === currentDateKey,
      });
    }

    return days;
  }, [visibleMonth, currentDateKey, todayKey]);

  const monthLabel = useMemo(
    () =>
      visibleMonth.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [visibleMonth]
  );

  const handleMonthChange = useCallback(
    (offset: number) => {
      setVisibleMonth(prev => {
        const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
        app.setVisibleMonth(next);
        return next;
      });
    },
    [app]
  );

  const handleDateSelect = useCallback(
    (date: Date) => {
      const nextDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      app.setCurrentDate(nextDate);
      setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    },
    [app]
  );

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white dark:bg-slate-900">
      <div className="flex items-center px-3 py-2">
        <button
          type="button"
          aria-label={isCollapsed ? 'Expand calendar sidebar' : 'Collapse calendar sidebar'}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800"
          onClick={() => setCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <PanelRightClose className="h-4 w-4 text-gray-500" />
          ) : (
            <PanelRightOpen className="h-4 w-4 text-gray-500" />
          )}
        </button>
        {!isCollapsed && (
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Calendars
          </span>
        )}
      </div>

      {!isCollapsed ? (
        <>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <ul className="space-y-1">
              {calendars.map(calendar => {
                const isVisible = calendar.isVisible !== false;
                const calendarColor = calendar.colors?.lineColor || '#3b82f6';
                const showIcon = Boolean(calendar.icon);
                return (
                  <li key={calendar.id}>
                    <label
                      className="group flex cursor-pointer items-center rounded px-2 py-2 transition hover:bg-gray-100 dark:hover:bg-slate-800"
                      title={calendar.name}
                    >
                      <input
                        type="checkbox"
                        className="calendar-checkbox"
                        style={{
                          '--checkbox-color': calendarColor,
                        } as React.CSSProperties}
                        checked={isVisible}
                        onChange={event =>
                          toggleCalendarVisibility(calendar.id, event.target.checked)
                        }
                      />
                      {showIcon && (
                        <span
                          className="mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center text-xs font-semibold text-white"
                          aria-hidden="true"
                        >
                          {getCalendarInitials(calendar)}
                        </span>
                      )}
                      <span className="flex-1 truncate text-sm text-gray-700 group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white">
                        {calendar.name || calendar.id}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="border-t border-gray-200 px-3 py-3 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                onClick={() => handleMonthChange(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {monthLabel}
              </span>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                onClick={() => handleMonthChange(1)}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className={miniCalendarGrid}>
              {weekdayLabels.map(label => (
                <div key={generateUniKey()} className={`${miniCalendarDayHeader} text-gray-500`}>
                  {label}
                </div>
              ))}
              {miniCalendarDays.map(day => (
                <button
                  type="button"
                  key={generateUniKey()}
                  className={`
                    ${miniCalendarDay}
                    ${day.isCurrentMonth ? miniCalendarCurrentMonth : miniCalendarOtherMonth}
                    ${day.isToday ? miniCalendarToday : ''}
                    ${day.isSelected && !day.isToday ? miniCalendarSelected : ''}
                  `}
                  onClick={() => handleDateSelect(day.fullDate)}
                >
                  {day.date}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <ul className="space-y-1">
            {calendars.map(calendar => {
              const isVisible = calendar.isVisible !== false;
              const calendarColor = calendar.colors?.lineColor || '#3b82f6';
              const showIcon = Boolean(calendar.icon);
              return (
                <li key={calendar.id}>
                  <label
                    className="group flex cursor-pointer items-center rounded px-2 py-2 transition hover:bg-gray-100 dark:hover:bg-slate-800"
                    title={calendar.name}
                  >
                    <input
                      type="checkbox"
                      className="calendar-checkbox"
                      style={{
                        '--checkbox-color': calendarColor,
                      } as React.CSSProperties}
                      checked={isVisible}
                      onChange={event =>
                        toggleCalendarVisibility(calendar.id, event.target.checked)
                      }
                    />
                    {/* {showIcon && (
                      <span
                        className="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: calendarColor }}
                        aria-hidden="true"
                      >
                        {getCalendarInitials(calendar)}
                      </span>
                    )} */}
                    <span className="flex-1 truncate text-sm text-gray-700 group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white">
                      {/* {calendar.name || calendar.id} */}
                      &nbsp;
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DefaultCalendarSidebar;
