// Core type definitions
import React from 'react';
import { Event } from './event';
import { ViewSwitcherMode } from '../components/common/ViewHeader';
import { CalendarType, ThemeConfig, ThemeMode } from './calendarTypes';
import { CalendarRegistry } from '../core/calendarRegistry';
import { Locale } from '../locale/types';
import { MobileEventRenderer } from './mobileEvent';

/**
 * View type enum
 */
export enum ViewType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

/**
 * Plugin interface
 * Defines the basic structure of calendar plugins
 */
export interface CalendarPlugin {
  name: string;
  install: (app: CalendarApp) => void;
  config?: Record<string, unknown>;
  api?: unknown;
}

/**
 * View interface
 * Defines the basic structure of calendar views
 */
export interface CalendarView {
  type: ViewType;
  component: React.ComponentType<any>;
  config?: Record<string, unknown>;
}

/**
 * Calendar callbacks interface
 * Defines calendar event callback functions
 */
export interface CalendarCallbacks {
  onViewChange?: (view: ViewType) => void | Promise<void>;
  onEventCreate?: (event: Event) => void | Promise<void>;
  onEventUpdate?: (event: Event) => void | Promise<void>;
  onEventDelete?: (eventId: string) => void | Promise<void>;
  onDateChange?: (date: Date) => void | Promise<void>;
  onRender?: () => void | Promise<void>;
  onVisibleMonthChange?: (date: Date) => void | Promise<void>;
  onCalendarUpdate?: (calendar: CalendarType) => void | Promise<void>;
  onCalendarCreate?: (calendar: CalendarType) => void | Promise<void>;
  onCalendarDelete?: (calendarId: string) => void | Promise<void>;
  onCalendarMerge?: (sourceId: string, targetId: string) => void | Promise<void>;
}

export interface CreateCalendarDialogProps {
  onClose: () => void;
  onCreate: (calendar: CalendarType) => void;
}

/**
 * Sidebar render props
 */
export interface CalendarSidebarRenderProps {
  app: CalendarApp;
  calendars: CalendarType[];
  toggleCalendarVisibility: (calendarId: string, visible: boolean) => void;
  toggleAll: (visible: boolean) => void;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  renderCalendarContextMenu?: (calendar: CalendarType, onClose: () => void) => React.ReactNode;
  createCalendarMode?: 'inline' | 'modal';
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => React.ReactNode;
  editingCalendarId?: string | null;
  setEditingCalendarId?: (id: string | null) => void;
}

/**
 * Sidebar config
 */
export interface SidebarConfig {
  enabled?: boolean;
  width?: number | string;
  initialCollapsed?: boolean;
  render?: (props: CalendarSidebarRenderProps) => React.ReactNode;
  renderCalendarContextMenu?: (calendar: CalendarType, onClose: () => void) => React.ReactNode;
  createCalendarMode?: 'inline' | 'modal';
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => React.ReactNode;
}

/**
 * Calendar application configuration
 * Used to initialize CalendarApp
 */
export interface CalendarAppConfig {
  views: CalendarView[];
  plugins?: CalendarPlugin[];
  events?: Event[];
  callbacks?: CalendarCallbacks;
  defaultView?: ViewType;
  initialDate?: Date;
  switcherMode?: ViewSwitcherMode;
  calendars?: CalendarType[];
  defaultCalendar?: string;
  theme?: ThemeConfig;
  useSidebar?: boolean | SidebarConfig;
  useEventDetailDialog?: boolean;
  customMobileEventRenderer?: MobileEventRenderer;
  locale?: string | Locale;
}

/**
 * Calendar application state
 * Internal state of CalendarApp
 */
export interface CalendarAppState {
  currentView: ViewType;
  currentDate: Date;
  events: Event[];
  plugins: Map<string, CalendarPlugin>;
  views: Map<ViewType, CalendarView>;
  switcherMode?: ViewSwitcherMode;
  sidebar?: SidebarConfig;
  locale: string | Locale;
  highlightedEventId?: string | null;
}

/**
 * Calendar application instance
 * Core interface of CalendarApp
 */
export interface CalendarApp {
  // State
  state: CalendarAppState;

  // View management
  changeView: (view: ViewType) => void;
  getCurrentView: () => CalendarView;

