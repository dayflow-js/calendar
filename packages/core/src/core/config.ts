import { CalendarConfig } from '../types';
import { getLineColor as resolveLineColor } from '../utils/colorUtils';

export const defaultDragConfig = {
  HOUR_HEIGHT: 72,
  FIRST_HOUR: 0,
  LAST_HOUR: 24,
  MIN_DURATION: 0.25,
  TIME_COLUMN_WIDTH: 80,
  ALL_DAY_HEIGHT: 28,

  // line color via Calendar Registry
  getLineColor: (color: string) => resolveLineColor(color),

  getDynamicPadding: (drag: { endHour: number; startHour: number }) => {
    const duration = drag.endHour - drag.startHour;
    return duration <= 0.25 ? 'px-1 py-0' : 'p-1';
  },
};

export const defaultViewConfigs = {
  day: {
    showWeekends: true,
    showAllDay: true,
    scrollToCurrentTime: true,
  },
  week: {
    showWeekends: true,
    showAllDay: true,
    startOfWeek: 1, // Monday
    scrollToCurrentTime: true,
  },
  month: {
    showWeekends: true,
    showAllDay: true,
    showOtherMonth: true,
    weekHeight: 120,
  },
};

export const defaultCalendarConfig: CalendarConfig = {
  drag: defaultDragConfig,
  views: defaultViewConfigs,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepMerge<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;

  const source = sources.shift();
  if (!source) return target;

  for (const key in source) {
    if (source[key] !== undefined) {
      if (isObject(target[key]) && isObject(source[key])) {
        target[key] = deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }

  return deepMerge(target, ...sources);
}

// Utility function to check if value is an object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function createCalendarConfig(
  overrides?: Partial<CalendarConfig>
): CalendarConfig {
  return deepMerge(
    JSON.parse(JSON.stringify(defaultCalendarConfig)), // Deep copy default configuration
    overrides || {}
  );
}

export function createDragConfig(
  overrides?: Partial<typeof defaultDragConfig>
) {
  return deepMerge(
    JSON.parse(JSON.stringify(defaultDragConfig)),
    overrides || {}
  );
}

export function createViewConfig(
  viewType: 'day' | 'week' | 'month',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: Record<string, any>
) {
  const defaultConfig = defaultViewConfigs[viewType];
  return deepMerge(JSON.parse(JSON.stringify(defaultConfig)), overrides || {});
}

// Configuration validation function
export function validateCalendarConfig(
  config: Partial<CalendarConfig>
): string[] {
  const errors: string[] = [];

  // Validate drag configuration
  if (config.drag) {
    const { drag } = config;
    if (
      drag.HOUR_HEIGHT &&
      (typeof drag.HOUR_HEIGHT !== 'number' || drag.HOUR_HEIGHT <= 0)
    ) {
      errors.push('HOUR_HEIGHT must be a positive number');
    }
    if (
      drag.FIRST_HOUR &&
      (typeof drag.FIRST_HOUR !== 'number' ||
        drag.FIRST_HOUR < 0 ||
        drag.FIRST_HOUR >= 24)
    ) {
      errors.push('FIRST_HOUR must be a number between 0 and 23');
    }
    if (
      drag.LAST_HOUR &&
      (typeof drag.LAST_HOUR !== 'number' ||
        drag.LAST_HOUR <= 0 ||
        drag.LAST_HOUR > 24)
    ) {
      errors.push('LAST_HOUR must be a number between 1 and 24');
    }
    if (
      drag.FIRST_HOUR &&
      drag.LAST_HOUR &&
      drag.FIRST_HOUR >= drag.LAST_HOUR
    ) {
      errors.push('FIRST_HOUR must be less than LAST_HOUR');
    }
  }

  return errors;
}

export class ConfigManager {
  private config: CalendarConfig;

  constructor(initialConfig?: Partial<CalendarConfig>) {
    this.config = createCalendarConfig(initialConfig);
  }

  getConfig(): CalendarConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  getDragConfig() {
    return this.config.drag;
  }

  getViewConfig(viewType: 'day' | 'week' | 'month') {
    return this.config.views[viewType];
  }

  updateConfig(updates: Partial<CalendarConfig>): void {
    const errors = validateCalendarConfig(updates);
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
    this.config = deepMerge(this.config, updates);
  }

  resetConfig(newConfig?: Partial<CalendarConfig>): void {
    this.config = createCalendarConfig(newConfig);
  }
}
