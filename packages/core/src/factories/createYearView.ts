// Factory function for creating Year view
import { h } from 'preact';

import { YearViewConfig, YearViewProps, ViewFactory, ViewType } from '@/types';
import YearView from '@/views/YearView';

import { ViewAdapter } from './ViewAdapter';

// Default Year view configuration
const defaultYearViewConfig: YearViewConfig = {
  // Year view specific configuration
  startOfWeek: 1, // Monday
};

// Year view factory function
export const createYearView: ViewFactory<YearViewConfig> = (config = {}) => {
  // Merge configuration
  const finalConfig = { ...defaultYearViewConfig, ...config };

  // Create adapter component
  const YearViewAdapter = (props: YearViewProps) =>
    h(ViewAdapter, {
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

  // Set display name for debugging
  YearViewAdapter.displayName = 'YearViewAdapter';

  return {
    type: ViewType.YEAR,
    component: YearViewAdapter,
    config: finalConfig,
  };
};

export default createYearView;
