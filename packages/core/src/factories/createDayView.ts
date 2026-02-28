// Factory function for creating Day view
import { h } from 'preact';

import { DayViewConfig, DayViewProps, ViewFactory, ViewType } from '@/types';
import DayView from '@/views/DayView';

import { ViewAdapter } from './ViewAdapter';

// Default Day view configuration
const defaultDayViewConfig: DayViewConfig = {
  // Day view specific configuration
  showAllDay: true,
  scrollToCurrentTime: true,

  // Layout configuration
  hourHeight: 72,
  firstHour: 0,
  lastHour: 24,
  allDayHeight: 28,
  timeFormat: '24h',
};

// Day view factory function
export const createDayView: ViewFactory<DayViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultDayViewConfig, ...config };

  // Create adapter component
  const DayViewAdapter = (props: DayViewProps) =>
    h(ViewAdapter, {
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

  // Set display name for debugging
  DayViewAdapter.displayName = 'DayViewAdapter';

  return {
    type: ViewType.DAY,
    component: DayViewAdapter,
    config: finalConfig,
  };
};

export default createDayView;
