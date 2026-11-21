import { JSX, RefObject } from 'preact';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import {
  addCalendarMonths,
  dateToCalendarDate,
} from '@/calendar/calendarSystem';
import { createDateString } from '@/components/monthView/util';
import { ICalendarApp } from '@/types';
import { DayData } from '@/types/calendar';

import { useStableMonthCallback } from './virtualScroll/useStableMonthCallback';

export interface MonthGridKeyboard {
  tabStopDate?: string;
  selectedDate: string;
  onFocus: (date: Date, element: HTMLDivElement) => void;
  onKeyDown: (
    event: JSX.TargetedKeyboardEvent<HTMLDivElement>,
    date: Date
  ) => void;
}

export const useMonthGridKeyboard = (
  app: ICalendarApp,
  gridRef: RefObject<HTMLDivElement>,
  visibleDays: DayData[],
  displayedMonth: Date,
  startOfWeek: number,
  navigateToDate: (date: Date) => void
): MonthGridKeyboard => {
  const currentDate = app.getCurrentDate();
  const selectedDate = createDateString(currentDate);
  const [active, setActive] = useState({ date: currentDate, selectedDate });
  const activeDate =
    active.selectedDate === selectedDate ? active.date : currentDate;
  const activeKey = createDateString(activeDate);
  const visibleKeys = new Set(
    visibleDays.map(day => createDateString(day.date))
  );
  const month = dateToCalendarDate(displayedMonth, app.state.calendarSystem);
  const fallback =
    visibleDays.find(
      day => day.month === month.month - 1 && day.year === month.year
    ) ?? visibleDays[0];
  const tabStopDate = visibleKeys.has(activeKey)
    ? activeKey
    : visibleKeys.has(selectedDate)
      ? selectedDate
      : fallback && createDateString(fallback.date);
  const focusedCell = useRef<HTMLDivElement | null>(null);
  const pendingDate = useRef<string | null>(null);

  // A removed virtual row does not fire blur. Remember its date, but relinquish
  // focus as soon as the user focuses an event, continuation, or another control.
  useEffect(() => {
    const releaseFocus = (event: FocusEvent) => {
      if (event.target !== focusedCell.current) {
        focusedCell.current = null;
        pendingDate.current = null;
      }
    };
    document.addEventListener('focusin', releaseFocus);
    return () => document.removeEventListener('focusin', releaseFocus);
  }, []);

  useLayoutEffect(() => {
    const previous = focusedCell.current;
    if (!previous) return;
    const lostCellFocus =
      !previous.isConnected && document.activeElement === document.body;
    if (!pendingDate.current && !lostCellFocus) return;
    if (document.activeElement !== previous && !lostCellFocus) return;
    const target = gridRef.current?.querySelector<HTMLDivElement>(
      `.df-month-day-cell[data-date="${pendingDate.current ?? activeKey}"]`
    );
    if (target) {
      target.focus({ preventScroll: true });
      pendingDate.current = null;
    }
  });

  const onFocus = useStableMonthCallback(
    (date: Date, element: HTMLDivElement) => {
      focusedCell.current = element;
      setActive({ date, selectedDate });
    }
  );

  const onKeyDown = useStableMonthCallback(
    (event: JSX.TargetedKeyboardEvent<HTMLDivElement>, date: Date) => {
      if (
        event.target !== event.currentTarget ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const target = new Date(date);
      const weekDay = (date.getDay() - startOfWeek + 7) % 7;
      switch (event.key) {
        case 'ArrowLeft':
          target.setDate(date.getDate() - 1);
          break;
        case 'ArrowRight':
          target.setDate(date.getDate() + 1);
          break;
        case 'ArrowUp':
          target.setDate(date.getDate() - 7);
          break;
        case 'ArrowDown':
          target.setDate(date.getDate() + 7);
          break;
        case 'Home':
          target.setDate(date.getDate() - weekDay);
          break;
        case 'End':
          target.setDate(date.getDate() + 6 - weekDay);
          break;
        case 'PageUp':
        case 'PageDown':
          target.setTime(
            addCalendarMonths(
              date,
              event.key === 'PageUp' ? -1 : 1,
              app.state.calendarSystem
            ).getTime()
          );
          break;
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
      pendingDate.current = createDateString(target);
      if (
        event.key === 'PageUp' ||
        event.key === 'PageDown' ||
        !visibleKeys.has(pendingDate.current)
      ) {
        navigateToDate(target);
      }
      setActive({
        date: target,
        selectedDate: createDateString(app.getCurrentDate()),
      });
    }
  );

  return useMemo(
    () => ({ tabStopDate, selectedDate, onFocus, onKeyDown }),
    [tabStopDate, selectedDate, onFocus, onKeyDown]
  );
};
