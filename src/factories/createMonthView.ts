// Factory function for creating Month view
import React from 'react';
import {
  MonthViewConfig,
  ViewAdapterProps,
  ViewFactory,
  CalendarView,
  ViewType,
} from '@/types';
import { ViewAdapter } from './ViewAdapter';
import MonthView from '@/views/MonthView';

// Default Month view configuration
const defaultMonthViewConfig: MonthViewConfig = {
  // Feature toggles
  enableDrag: true,
  enableResize: false, // Month view usually doesn't need resizing
  enableCreate: true,

  // Month view specific configuration
  showOtherMonth: true,
  weekHeight: 120,
  showWeekNumbers: false,
  enableVirtualScroll: true,

  // Virtual scroll configuration
  initialWeeksToLoad: 156, // 3 years of week data (52*3)

  // Plugin configuration
  dragConfig: {
    supportedViews: [ViewType.MONTH],
    enableAllDayCreate: false, // Month view usually only supports all-day events
  },

  eventsConfig: {
    enableAutoRecalculate: true,
    enableValidation: true,
  },

  virtualScrollConfig: {
    weekHeight: 120,
    initialWeeksToLoad: 156,
    enableVirtualScroll: true,
    enableKeyboardNavigation: true,
    supportedViews: [ViewType.MONTH],
  },

  // View specific configuration
  viewConfig: {
    showOtherMonth: true,
    weekHeight: 120,
    showWeekNumbers: false,
    enableVirtualScroll: true,
  },
};

// Month view factory function
export const createMonthView: ViewFactory<MonthViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultMonthViewConfig, ...config };

  // Create adapter component
  const MonthViewAdapter: React.FC<ViewAdapterProps> = props => {
    return React.createElement(ViewAdapter, {
      viewType: ViewType.MONTH,
      originalComponent: MonthView,
      app: props.app,
      config: finalConfig,
      className: 'month-view-factory',
      customDetailPanelContent: props.customDetailPanelContent,
      customEventDetailDialog: props.customEventDetailDialog,
      calendarRef: props.calendarRef,
      switcherMode: props.switcherMode,
      meta: props.meta,
    });
  };

  // Set display name for debugging
  MonthViewAdapter.displayName = 'MonthViewAdapter';

  return {
    type: ViewType.MONTH,
    component: MonthViewAdapter,
    config: finalConfig,
  };
};
// TODO: remove
// Convenient Month view configuration creation function
export function createMonthViewConfig(
  overrides: Partial<MonthViewConfig> = {}
): MonthViewConfig {
  return { ...defaultMonthViewConfig, ...overrides };
}

// Preset configurations
export const monthViewPresets = {
  // Standard configuration
  standard: (): CalendarView => createMonthView(),

  // Compact mode
  compact: (): CalendarView =>
    createMonthView({
      weekHeight: 80,
      showOtherMonth: false,
      viewConfig: {
        weekHeight: 80,
        showOtherMonth: false,
      },
      virtualScrollConfig: {
        weekHeight: 80,
      },
    }),

  // High density display
  dense: (): CalendarView =>
    createMonthView({
      weekHeight: 60,
      showOtherMonth: false,
      viewConfig: {
        weekHeight: 60,
        showOtherMonth: false,
      },
      virtualScrollConfig: {
        weekHeight: 60,
      },
    }),

  // Disable virtual scroll
  noVirtualScroll: (): CalendarView =>
    createMonthView({
      enableVirtualScroll: false,
      viewConfig: {
        enableVirtualScroll: false,
      },
      virtualScrollConfig: {
        enableVirtualScroll: false,
      },
    }),

  // Show week numbers
  withWeekNumbers: (): CalendarView =>
    createMonthView({
      showWeekNumbers: true,
      viewConfig: {
        showWeekNumbers: true,
      },
    }),

  // Disable drag
  readOnly: (): CalendarView =>
    createMonthView({
      enableDrag: false,
      enableResize: false,
      enableCreate: false,
      dragConfig: {
        enableDrag: false,
        enableResize: false,
        enableCreate: false,
      },
    }),

  // Large size month view
  large: (): CalendarView =>
    createMonthView({
      weekHeight: 160,
      showOtherMonth: true,
      showWeekNumbers: true,
      viewConfig: {
        weekHeight: 160,
        showOtherMonth: true,
        showWeekNumbers: true,
      },
      virtualScrollConfig: {
        weekHeight: 160,
      },
    }),

  // Quick load (less preloaded data)
  quickLoad: (): CalendarView =>
    createMonthView({
      initialWeeksToLoad: 52, // 1 year of data
      virtualScrollConfig: {
        initialWeeksToLoad: 52,
      },
    }),

  // Extended load (more preloaded data)
  extendedLoad: (): CalendarView =>
    createMonthView({
      initialWeeksToLoad: 260, // 5 years of data
      virtualScrollConfig: {
        initialWeeksToLoad: 260,
      },
    }),
};

export default createMonthView;
