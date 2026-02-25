// Calendar Registry - Manages calendar types and color resolution

import { CalendarType, ThemeMode, CalendarColors } from '@/types/calendarTypes';

/**
 * Default calendar types
 */
export const DEFAULT_CALENDAR_TYPES: CalendarType[] = [
  {
    id: 'blue',
    name: 'Blue',
    isDefault: true,
    colors: {
      eventColor: '#eff6ff',
      eventSelectedColor: 'rgba(59, 130, 246)',
      lineColor: '#3b82f6',
      textColor: '#1e3a8a', // text-blue-900
    },
    darkColors: {
      eventColor: 'rgba(30, 64, 175, 0.8)',
      eventSelectedColor: 'rgba(30, 58, 138, 1)',
      lineColor: '#3b82f6',
      textColor: '#dbeafe',
    },
  },
  {
    id: 'green',
    name: 'Green',
    isDefault: true,
    colors: {
      eventColor: '#f0fdf4',
      eventSelectedColor: 'rgba(16, 185, 129, 1)',
      lineColor: '#10b981',
      textColor: '#064e3b',
    },
    darkColors: {
      eventColor: 'rgba(4, 120, 87, 0.8)',
      eventSelectedColor: 'rgba(6, 78, 59, 1)',
      lineColor: '#10b981',
      textColor: '#d1fae5',
    },
  },
  {
    id: 'purple',
    name: 'Purple',
    isDefault: true,
    colors: {
      eventColor: '#faf5ff',
      eventSelectedColor: 'rgba(139, 92, 246, 1)',
      lineColor: '#8b5cf6',
      textColor: '#5b21b6',
    },
    darkColors: {
      eventColor: 'rgba(109, 40, 217, 0.8)',
      eventSelectedColor: 'rgba(91, 33, 182, 1)',
      lineColor: '#8b5cf6',
      textColor: '#ede9fe',
    },
  },
  {
    id: 'yellow',
    name: 'Yellow',
    isDefault: true,
    colors: {
      eventColor: '#fefce8',
      eventSelectedColor: 'rgba(245, 158, 11, 1)',
      lineColor: '#f59e0b',
      textColor: '#78350f',
    },
    darkColors: {
      eventColor: 'rgba(180, 83, 9, 0.8)',
      eventSelectedColor: 'rgba(120, 53, 15, 1)',
      lineColor: '#f59e0b',
      textColor: '#fef3c7',
    },
  },
  {
    id: 'red',
    name: 'Red',
    isDefault: true,
    colors: {
      eventColor: '#fef2f2',
      eventSelectedColor: 'rgba(239, 68, 68, 1)',
      lineColor: '#ef4444',
      textColor: '#7f1d1d',
    },
    darkColors: {
      eventColor: 'rgba(185, 28, 28, 0.8)',
      eventSelectedColor: 'rgba(127, 29, 29, 1)',
      lineColor: '#ef4444',
      textColor: '#fee2e2',
    },
  },
  {
    id: 'orange',
    name: 'Orange',
    isDefault: true,
    colors: {
      eventColor: '#fff7edb3',
      eventSelectedColor: 'rgba(249, 115, 22, 1)',
      lineColor: '#f97316',
      textColor: '#7c2d12',
    },
    darkColors: {
      eventColor: 'rgba(194, 65, 12, 0.8)',
      eventSelectedColor: 'rgba(124, 45, 18, 1)',
      lineColor: '#f97316',
      textColor: '#fed7aa',
    },
  },
  {
    id: 'pink',
    name: 'Pink',
    isDefault: true,
    colors: {
      eventColor: '#fdf2f8',
      eventSelectedColor: 'rgba(236, 72, 153, 1)',
      lineColor: '#ec4899',
      textColor: '#831843',
    },
    darkColors: {
      eventColor: 'rgba(190, 24, 93, 0.8)',
      eventSelectedColor: 'rgba(131, 24, 67, 1)',
      lineColor: '#ec4899',
      textColor: '#fce7f3',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    isDefault: true,
    colors: {
      eventColor: '#f0fdfa',
      eventSelectedColor: 'rgba(20, 184, 166, 1)',
      lineColor: '#14b8a6',
      textColor: '#134e4a',
    },
    darkColors: {
      eventColor: 'rgba(15, 118, 110, 0.8)',
      eventSelectedColor: 'rgba(19, 78, 74, 1)',
      lineColor: '#14b8a6',
      textColor: '#ccfbf1',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    isDefault: true,
    colors: {
      eventColor: '#eef2ffb3',
      eventSelectedColor: 'rgba(99, 102, 241, 1)',
      lineColor: '#6366f1',
      textColor: '#312e81',
    },
    darkColors: {
      eventColor: 'rgba(67, 56, 202, 0.8)',
      eventSelectedColor: 'rgba(49, 46, 129, 1)',
      lineColor: '#6366f1',
      textColor: '#e0e7ff',
    },
  },
  {
    id: 'gray',
    name: 'Gray',
    isDefault: true,
    colors: {
      eventColor: '#f9fafbb3',
      eventSelectedColor: 'rgba(107, 114, 128, 1)',
      lineColor: '#6b7280',
      textColor: '#1f2937',
    },
    darkColors: {
      eventColor: 'rgba(75, 85, 99, 0.8)',
      eventSelectedColor: 'rgba(31, 41, 55, 1)',
      lineColor: '#6b7280',
      textColor: '#f3f4f6',
    },
  },
];

/**
 * Calendar Registry
 * Manages calendar types and provides color resolution
 */
export class CalendarRegistry {
  private calendars: Map<string, CalendarType>;
  private defaultCalendarId: string;
  private currentTheme: ThemeMode;

  constructor(
    customCalendars?: CalendarType[],
    defaultCalendarId?: string,
    theme: ThemeMode = 'light'
  ) {
    this.calendars = new Map();
    this.defaultCalendarId = defaultCalendarId || 'blue';
    this.currentTheme = theme;

    // If custom calendars are provided, hide default calendars by default
    const shouldHideDefaults = customCalendars && customCalendars.length > 0;

    // Override with custom calendars
    if (customCalendars) {
      customCalendars.forEach(calendar => {
        this.calendars.set(calendar.id, calendar);
      });
    } else {
      // Register default calendars
      DEFAULT_CALENDAR_TYPES.forEach(calendar => {
        this.calendars.set(calendar.id, {
          ...calendar,
          // Hide defaults if custom calendars are provided
          isVisible: shouldHideDefaults ? false : calendar.isVisible,
        });
      });
    }
  }

  /**
   * Register a new calendar type
   */
  register(calendar: CalendarType): void {
    this.calendars.set(calendar.id, calendar);
  }

  /**
   * Unregister a calendar type
   */
  unregister(calendarId: string): boolean {
    return this.calendars.delete(calendarId);
  }

  /**
   * Get a calendar type by ID
   */
  get(calendarId: string): CalendarType | undefined {
    return this.calendars.get(calendarId);
  }

  /**
   * Get all calendar types
   */
  getAll(): CalendarType[] {
    return Array.from(this.calendars.values());
  }

  /**
   * Get visible calendar types
   */
  getVisible(): CalendarType[] {
    return this.getAll().filter(cal => cal.isVisible !== false);
  }

  /**
   * Check if a calendar exists
   */
  has(calendarId: string): boolean {
    return this.calendars.has(calendarId);
  }

  /**
   * Reorder calendars
   * @param fromIndex - Source index
   * @param toIndex - Destination index
   */
  reorder(fromIndex: number, toIndex: number): void {
    const entries = Array.from(this.calendars.entries());
    if (
      fromIndex < 0 ||
      fromIndex >= entries.length ||
      toIndex < 0 ||
      toIndex >= entries.length
    ) {
      return;
    }

    const [removed] = entries.splice(fromIndex, 1);
    entries.splice(toIndex, 0, removed);

    this.calendars.clear();
    entries.forEach(([key, value]) => {
      this.calendars.set(key, value);
    });
  }

  /**
   * Update visibility of a specific calendar type
   */
  setVisibility(calendarId: string, visible: boolean): void {
    const calendar = this.calendars.get(calendarId);
    if (!calendar) return;

    this.calendars.set(calendarId, {
      ...calendar,
      isVisible: visible,
    });
  }

  /**
   * Update visibility for all calendar types
   */
  setAllVisibility(visible: boolean): void {
    this.calendars.forEach((calendar, id) => {
      this.calendars.set(id, {
        ...calendar,
        isVisible: visible,
      });
    });
  }

  /**
   * Update calendar properties
   */
  updateCalendar(calendarId: string, updates: Partial<CalendarType>): void {
    const calendar = this.calendars.get(calendarId);
    if (!calendar) return;

    this.calendars.set(calendarId, {
      ...calendar,
      ...updates,
    });
  }

  /**
   * Set the default calendar ID
   */
  setDefaultCalendar(calendarId: string): void {
    if (!this.has(calendarId)) {
      throw new Error(`Calendar type '${calendarId}' does not exist`);
    }
    this.defaultCalendarId = calendarId;
  }

  /**
   * Get the default calendar ID
   */
  getDefaultCalendarId(): string {
    return this.defaultCalendarId;
  }

  /**
   * Get the default calendar type
   */
  getDefaultCalendar(): CalendarType {
    const calendar = this.get(this.defaultCalendarId);
    if (!calendar) {
      // Fallback to first available calendar
      return this.getAll()[0];
    }
    return calendar;
  }

  /**
   * Set the current theme
   */
  setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
  }

  /**
   * Get the current theme
   */
  getTheme(): ThemeMode {
    return this.currentTheme;
  }

  /**
   * Resolve colors for a calendar ID based on current theme
   */
  resolveColors(calendarId?: string, theme?: ThemeMode): CalendarColors {
    const activeTheme = theme || this.currentTheme;
    const isDark = CalendarRegistry.isDarkTheme(activeTheme);

    // Try to get the specified calendar
    let calendar: CalendarType | undefined;
    if (calendarId) {
      calendar = this.get(calendarId);
    }

    // Fall back to default calendar if not found
    if (!calendar) {
      calendar = this.getDefaultCalendar();
    }

    // Return appropriate colors based on theme
    if (isDark && calendar.darkColors) {
      return calendar.darkColors;
    }
    return calendar.colors;
  }

  /**
   * Get selected background color
   */
  getSelectedBgColor(calendarId?: string, theme?: ThemeMode): string {
    const colors = this.resolveColors(calendarId, theme);
    return colors.eventSelectedColor;
  }

  /**
   * Get line color
   */
  getLineColor(calendarId?: string, theme?: ThemeMode): string {
    const colors = this.resolveColors(calendarId, theme);
    return colors.lineColor;
  }

  /**
   * Get text color
   */
  getTextColor(calendarId?: string, theme?: ThemeMode): string {
    const colors = this.resolveColors(calendarId, theme);
    return colors.textColor;
  }

  /**
   * Check if the current theme is dark
   */
  private static isDarkTheme(theme: ThemeMode): boolean {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;

    // For 'auto' mode, check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  }

  /**
   * Validate calendar configuration
   */
  static validate(calendar: Partial<CalendarType>): string[] {
    const errors: string[] = [];

    if (!calendar.id) {
      errors.push('Calendar type must have an id');
    }

    if (!calendar.name) {
      errors.push('Calendar type must have a name');
    }

    if (calendar.colors) {
      if (!calendar.colors.eventColor) {
        errors.push('Calendar colors must include eventColor');
      }
      if (!calendar.colors.eventSelectedColor) {
        errors.push('Calendar colors must include eventSelectedColor');
      }
      if (!calendar.colors.lineColor) {
        errors.push('Calendar colors must include lineColor');
      }
      if (!calendar.colors.textColor) {
        errors.push('Calendar colors must include textColor');
      }
    } else {
      errors.push('Calendar type must have colors configuration');
    }

    return errors;
  }
}

/**
 * Default registry instance for internal use
 * This is used when helper functions are called outside of CalendarApp context
 * CalendarApp will set this registry when initialized
 */
let defaultRegistry = new CalendarRegistry();

/**
 * Get the default calendar registry
 * Used internally by helper functions for color resolution
 * @internal
 */
export function getDefaultCalendarRegistry(): CalendarRegistry {
  return defaultRegistry;
}

/**
 * Set the default calendar registry
 * Used internally by CalendarApp to sync its registry with the global default
 * @internal
 */
export function setDefaultCalendarRegistry(registry: CalendarRegistry): void {
  defaultRegistry = registry;
}

/**
 * Get calendar colors for a specific hex color
 * Tries to match with default calendar types, otherwise generates generic colors
 */
export function getCalendarColorsForHex(hex: string): {
  colors: CalendarColors;
  darkColors?: CalendarColors;
} {
  const match = DEFAULT_CALENDAR_TYPES.find(
    c => c.colors.lineColor.toLowerCase() === hex.toLowerCase()
  );
  if (match) {
    return { colors: match.colors, darkColors: match.darkColors };
  }

  return {
    colors: {
      eventColor: hex + '1A', // ~10% opacity
      eventSelectedColor: hex,
      lineColor: hex,
      textColor: hex,
    },
    darkColors: {
      eventColor: hex + 'CC', // ~80% opacity
      eventSelectedColor: hex,
      lineColor: hex,
      textColor: '#ffffff',
    },
  };
}
