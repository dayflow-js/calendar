// Factory function for creating Day view
import React from 'react';
import { ViewAdapter } from './ViewAdapter';
import DayView from '../views/DayView';
import {
  DayViewConfig,
  ViewAdapterProps,
  ViewFactory,
  ViewType,
} from '../types';
import { buildFactoryViewConfig } from './viewConfigUtils';

// Default Day view configuration
const defaultDayViewConfig: DayViewConfig = {
  // Feature toggles
  enableDrag: true,
  enableResize: true,
  enableCreate: true,

  // Day view specific configuration
  showMiniCalendar: true,
  showAllDay: true,
  scrollToCurrentTime: true,

  // Layout configuration
  hourHeight: 72,
  firstHour: 0,
  lastHour: 24,

  // Plugin configuration
  dragConfig: {
    supportedViews: [ViewType.DAY],
    enableAllDayCreate: true,
  },

  eventsConfig: {
    enableAutoRecalculate: true,
    enableValidation: true,
  },
};

// Day view factory function
export const createDayView: ViewFactory<DayViewConfig> = (config = {}) => {
  const finalViewConfig = buildFactoryViewConfig(defaultDayViewConfig, config, [
    'showMiniCalendar',
    'showAllDay',
    'scrollToCurrentTime',
  ]);

  // Merge configuration
  const finalConfig = {
    ...defaultDayViewConfig,
    ...config,
    viewConfig: finalViewConfig,
  };

  // Create adapter component
  const DayViewAdapter: React.FC<ViewAdapterProps> = props => {
    return React.createElement(ViewAdapter, {
      viewType: ViewType.DAY,
      originalComponent: DayView,
      app: props.app,
      config: finalConfig,
      className: 'day-view-factory',
      customDetailPanelContent: props.customDetailPanelContent,
      customEventDetailDialog: props.customEventDetailDialog,
      calendarRef: props.calendarRef,
      switcherMode: props.switcherMode,
      meta: props.meta,
      selectedEventId: props.selectedEventId,
      onEventSelect: props.onEventSelect,
      detailPanelEventId: props.detailPanelEventId,
      onDetailPanelToggle: props.onDetailPanelToggle,
    });
  };

  // Set display name for debugging
  DayViewAdapter.displayName = 'DayViewAdapter';

  return {
    type: ViewType.DAY,
    component: DayViewAdapter,
    config: finalConfig,
  };
};

export default createDayView;
