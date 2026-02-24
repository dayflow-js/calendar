// Factory function for creating Year view
import { h } from 'preact';
import { YearViewConfig, ViewFactory, ViewType } from '../types';
import { ViewAdapter } from './ViewAdapter';
import YearView from '../views/YearView';

// Default Year view configuration
const defaultYearViewConfig: YearViewConfig = {
  // Year view specific configuration
};

// Year view factory function
export const createYearView: ViewFactory<YearViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultYearViewConfig, ...config };

  // Create adapter component
  const YearViewAdapter: any = (props: any) => {
    return h(ViewAdapter, {
      viewType: ViewType.YEAR,
      originalComponent: YearView,
      app: props.app,
      config: finalConfig,
      className: 'year-view-factory',
      customDetailPanelContent: props.customDetailPanelContent,
      customEventDetailDialog: props.customEventDetailDialog,
      calendarRef: props.calendarRef,
      meta: props.meta,
      selectedEventId: props.selectedEventId,
      detailPanelEventId: props.detailPanelEventId,
      onEventSelect: props.onEventSelect,
      onDetailPanelToggle: props.onDetailPanelToggle,
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
