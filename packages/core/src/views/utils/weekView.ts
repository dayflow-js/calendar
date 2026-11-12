import { Temporal } from 'temporal-polyfill';

import { dateToCalendarDate } from '@/calendar/calendarSystem';

export interface WeekDateDisplay {
  date: number;
  month: string;
  fullDate: Date;
  isToday: boolean;
}

export interface FullWeekDateDisplay extends WeekDateDisplay {
  isCurrent: boolean;
  dayName: string;
}

interface BuildWeekDayLabelsParams {
  displayDays: number;
  displayStart: Date;
  getWeekDaysLabels: (
    locale: string,
    format?: 'long' | 'short' | 'narrow',
    startOfWeek?: number
  ) => string[];
  isSlidingView: boolean;
  locale: string;
  startOfWeek: number;
}

const getTodayKeyInTimeZone = (timeZone: string) => {
  const todayInTz = Temporal.Now.plainDateISO(timeZone);
  const todayLocal = new Date(
    todayInTz.year,
    todayInTz.month - 1,
    todayInTz.day
  );

  return todayLocal.toDateString();
};

export const buildWeekDayLabels = ({
  displayDays,
  displayStart,
  getWeekDaysLabels,
  isSlidingView,
  locale,
  startOfWeek,
}: BuildWeekDayLabelsParams) => {
  if (isSlidingView) {
    return Array.from({ length: displayDays }, (_, index) => {
      const date = new Date(displayStart);
      date.setDate(date.getDate() + index);
      return date.toLocaleDateString(locale, { weekday: 'short' });
    });
  }

  return getWeekDaysLabels(locale, 'short', startOfWeek);
};

export const buildMobileWeekDayLabels = (
  isMobile: boolean,
  locale: string,
  getWeekDaysLabels: (
    locale: string,
    format?: 'long' | 'short' | 'narrow',
    startOfWeek?: number
  ) => string[],
  weekDaysLabels: string[]
) => {
  if (!isMobile) return [];

  const lang = locale.split('-')[0].toLowerCase();
  if (lang === 'zh' || lang === 'ja') {
    return getWeekDaysLabels(locale, 'narrow');
  }

  return weekDaysLabels.map(label => {
    if (lang === 'en') {
      if (label.startsWith('Tu')) return 'Tu';
      if (label.startsWith('Th')) return 'Th';
      if (label.startsWith('Sa')) return 'Sa';
      if (label.startsWith('Su')) return 'Su';
    }

    return label.charAt(0);
  });
};

export const buildWeekDates = (
  displayStart: Date,
  weekDaysLabels: string[],
  locale: string,
  appTimeZone: string
): WeekDateDisplay[] => {
  const todayKey = getTodayKeyInTimeZone(appTimeZone);

  return weekDaysLabels.map((_, index) => {
    const date = new Date(displayStart);
    date.setDate(displayStart.getDate() + index);

    return {
      date: dateToCalendarDate(
        date,
        new Intl.Locale(locale).calendar === 'persian' ? 'jalali' : 'gregorian'
      ).day,
      month: date.toLocaleString(locale, { month: 'short' }),
      fullDate: new Date(date),
      isToday: date.toDateString() === todayKey,
    };
  });
};

export const buildFullWeekDates = (
  standardWeekStart: Date,
  locale: string,
  currentDate: Date,
  appTimeZone: string
): FullWeekDateDisplay[] => {
  const todayKey = getTodayKeyInTimeZone(appTimeZone);
  const currentDateMidnight = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  ).getTime();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(standardWeekStart);
    date.setDate(standardWeekStart.getDate() + index);
    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    return {
      date: dateToCalendarDate(
        date,
        new Intl.Locale(locale).calendar === 'persian' ? 'jalali' : 'gregorian'
      ).day,
      month: date.toLocaleString(locale, { month: 'short' }),
      fullDate: new Date(date),
      isToday: date.toDateString() === todayKey,
      isCurrent: dateOnly.getTime() === currentDateMidnight,
      dayName: date.toLocaleDateString(locale, { weekday: 'short' }),
    };
  });
};