  // Date management
  setCurrentDate: (date: Date) => void;
  getCurrentDate: () => Date;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  selectDate: (date: Date) => void;

  // Event management
  addEvent: (event: Event) => void;
  updateEvent: (id: string, event: Partial<Event>, isPending?: boolean) => void;
  deleteEvent: (id: string) => void;
  getEvents: () => Event[];
  getAllEvents: () => Event[];
  highlightEvent: (eventId: string | null) => void;
  getCalendars: () => CalendarType[];
  reorderCalendars: (fromIndex: number, toIndex: number) => void;
  setCalendarVisibility: (calendarId: string, visible: boolean) => void;
  setAllCalendarsVisibility: (visible: boolean) => void;
  updateCalendar: (id: string, updates: Partial<CalendarType>) => void;
  createCalendar: (calendar: CalendarType) => void;
  deleteCalendar: (id: string) => void;
  mergeCalendars: (sourceId: string, targetId: string) => void;
  setVisibleMonth: (date: Date) => void;
  getVisibleMonth: () => Date;

  // Plugin management
  getPlugin: <T = unknown>(name: string) => T | undefined;
  hasPlugin: (name: string) => boolean;

  // Rendering
  render: () => React.ReactElement;

  // Sidebar
  getSidebarConfig: () => SidebarConfig;

  // Trigger render callback
  triggerRender: () => void;

  // Get CalendarRegistry instance
  getCalendarRegistry: () => CalendarRegistry;

  // Get whether to use event detail dialog
  getUseEventDetailDialog: () => boolean;

  // Get custom mobile event renderer
  getCustomMobileEventRenderer: () => MobileEventRenderer | undefined;

  // Update configuration dynamically
  updateConfig: (config: Partial<CalendarAppConfig>) => void;

  // Theme management
  setTheme: (mode: ThemeMode) => void;
  getTheme: () => ThemeMode;
  subscribeThemeChange: (callback: (theme: ThemeMode) => void) => (() => void);
  unsubscribeThemeChange: (callback: (theme: ThemeMode) => void) => void;
}

/**
 * useCalendarApp Hook return type
 * Calendar application interface provided for React components
 */
export interface UseCalendarAppReturn {
  app: CalendarApp;
  currentView: ViewType;
  currentDate: Date;
  events: Event[];
  changeView: (view: ViewType) => void;
  setCurrentDate: (date: Date) => void;
  addEvent: (event: Event) => void;
  updateEvent: (id: string, event: Partial<Event>, isPending?: boolean) => void;
  deleteEvent: (id: string) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  selectDate: (date: Date) => void;
  getCalendars: () => CalendarType[];
  createCalendar: (calendar: CalendarType) => void;
  mergeCalendars: (sourceId: string, targetId: string) => void;
  setCalendarVisibility: (calendarId: string, visible: boolean) => void;
  setAllCalendarsVisibility: (visible: boolean) => void;
  getAllEvents: () => Event[];
  highlightEvent: (eventId: string | null) => void;
  setVisibleMonth: (date: Date) => void;
  getVisibleMonth: () => Date;
  sidebarConfig: SidebarConfig;
}

/**
 * Calendar configuration system type
 * Contains drag and view configurations
 */
export interface CalendarConfig {
  locale?: string;
  drag: {
    HOUR_HEIGHT: number;
    FIRST_HOUR: number;
    LAST_HOUR: number;
    MIN_DURATION: number;
    TIME_COLUMN_WIDTH: number;
    ALL_DAY_HEIGHT: number;
    getLineColor: (color: string) => string;
    getDynamicPadding: (drag: { endHour: number; startHour: number }) => string;
  };
  views: {
    day: Record<string, unknown>;
    week: Record<string, unknown>;
    month: Record<string, unknown>;
  };
}

export interface UseCalendarReturn {
  // State
  view: ViewType;
  currentDate: Date;
  events: Event[];
  currentWeekStart: Date;

  // Actions
  changeView: (view: ViewType) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  selectDate: (date: Date) => void;
  updateEvent: (
    eventId: string,
    updates: Partial<Event>,
    isPending?: boolean
  ) => void;
  deleteEvent: (eventId: string) => void;
  addEvent: (event: Omit<Event, 'id'>) => void;
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void;
}
