// Factory function for creating Week view
import React from 'react';
import {
  WeekViewConfig,
  ViewFactory,
  ViewAdapterProps,
  CalendarView,
  ViewType,
} from '@/types';
import { ViewAdapter } from './ViewAdapter';
import WeekView from '@/views/WeekView';

// Default Week view configuration
const defaultWeekViewConfig: WeekViewConfig = {
  // Feature toggles
  enableDrag: true,
  enableResize: true,
  enableCreate: true,

  // Week view specific configuration
  showWeekends: true,
  showAllDay: true,
  startOfWeek: 1, // Monday
  scrollToCurrentTime: true,

  // Layout configuration
  hourHeight: 72,
  firstHour: 0,
  lastHour: 24,

  // Plugin configuration
  dragConfig: {
    supportedViews: [ViewType.WEEK],
    enableAllDayCreate: true,
  },

  eventsConfig: {
    enableAutoRecalculate: true,
    enableValidation: true,
  },

  // View specific configuration
  viewConfig: {
    showWeekends: true,
    showAllDay: true,
    startOfWeek: 1,
    scrollToCurrentTime: true,
  },
};

// Week view factory function
export const createWeekView: ViewFactory<WeekViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultWeekViewConfig, ...config };

  // Create adapter component
  const WeekViewAdapter: React.FC<ViewAdapterProps> = props => {
    return React.createElement(ViewAdapter, {
      viewType: ViewType.WEEK,
      originalComponent: WeekView,
      app: props.app,
      config: finalConfig,
      className: 'week-view-factory',
      customDetailPanelContent: props.customDetailPanelContent,
      customEventDetailDialog: props.customEventDetailDialog,
      calendarRef: props.calendarRef,
      switcherMode: props.switcherMode,
      meta: props.meta,
    });
  };

  // Set display name for debugging
  WeekViewAdapter.displayName = 'WeekViewAdapter';

  return {
    type: ViewType.WEEK,
    component: WeekViewAdapter,
    config: finalConfig,
  };
};
// TODO: remove
// Convenient Week view configuration creation function
export function createWeekViewConfig(
  overrides: Partial<WeekViewConfig> = {}
): WeekViewConfig {
  return { ...defaultWeekViewConfig, ...overrides };
}

// Preset configurations
export const weekViewPresets = {
  // Standard configuration
  standard: (): CalendarView => createWeekView(),

  // Workdays mode (hide weekends)
  workdays: (): CalendarView =>
    createWeekView({
      showWeekends: false,
      viewConfig: {
        showWeekends: false,
      },
    }),

  // Compact mode
  compact: (): CalendarView =>
    createWeekView({
      hourHeight: 48,
      showAllDay: false,
      viewConfig: {
        hourHeight: 48,
        showAllDay: false,
      },
    }),

  // Work hours only
  workHours: (): CalendarView =>
    createWeekView({
      firstHour: 8,
      lastHour: 18,
      showWeekends: false,
      scrollToCurrentTime: true,
      viewConfig: {
        firstHour: 8,
        lastHour: 18,
        showWeekends: false,
      },
    }),

  // Disable drag
  readOnly: (): CalendarView =>
    createWeekView({
      enableDrag: false,
      enableResize: false,
      enableCreate: false,
      dragConfig: {
        enableDrag: false,
        enableResize: false,
        enableCreate: false,
      },
    }),

  // High density display
  dense: (): CalendarView =>
    createWeekView({
      hourHeight: 36,
      showAllDay: false,
      viewConfig: {
        hourHeight: 36,
        showAllDay: false,
      },
    }),

  // Start with Sunday
  sundayFirst: (): CalendarView =>
    createWeekView({
      startOfWeek: 0, // Sunday
      viewConfig: {
        startOfWeek: 0,
      },
    }),

  // Extended work hours (6:00-22:00)
  extended: (): CalendarView =>
    createWeekView({
      firstHour: 6,
      lastHour: 22,
      viewConfig: {
        firstHour: 6,
        lastHour: 22,
      },
    }),
};

export default createWeekView;
