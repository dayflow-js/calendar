/**
 * Color Utilities
 *
 * This module provides utilities for resolving event colors using the calendar registry.
 * All color functions return actual color values (not CSS classes) for inline styles.
 */

import {
  getDefaultCalendarRegistry,
  CalendarRegistry,
} from '@/core/calendarRegistry';

// ============================================================================
// Color Tools
// ============================================================================

/**
 * Get event background color (actual color value, not CSS class)
 * Use this for inline styles
 */
export const getEventBgColor = (
  calendarIdOrColor: string,
  registry?: CalendarRegistry
): string => {
  const reg = registry || getDefaultCalendarRegistry();
  const colors = reg.resolveColors(calendarIdOrColor);
  return colors.eventColor;
};

/**
 * Get event text color (actual color value, not CSS class)
 * Use this for inline styles
 */
export const getEventTextColor = (
  calendarIdOrColor: string,
  registry?: CalendarRegistry
): string => {
  const reg = registry || getDefaultCalendarRegistry();
  const colors = reg.resolveColors(calendarIdOrColor);
  return colors.textColor;
};

/**
 * Get selected background color
 * Now uses the calendar registry for color resolution
 */
export const getSelectedBgColor = (
  calendarIdOrColor: string,
  registry?: CalendarRegistry
): string => {
  const reg = registry || getDefaultCalendarRegistry();
  const colors = reg.resolveColors(calendarIdOrColor);
  return colors.eventSelectedColor;
};

/**
 * Get line color
 * Now uses the calendar registry for color resolution
 */
export const getLineColor = (
  calendarIdOrColor: string,
  registry?: CalendarRegistry
): string => {
  const reg = registry || getDefaultCalendarRegistry();
  const colors = reg.resolveColors(calendarIdOrColor);
  return colors.lineColor;
};
