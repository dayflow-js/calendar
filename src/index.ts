// Styles
import './styles/tailwind.css';

// Core exports
export { CalendarApp } from './core/CalendarApp';
export { useCalendarApp } from './core/useCalendarApp';
export { DayFlowCalendar } from './core/DayFlowCalendar';
export { CalendarRegistry } from './core/calendarRegistry';

// Theme exports
export { ThemeProvider, useTheme } from './contexts/ThemeContext';
export type { ThemeContextType, ThemeProviderProps } from './contexts/ThemeContext';

// View factories
export { createDayView } from './factories/createDayView';
export { createWeekView } from './factories/createWeekView';
export { createMonthView } from './factories/createMonthView';
export { createYearView } from './factories/createYearView';

// Plugins
export { createEventsPlugin } from './plugins/eventsPlugin';
export { createDragPlugin } from './plugins/dragPlugin';
export { useDragForView } from './plugins/dragPlugin';

// Hooks
export { useDrag } from './hooks/drag/useDrag';
export {
  useVirtualScroll,
  useResponsiveConfig,
} from './hooks/virtualScroll/useVirtualScroll';
export {
  useVirtualMonthScroll,
  useResponsiveMonthConfig,
} from './hooks/virtualScroll/useVirtualMonthScroll';

// Components
export { default as CalendarEvent } from './components/calendarEvent';
export { default as DefaultEventDetailPanel } from './components/common/DefaultEventDetailPanel';
export { default as DefaultEventDetailDialog } from './components/common/DefaultEventDetailDialog';
export { default as EventDetailPanelWithContent } from './components/common/EventDetailPanelWithContent';
export { default as ViewHeader } from './components/common/ViewHeader';
export type {
  ViewHeaderType,
  ViewSwitcherMode,
} from './components/common/ViewHeader';
export { default as ColorPicker } from './components/common/ColorPicker';
export type {
  ColorOption,
  ColorPickerProps,
} from './components/common/ColorPicker';
export { EventLayoutCalculator } from './components/eventLayout';

// Utilities
export * from './utils';

// Locale exports
export * from './locale';

// Type exports
export type {
  CalendarPlugin,
  CalendarView,
  CalendarConfig,
  CalendarSidebarRenderProps,
  SidebarConfig,
  UseCalendarAppReturn,
  CalendarApp as ICalendarApp,
  CalendarAppConfig,
  CalendarCallbacks,
} from './types/core';

export type { Event } from './types/event';

export type { DragConfig } from './types/config';

export type {
  CalendarType,
  ThemeMode,
  ThemeConfig,
  CalendarColors,
  CalendarsConfig,
} from './types/calendarTypes';

export type {
  DragIndicatorProps,
  DragIndicatorRenderer,
} from './types/dragIndicator';

export type {
  EventsService,
  EventsPluginConfig,
  DragService,
  DragPluginConfig,
  DragHookOptions,
  DragHookReturn,
} from './types/plugin';

export type {
  BaseViewProps,
  ViewFactory,
  ViewAdapterProps,
} from './types/factory';

export type {
  EventDetailPosition,
  EventDetailPanelProps,
  EventDetailPanelRenderer,
  EventDetailContentProps,
  EventDetailContentRenderer,
  EventDetailDialogProps,
  EventDetailDialogRenderer,
} from './types/eventDetail';

export type {
  CalendarSearchProps,
  CalendarSearchEvent,
} from './types/search';

export type {
  MobileEventProps,
  MobileEventRenderer,
} from './types/mobileEvent';

export { ViewType } from './types';
