// Factory function for creating Month view
import { h } from 'preact';
import { MonthViewConfig, ViewFactory, ViewType } from '../types';
import { ViewAdapter } from './ViewAdapter';
import MonthView from '../views/MonthView';

// Default Month view configuration
const defaultMonthViewConfig: MonthViewConfig = {
  // Month view specific configuration
  showOtherMonth: true,
  showWeekNumbers: false,
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
