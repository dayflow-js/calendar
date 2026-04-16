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

/**
 * Resolve the primary calendar ID for an event.
 * Uses calendarIds[0] when available, otherwise falls back to calendarId.
 */
export const getPrimaryCalendarId = (event: {
  calendarId?: string;
  calendarIds?: string[];
}): string => (event.calendarIds?.[0] ?? event.calendarId) || 'blue';

/**
 * Resolve all line colors for an event's calendar(s).
 * Returns an array with one entry per calendar ID.
 */
export const getCalendarLineColors = (
  event: { calendarId?: string; calendarIds?: string[] },
  registry?: CalendarRegistry
): string[] => {
  const reg = registry || getDefaultCalendarRegistry();
  const ids =
    event.calendarIds ?? (event.calendarId ? [event.calendarId] : ['blue']);
  return ids.map(id => reg.getLineColor(id));
};

/**
 * Build a CSS gradient string for the multi-calendar color bar.
 * For a single color it returns the plain color value (no gradient).
 * For multiple colors it builds an equal-segment `linear-gradient(to bottom, ...)`.
 */
export const buildColorBarGradient = (colors: string[]): string => {
  if (colors.length === 1) return colors[0];
  const stops: string[] = [];
  colors.forEach((color, i) => {
    const pct0 = (i / colors.length) * 100;
    const pct1 = ((i + 1) / colors.length) * 100;
    stops.push(`${color} ${pct0}%`, `${color} ${pct1}%`);
  });
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
};

/**
 * Build a 45° repeating stripe for narrow multi-calendar color bars.
 * Uses the same angle and stripe width as the event background pattern, but
 * accepts line colors so the left bar remains stronger than the event fill.
 */
export const buildDiagonalColorBarGradient = (
  colors: string[],
  stripeWidth = 6
): string => {
  if (colors.length === 1) return colors[0];
  const stops: string[] = [];
  colors.forEach((color, i) => {
    const s = i * stripeWidth;
    const e = (i + 1) * stripeWidth;
    stops.push(`${color} ${s}px`, `${color} ${e}px`);
  });
  return `repeating-linear-gradient(-45deg, ${stops.join(', ')})`;
};

/**
 * Resolve all eventColor values for an event's calendar(s).
 * Used to build the diagonal stripe background.
 */
export const getCalendarEventBgColors = (
  event: { calendarId?: string; calendarIds?: string[] },
  registry?: CalendarRegistry
): string[] => {
  const reg = registry || getDefaultCalendarRegistry();
  const ids =
    event.calendarIds ?? (event.calendarId ? [event.calendarId] : ['blue']);
  return ids.map(id => reg.resolveColors(id).eventColor);
};

/**
 * Build a 45° repeating diagonal stripe CSS background for multi-calendar events.
 * For a single color returns the plain color value (no pattern).
 * Each stripe is `stripeWidth` px wide (default 6px).
 */
export const buildDiagonalPatternBackground = (
  colors: string[],
  stripeWidth = 6
): string => {
  if (colors.length === 1) return colors[0];
  const stops: string[] = [];
  colors.forEach((color, i) => {
    const s = i * stripeWidth;
    const e = (i + 1) * stripeWidth;
    stops.push(`${color} ${s}px`, `${color} ${e}px`);
  });
  return `repeating-linear-gradient(-45deg, ${stops.join(', ')})`;
};
