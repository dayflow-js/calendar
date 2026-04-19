import { useMemo } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { CalendarRegistry } from '@/core/calendarRegistry';
import { useLocale, getWeekDaysLabels } from '@/locale';
import {
  miniCalendarDay,
  miniCalendarDayHeader,
  miniCalendarGrid,
} from '@/styles/classNames';
import type { Event } from '@/types/event';
import { getLineColor, temporalToVisualDate } from '@/utils';

import { ChevronLeft, ChevronRight } from './Icons';

const MAX_EVENT_DOTS = 4;

interface MiniCalendarProps {
  visibleMonth: Date;
  currentDate: Date;
  showHeader?: boolean;
  onMonthChange: (offset: number) => void;
  onDateSelect: (date: Date) => void;
  locale?: string;
  events?: Event[];
  showEventDots?: boolean;
  calendarRegistry?: CalendarRegistry;
  timeZone?: string;
}

export const MiniCalendar = ({
  visibleMonth,
  currentDate,
  showHeader = false,
  onMonthChange,
  onDateSelect,
  events = [],
  showEventDots = false,
  calendarRegistry,
  timeZone,
}: MiniCalendarProps) => {
  const { locale } = useLocale();
  const todayKey = useMemo(() => {
    const todayInTz = timeZone
      ? Temporal.Now.plainDateISO(timeZone)
      : Temporal.Now.plainDateISO();
    const todayLocal = new Date(
      todayInTz.year,
      todayInTz.month - 1,
      todayInTz.day
    );
    return todayLocal.toDateString();
  }, [timeZone]);
  const currentDateKey = currentDate.toDateString();

  const weekdayLabels = useMemo(
    () => getWeekDaysLabels(locale, 'narrow'),
    [locale]
  );

  const monthLabel = useMemo(
    () =>
      visibleMonth.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      }),
    [visibleMonth, locale]
  );

  const eventDotsByDate = useMemo(() => {
    if (!showEventDots || !events?.length) return null;
    const map = new Map<string, string[]>();

    events.forEach(event => {
      const startFull = temporalToVisualDate(event.start, timeZone);
      const endFull = event.end
        ? temporalToVisualDate(event.end, timeZone)
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

      const color = getLineColor(
        event.calendarId || 'default',
        calendarRegistry
      ).toLowerCase();

      for (
        let current = new Date(startDate);
        current <= adjustedEnd;
        current = new Date(current.getTime() + 86400000)
      ) {
        const key = current.toDateString();
        const existing = map.get(key) ?? [];
        if (!existing.includes(color) && existing.length < MAX_EVENT_DOTS) {
          map.set(key, [...existing, color]);
        }
      }
    });
    return map;
  }, [showEventDots, events, timeZone, calendarRegistry]);

  const miniCalendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
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

  return (
    <div className='df-mini-calendar-body'>
      {showHeader ? (
        <div className='df-mini-calendar-header-nav'>
          <button
            type='button'
            className='df-mini-calendar-nav-btn'
            onClick={() => onMonthChange(-1)}
            aria-label='Previous month'
          >
            <ChevronLeft />
          </button>
          <span className='df-mini-calendar-month-label'>{monthLabel}</span>
          <button
            type='button'
            className='df-mini-calendar-nav-btn'
            onClick={() => onMonthChange(1)}
            aria-label='Next month'
          >
            <ChevronRight />
          </button>
        </div>
      ) : null}
      <div className={miniCalendarGrid}>
        {weekdayLabels.map((label, index) => (
          <div key={`weekday-${index}`} className={miniCalendarDayHeader}>
            {label}
          </div>
        ))}
        {miniCalendarDays.map(day => {
          const dots = eventDotsByDate?.get(day.fullDate.toDateString()) ?? [];
          return (
            <button
              type='button'
              key={day.fullDate.getTime()}
              className={`${miniCalendarDay} df-mini-calendar-day-cell`}
              data-today={day.isToday ? 'true' : undefined}
              data-selected={
                !day.isToday && day.isSelected ? 'true' : undefined
              }
              data-other-month={day.isCurrentMonth ? undefined : 'true'}
              onClick={() => onDateSelect(day.fullDate)}
            >
              <span className='df-mini-calendar-day-number'>{day.date}</span>
              {showEventDots && dots.length > 0 && (
                <div className='df-mini-calendar-dots'>
                  {dots.slice(0, MAX_EVENT_DOTS).map((color, index) => (
                    <div
                      key={`${color}-${index}`}
                      data-mini-calendar-dot='true'
                      className='df-mini-calendar-dot'
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
