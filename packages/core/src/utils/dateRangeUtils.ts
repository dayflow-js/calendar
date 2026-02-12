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
 * Get the Monday-Sunday range for a given date
 * @param date Input date
 * @returns Object with monday and sunday dates
 */
export const getWeekRange = (date: Date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to start on Monday
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
};

/**
 * Get current week dates (Monday-Sunday) with today indicator
 * @returns Array of 7 date objects with date, month, and isToday flag
 */
export const getCurrentWeekDates = () => {
  const currentDate = new Date();
  const today = new Date();
  const day = currentDate.getDay();
  const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);

  return weekDays.map((_, index) => {
    const date = new Date(currentDate);
    date.setDate(diff + index);
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
