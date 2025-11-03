/**
 * Calendar Data Generation Utilities
 *
 * This module provides utilities for generating calendar data structures
 * including days, weeks, and month/year metadata.
 */

import { DayData, WeeksData } from '@/types';
import { monthNames, shortMonthNames } from './dateConstants';
import { getWeekRange } from './dateRangeUtils';

// ============================================================================
// Calendar Data Generation Tools
// ============================================================================

/**
 * Generate day data object from a date
 * @param date Date to generate data for
 * @returns Day data with date, day, month, year, and isToday flag
 */
export const generateDayData = (date: string | number | Date) => {
  const clonedDate = new Date(date);
  const day = clonedDate.getDate();
  const month = clonedDate.getMonth();
  const year = clonedDate.getFullYear();
  const today = new Date();

  return {
    date: clonedDate,
    day,
    month,
    year,
    monthName: monthNames[month],
    shortMonthName: shortMonthNames[month],
    isToday:
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year,
  };
};

/**
 * Generate week data (7 days starting from given date)
 * @param startDate Week start date
 * @returns Week data with days array, startDate, and monthYear
 */
export const generateWeekData = (startDate: string | number | Date) => {
  const week = [];
  const startDateClone = new Date(startDate);

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDateClone);
    week.push(generateDayData(date));
    startDateClone.setDate(startDateClone.getDate() + 1);
  }

  return {
    days: week,
    startDate: new Date(startDate),
    monthYear: getMonthYearOfWeek(week),
  };
};

/**
 * Determine which month and year a week belongs to (based on majority of days)
 * @param days Array of day data
 * @returns Month name, month index, and year
 */
export const getMonthYearOfWeek = (days: DayData[]) => {
  // Count occurrences of each month
  const monthCounts: Record<string, number> = {};
  days.forEach((day: { month: number; year: number }) => {
    const key = `${day.month}-${day.year}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });

  // Find the most frequent month
  let maxCount = 0;
  let dominantMonthYear = '';

  Object.entries(monthCounts).forEach(([key, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantMonthYear = key;
    }
  });

  const [monthIndex, year] = dominantMonthYear.split('-').map(Number);

  return {
    month: monthNames[monthIndex],
    monthIndex,
    year,
  };
};

/**
 * Generate weeks data around a central date
 * @param centralDate Central date for range
 * @param monthsToLoad Number of months to load (default: 3)
 * @returns Array of week data
 */
export const generateWeeksData = (centralDate: Date, monthsToLoad = 3) => {
  // Calculate weeks to load (~4-5 weeks per month)
  const weeksToLoad = monthsToLoad * 5;

  const { monday: centralMonday } = getWeekRange(centralDate);
  const weeks = [];

  // Generate weeks before current week
  const prevWeeks = Math.floor(weeksToLoad / 2);
  const startDate = new Date(centralMonday);
  startDate.setDate(startDate.getDate() - 7 * prevWeeks);

  // Generate all weeks
  for (let i = 0; i < weeksToLoad; i++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + i * 7);
    weeks.push(generateWeekData(weekStartDate));
  }

  return weeks;
};

/**
 * Generate week range around a center date
 * @param centerDate Center date for range
 * @param totalWeeks Total number of weeks to generate
 * @returns Array of weeks data
 */
export function generateWeekRange(
  centerDate: Date,
  totalWeeks: number
): WeeksData[] {
  const weeks: WeeksData[] = [];
  const startOffset = Math.floor(totalWeeks / 2);

  // Find Monday of the center date's week
  const centerWeekStart = new Date(centerDate);
  const dayOfWeek = centerDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  centerWeekStart.setDate(centerDate.getDate() - daysToMonday);
  centerWeekStart.setHours(0, 0, 0, 0);

  // Calculate start week
  const startWeek = new Date(centerWeekStart);
  startWeek.setDate(startWeek.getDate() - startOffset * 7);

  // Generate all weeks
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = new Date(startWeek);
    weekStart.setDate(weekStart.getDate() + i * 7);
    weeks.push(generateWeekData(weekStart));
  }
  return weeks;
}
