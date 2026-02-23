// Factory function for creating Week view
import { h } from 'preact';
import {
  WeekViewConfig,
  ViewFactory,
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
  mobileColumns: 2,

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
};

// Week view factory function
export const createWeekView: ViewFactory<WeekViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultWeekViewConfig, ...config };

  // Create adapter component
  const WeekViewAdapter: any = (props: any) => {
    return h(ViewAdapter, {
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
