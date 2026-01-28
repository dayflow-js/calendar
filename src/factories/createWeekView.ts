// Factory function for creating Week view
import React from 'react';
import {
  WeekViewConfig,
  ViewAdapterProps,
  ViewFactory,
  CalendarView,
  ViewType,
} from '../types';
import { ViewAdapter } from './ViewAdapter';
import WeekView from '../views/WeekView';

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

export default createWeekView;
