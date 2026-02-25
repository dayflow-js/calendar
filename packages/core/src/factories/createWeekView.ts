// Factory function for creating Week view
import { h } from 'preact';

import { WeekViewConfig, WeekViewProps, ViewFactory, ViewType } from '@/types';
import WeekView from '@/views/WeekView';

import { ViewAdapter } from './ViewAdapter';

// Default Week view configuration
const defaultWeekViewConfig: WeekViewConfig = {
  // Week view specific configuration
  showWeekends: true,
  showAllDay: true,
  startOfWeek: 1, // Monday
  scrollToCurrentTime: true,

  // Layout configuration
  hourHeight: 72,
  firstHour: 0,
  lastHour: 24,
  allDayHeight: 28,
};

// Week view factory function
export const createWeekView: ViewFactory<WeekViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultWeekViewConfig, ...config };

  // Create adapter component
  const WeekViewAdapter = (props: WeekViewProps) =>
    h(ViewAdapter, {
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
      selectedEventId: props.selectedEventId,
      detailPanelEventId: props.detailPanelEventId,
      onEventSelect: props.onEventSelect,
      onDetailPanelToggle: props.onDetailPanelToggle,
    });

  // Set display name for debugging
  WeekViewAdapter.displayName = 'WeekViewAdapter';

  return {
    type: ViewType.WEEK,
    component: WeekViewAdapter,
    config: finalConfig,
  };
};

export default createWeekView;
