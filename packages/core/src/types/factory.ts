import { AnyComponent, ComponentChildren, RefObject } from 'preact';

import { ViewSwitcherMode } from '@/components/common/ViewHeader';

import { CalendarView, CalendarViewType, ViewType, ICalendarApp } from './core';
import { Event } from './event';
import { EventLayout } from './layout';
import { TimeZoneValue } from './timezone';

/**
 * Common Props interface for view components
 * Base properties for all view components
 */
export interface BaseViewProps<TConfig = unknown> {
  // Core application instance
  app: ICalendarApp;

  // Base state
  currentDate?: Date; // Optional as they might be derived or passed via app
  currentView?: CalendarViewType;
  events?: Event[];

  // Event management - Optional as they can be derived from app
  onEventUpdate?: (event: Event) => void | Promise<void>;
  onEventDelete?: (eventId: string) => void | Promise<void>;
  onEventCreate?: (event: Event) => void;

  // Navigation control
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: CalendarViewType) => void;

  // View-specific configuration
  config: TConfig;
  // Selection control
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string | null) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;

  // Customization
  useEventDetailPanel?: boolean;
  calendarRef: RefObject<HTMLDivElement>;
  switcherMode?: ViewSwitcherMode;
  meta?: Record<string, unknown>;
}

/**
 * Day view specific Props
 */
export type DayViewProps = BaseViewProps<DayViewConfig>;

/**
 * Week view specific Props
 */
export type WeekViewProps = BaseViewProps<WeekViewConfig>;

/**
 * Month view specific Props
 */
export type MonthViewProps = BaseViewProps<MonthViewConfig>;

/**
 * Agenda view specific Props
 */
export type AgendaViewProps = BaseViewProps<AgendaViewConfig>;

/**
 * Year view specific Props
 */
export type YearViewProps = BaseViewProps<YearViewConfig>;

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
  timeFormat?: '12h' | '24h';
}

/**
 * Day view factory configuration
 */
export interface DayViewConfig extends ViewFactoryConfig {
  showAllDay?: boolean;
  scrollToCurrentTime?: boolean;
  secondaryTimeZone?: TimeZoneValue;
  showEventDots?: boolean;
}

/**
 * Week view factory configuration
 */
export interface WeekViewConfig extends ViewFactoryConfig {
  showWeekends?: boolean;
  showAllDay?: boolean;
  startOfWeek?: number;
  scrollToCurrentTime?: boolean;
  secondaryTimeZone?: TimeZoneValue;
  showEventDots?: boolean;
  /**
   * Action when a date cell is clicked.
   */
  gridDateClick?: 'day-view' | 'none' | ((date: Date, events: Event[]) => void);
  /**
   * Action when a date cell is double-clicked.
   * - 'day-view' (default): navigate to the Day View
   * - 'none': no action
   * - function: custom handler
   */
  gridDateDoubleClick?:
    | 'day-view'
    | 'none'
    | ((date: Date, events: Event[]) => void);
}

/**
 * Month scroll / navigation configuration
 */
export interface MonthScrollConfig {
  /** Disable continuous scrolling; only Prev/Next buttons switch months */
  disabled?: boolean;
  /**
   * Transition animation when switching months in disabled-scroll mode.
   * - 'slide'  (default) – vertical slide up/down
   * - 'fade'             – horizontal fade-slide (left ↔ right)
   */
  transition?: 'slide' | 'fade';
}

/**
 * Month view factory configuration
 */
export interface MonthViewConfig extends ViewFactoryConfig {
  showWeekNumbers?: boolean;
  showMonthIndicator?: boolean;
  startOfWeek?: number;
  snapToMonth?: boolean;
  /** Scroll / navigation behavior for the month view */
  scroll?: MonthScrollConfig;
  showEventDots?: boolean;
  /** Height in pixels of each event row in the month grid. Default: 16 */
  eventHeight?: number;
  /**
   * Action when a date cell is clicked.
   */
  gridDateClick?:
    | 'week-view'
    | 'day-view'
    | 'none'
    | ((date: Date, events: Event[]) => void);
  /**
   * Action when a date cell is double-clicked.
   * - 'week-view' (default): navigate to the Week View
   * - 'none': no action
   * - function: custom handler
   */
  gridDateDoubleClick?:
    | 'week-view'
    | 'day-view'
    | 'none'
    | ((date: Date, events: Event[]) => void);
}

/**
 * Agenda view factory configuration
 */
export interface AgendaViewConfig extends ViewFactoryConfig {
  /** Number of days rendered in one agenda page. */
  daysToShow?: number;
  /** Whether empty dates should still render a section in the list. */
  showEmptyDays?: boolean;
  /**
   * Action when a date section is clicked.
   */
  gridDateClick?: 'day-view' | 'none' | ((date: Date, events: Event[]) => void);
  /**
   * Action when a date section is double-clicked.
   * - 'day-view' (default): navigate to the Day View
   * - 'none': no action
   * - function: custom handler
   */
  gridDateDoubleClick?:
    | 'day-view'
    | 'none'
    | ((date: Date, events: Event[]) => void);
}

/**
 * Year view factory configuration
 */
export interface YearViewConfig extends ViewFactoryConfig {
  mode?: 'year-canvas' | 'fixed-week' | 'grid';
  showTimedEventsInYearView?: boolean;
  startOfWeek?: number;
  /** Scroll / navigation behavior for the month view */
  scroll?: MonthScrollConfig;
  showEventDots?: boolean;
  /**
   * Grid mode: action when a date cell is clicked.
   */
  gridDateClick?:
    | 'popup'
    | 'day-view'
    | 'none'
    | ((date: Date, events: Event[]) => void);
  /**
   * Grid mode: action when a date cell is double-clicked.
   * - 'day-view' (default): navigate to the Day View
   * - 'none': no action
   * - function: custom handler
   */
  gridDateDoubleClick?:
    | 'day-view'
    | 'none'
    | ((date: Date, events: Event[]) => void);
  /**
   * Grid mode: render custom popup content.
   * Receives the clicked date and its events; return null/undefined to use the default popup.
   */
  gridPopupContent?: (date: Date, events: Event[]) => ComponentChildren;
  /**
   * Grid mode: number of heatmap intensity levels.
   * @default 5
   */
  gridHeatmapLevels?: number;
}

/**
 * View adapter Props
 * Adapter properties for wrapping original components
 */
export interface ViewAdapterProps extends BaseViewProps {
  viewType: CalendarViewType;
  // oxlint-disable-next-line typescript/no-explicit-any
  originalComponent: AnyComponent<any, any>;
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
  calendarRef: RefObject<HTMLDivElement>;
  allDayRowRef?: RefObject<HTMLDivElement>;
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
