/**
 * Time Utilities
 *
 * This module provides utilities for time formatting, calculations, and time step operations.
 * Handles 24-hour format, time rounding, and special cases like midnight crossings.
 */

import { Event } from '../types';
import { temporalToDate } from './temporal';
import { extractHourFromDate } from './dateTimeUtils';

// ============================================================================
// Time Tools
// ============================================================================

/**
 * Time step for calendar grid (0.25 = 15 minutes)
 */
export const TIME_STEP = 0.25;

/**
 * Format hours and minutes to HH:MM format
 * @param hours Hour number (supports decimals, e.g., 14.5 = 14:30)
 * @param minutes Optional minutes (if not provided, extracted from decimal hours)
 * @returns Formatted time string (e.g., "14:30")
 */
export const formatTime = (hours: number, minutes = 0) => {
  const h = Math.floor(hours);
  const m = minutes || Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Format event time range as a string
 * @param event Event object
 * @returns Formatted time range (e.g., "14:00 - 16:00" or "All day")
 */
export const formatEventTimeRange = (event: Event) => {
  const startHour = extractHourFromDate(event.start);
  const endHour = getEventEndHour(event);
  return `${formatTime(startHour)} - ${formatTime(endHour)}`;
};

/**
 * Round hour to nearest time step
 * @param hour Hour number
 * @returns Rounded hour
 */
export const roundToTimeStep = (hour: number) => {
  const step = TIME_STEP;
  return Math.round(hour / step) * step;
};

/**
 * Get event end hour (handles cross-day events less than 24 hours)
 * When an event ends exactly at midnight of the next day and duration is less than 24 hours,
 * it should be treated as 24:00 of the current day in week/day views to avoid displaying as next day 00:00.
 * @param event Event object
 * @returns End hour (0-24)
 */
export const getEventEndHour = (event: Event): number => {
  if (!event.end) return 0;

  const endHour = extractHourFromDate(event.end);
  if (event.allDay || !event.start) {
    return endHour;
  }

  const startDate = temporalToDate(event.start);
  const endDate = temporalToDate(event.end);

  const crossesDay =
    startDate.getFullYear() !== endDate.getFullYear() ||
    startDate.getMonth() !== endDate.getMonth() ||
    startDate.getDate() !== endDate.getDate();

  if (!crossesDay) {
    return endHour;
  }

  const endsExactlyAtMidnight =
    endHour === 0 &&
    endDate.getMinutes() === 0 &&
    endDate.getSeconds() === 0 &&
    endDate.getMilliseconds() === 0;

  if (endsExactlyAtMidnight) {
    const durationMs = endDate.getTime() - startDate.getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (durationMs > 0 && durationMs < ONE_DAY_MS) {
      return 24;
    }
  }

  return endHour;
};
