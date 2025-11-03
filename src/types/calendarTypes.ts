// Calendar Types System - Type Definitions

/**
 * Color configuration for a calendar type
 */
export interface CalendarColors {
  /** Event background color */
  eventColor: string;
  /** Selected event background color */
  eventSelectedColor: string;
  /** Border/line color */
  lineColor: string;
  /** Text color */
  textColor: string;
}

/**
 * Calendar Type Definition
 * Represents a category of events (e.g., Work, Personal, Study)
 */
export interface CalendarType {
  /** Unique identifier (e.g., 'work', 'personal') */
  id: string;

  /** Display name (e.g., 'Work', 'Personal') */
  name: string;

  /** Optional description */
  description?: string;

  /** Light mode colors */
  colors: CalendarColors;

  /** Dark mode colors (optional, falls back to light mode if not provided) */
  darkColors?: CalendarColors;

  /** Optional icon (emoji or icon name) */
  icon?: string;

  /** Whether this is a system default type */
  isDefault?: boolean;

  /** Whether events of this type should be visible */
  isVisible?: boolean;
}

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * System-level theme colors
 */
export interface ThemeColors {
  background?: string;
  text?: string;
  border?: string;
  [key: string]: string | undefined;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  /** Current theme mode */
  mode: ThemeMode;

  /** System-level theme colors (optional) */
  colors?: ThemeColors;
}

/**
 * Calendar configuration for the app
 */
export interface CalendarsConfig {
  /** Array of calendar types */
  calendars?: CalendarType[];

  /** Default calendar for new events */
  defaultCalendar?: string;

  /** Theme configuration */
  theme?: ThemeConfig;
}
