// View factory type definitions
import { CalendarView, ViewType, ICalendarApp, ViewMode } from './core';
import { Event } from './event';
import { EventLayout } from './layout';
import {
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
} from './eventDetail';
import { ViewSwitcherMode } from '../components/common/ViewHeader';

/**
 * Common Props interface for view components
 * Base properties for all view components
 */
export interface BaseViewProps<TConfig = any> {
  // Core application instance
  app: ICalendarApp;

  // Base state
  currentDate?: Date; // Optional as they might be derived or passed via app
  currentView?: ViewType;
  events?: Event[];

  // Event management - Optional as they can be derived from app
  onEventUpdate?: (event: Event) => void;
  onEventDelete?: (eventId: string) => void;
  onEventCreate?: (event: Event) => void;

  // Navigation control
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: ViewType) => void;

  // View-specific configuration
  config: TConfig;
  // Selection control
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string | null) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;

  // Customization
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  calendarRef: any;
  switcherMode?: ViewSwitcherMode;
  meta?: Record<string, any>;
}

/**
 * Day view specific Props
 */
export interface DayViewProps extends BaseViewProps<DayViewConfig> {
  // Day view specific properties
}

/**
 * Week view specific Props
 */
export interface WeekViewProps extends BaseViewProps<WeekViewConfig> {
  // Week view specific properties
}

/**
 * Month view specific Props
 */
export interface MonthViewProps extends BaseViewProps<MonthViewConfig> {
  // Month view specific properties
}

/**
 * Year view specific Props
 */
export interface YearViewProps extends BaseViewProps<YearViewConfig> {
  // Year view specific properties
}

/**
 * View factory configuration interface
 * Base configuration for creating views
 */
export interface ViewFactoryConfig {
  // Shared layout properties
  hourHeight?: number;
  firstHour?: number;
  lastHour?: number;
  allDayHeight?: number;
}

/**
 * Day view factory configuration
 */
export interface DayViewConfig extends ViewFactoryConfig {
  showAllDay?: boolean;
  scrollToCurrentTime?: boolean;
}

/**
 * Week view factory configuration
 */
export interface WeekViewConfig extends ViewFactoryConfig {
  showWeekends?: boolean;
  showAllDay?: boolean;
  startOfWeek?: number;
  scrollToCurrentTime?: boolean;
  mode?: ViewMode;
}

/**
 * Month view factory configuration
 */
export interface MonthViewConfig extends ViewFactoryConfig {
  showOtherMonth?: boolean;
  showWeekNumbers?: boolean;
}

/**
 * Year view factory configuration
 */
export interface YearViewConfig extends ViewFactoryConfig {
  mode?: 'year-canvas' | 'fixed-week';
  showTimedEventsInYearView?: boolean;
}

/**
 * View adapter Props
 * Adapter properties for wrapping original components
 */
export interface ViewAdapterProps extends BaseViewProps {
  viewType: ViewType;
  originalComponent: any;
  config: ViewFactoryConfig;
  className?: string;
}

/**
 * Drag integration Props
 * Properties for integrating drag functionality into views
 */
export interface DragIntegrationProps {
  app: ICalendarApp;
  viewType: ViewType;
  calendarRef: any;
  allDayRowRef?: any;
  events: Event[];
  onEventsUpdate: (updateFunc: (events: Event[]) => Event[]) => void;
  onEventCreate: (event: Event) => void;
  calculateNewEventLayout?: (
    dayIndex: number,
    startHour: number,
    endHour: number
  ) => EventLayout | null;
  calculateDragLayout?: (
    event: Event,
    targetDay: number,
    targetStartHour: number,
    targetEndHour: number
  ) => EventLayout | null;
  currentWeekStart: Date;
}

/**
 * Virtual scroll integration Props
 * Properties for integrating virtual scroll functionality into views
 */
export interface VirtualScrollIntegrationProps {
  app: ICalendarApp;
  currentDate: Date;
  weekHeight?: number;
  onCurrentMonthChange?: (month: string, year: number) => void;
  initialWeeksToLoad?: number;
}

/**
 * Factory function return type
 * Type definition for view factory functions
 */
export interface ViewFactory<TConfig = ViewFactoryConfig> {
  (config?: TConfig): CalendarView;
}
