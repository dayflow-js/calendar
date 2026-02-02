// Factory function for creating Year view
import React from 'react';
import {
  YearViewConfig,
  ViewFactory,
  ViewAdapterProps,
  CalendarView,
  ViewType,
} from '../types';
import { ViewAdapter } from './ViewAdapter';
import YearView from '../views/YearView';

// Default Year view configuration
const defaultYearViewConfig: YearViewConfig = {
  // Feature toggles
  enableDrag: false,
  enableResize: false,
  enableCreate: false,

  // Year view specific configuration
  enableVirtualScroll: true,
  showDebugInfo: false,

  // Plugin configuration
  eventsConfig: {
    enableAutoRecalculate: false,
    enableValidation: true,
  },

  // View specific configuration
  viewConfig: {
    enableVirtualScroll: true,
    showDebugInfo: false,
  },
};

// Year view factory function
export const createYearView: ViewFactory<YearViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultYearViewConfig, ...config };

  // Ensure mode is passed to viewConfig
  if (config.mode) {
    finalConfig.viewConfig = {
      ...finalConfig.viewConfig,
      mode: config.mode,
    };
  }

  // Create adapter component
  const YearViewAdapter: React.FC<ViewAdapterProps> = props => {
    return React.createElement(ViewAdapter, {
      viewType: ViewType.YEAR,
      originalComponent: YearView,
      app: props.app,
      config: finalConfig,
      className: 'year-view-factory',
      customDetailPanelContent: props.customDetailPanelContent,
      customEventDetailDialog: props.customEventDetailDialog,
      calendarRef: props.calendarRef,
      meta: props.meta,
    });
  };

  // Set display name for debugging
  YearViewAdapter.displayName = 'YearViewAdapter';

  return {
    type: ViewType.YEAR,
    component: YearViewAdapter,
    config: finalConfig,
  };
};

export default createYearView;
