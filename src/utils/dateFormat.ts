// Date formatting utility functions
// Ensures consistent server and client rendering, avoiding hydration errors

import { Temporal } from 'temporal-polyfill';
import { isPlainDate, isZonedDateTime } from './temporal';

/**
 * Format date to DD/MM/YYYY format
 * Ensures consistent server and client rendering
 */
export const formatDateConsistent = (
  date?: Date | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): string => {
  if (!date) return '';

  let year: number, month: number, day: number;

  if (date instanceof Date) {
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  } else if (isPlainDate(date)) {
    year = date.year;
    month = date.month;
    day = date.day;
  } else if (isZonedDateTime(date)) {
    year = date.year;
    month = date.month;
    day = date.day;
  } else {
    // PlainDateTime
    year = date.year;
    month = date.month;
    day = date.day;
  }

  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${dayStr}/${monthStr}/${year}`;
};

/**
 * Format month and year to consistent format
 */
export const formatMonthYear = (date: Date): string => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Format date to "DD MMM YYYY" format (e.g., "15 Jan 2025")
 * Used for event detail display
 */
export const formatDate = (
  temporal: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
): string => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  // All Temporal types have year, month, day properties
  const year = temporal.year;
  const month = temporal.month;
  const day = temporal.day;
  return `${day} ${months[month - 1]} ${year}`;
};
