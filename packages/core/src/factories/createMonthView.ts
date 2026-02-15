// Factory function for creating Month view
import { h } from 'preact';
import {
  MonthViewConfig,
  ViewAdapterProps,
  ViewFactory,
  ViewType,
} from '../types';
import { ViewAdapter } from './ViewAdapter';
import MonthView from '../views/MonthView';

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
};

// Month view factory function
export const createMonthView: ViewFactory<MonthViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultMonthViewConfig, ...config };

  // Create adapter component
  const MonthViewAdapter: any = (props: any) => {
    return h(ViewAdapter, {
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
      selectedEventId: props.selectedEventId,
      detailPanelEventId: props.detailPanelEventId,
      onEventSelect: props.onEventSelect,
      onDetailPanelToggle: props.onDetailPanelToggle,
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

export default createMonthView;
