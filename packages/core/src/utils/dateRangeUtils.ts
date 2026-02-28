/**
 * Date Range Utilities
 *
 * This module provides utilities for calculating date ranges, particularly
 * for week-based operations (Monday-Sunday).
 */

import { weekDays } from './dateConstants';

// ============================================================================
// Date Range Utilities
// ============================================================================

/**
 * Get the week range for a given date
 * @param date Input date
 * @param startOfWeek Week start day (0: Sunday, 1: Monday, etc.)
 * @returns Object with monday and sunday dates (monday and sunday here are just start/end of week)
 */
export const getWeekRange = (date: Date, startOfWeek: number = 1) => {
  const day = date.getDay();
  // (day - startOfWeek + 7) % 7 gives how many days since the start of the week
  const diff = (day - startOfWeek + 7) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { monday: start, sunday: end }; // Keep property names for compatibility or refactor
};

/**
 * Get current week dates with today indicator
 * @param startOfWeek Week start day (0: Sun, 1: Mon, etc.)
 * @returns Array of 7 date objects with date, month, and isToday flag
 */
export const getCurrentWeekDates = (startOfWeek: number = 1) => {
  const currentDate = new Date();
  const today = new Date();
  const day = currentDate.getDay();
  const diff = (day - startOfWeek + 7) % 7;

  return weekDays.map((_, index) => {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - diff + index);
    return {
      date: date.getDate(),
      month: date.toLocaleString('default', { month: 'short' }),
      isToday:
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear(),
    };
  });
};
