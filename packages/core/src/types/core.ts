// Core type definitions
import { Event } from './event';
import { ViewSwitcherMode } from '../components/common/ViewHeader';
import { CalendarType, ThemeConfig, ThemeMode } from './calendarTypes';
import { CalendarRegistry } from '../core/calendarRegistry';
import { Locale } from '../locale/types';
import { MobileEventRenderer } from './mobileEvent';

/** Generic type for framework-specific components */
export type TComponent = any;
/** Generic type for framework-specific nodes/elements */
export type TNode = any;

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
  install: (app: ICalendarApp) => void;
  config?: Record<string, unknown>;
  api?: unknown;
}

/**
 * View interface
 * Defines the basic structure of calendar views
 */
export interface CalendarView {
  type: ViewType;
  component: TComponent;
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
  onEventClick?: (event: Event) => void | Promise<void>;
  onMoreEventsClick?: (date: Date) => void | Promise<void>;
}

export interface CreateCalendarDialogProps {
  onClose: () => void;
  onCreate: (calendar: CalendarType) => void;
  colorPickerMode?: 'blossom' | 'default';
}

export interface CalendarHeaderProps {
  calendar: ICalendarApp;
  switcherMode?: ViewSwitcherMode;
  onAddCalendar?: (e: any) => void;
  onSearchChange?: (value: string) => void;
  /** Triggered when search icon is clicked (typically on mobile) */
  onSearchClick?: () => void;
  searchValue?: string;
  isSearchOpen?: boolean;
  isEditable?: boolean;
  /** Left safe area padding (px) to avoid overlapping with traffic light buttons in macMode */
  safeAreaLeft?: number;
}

/**
 * Sidebar render props
 */
export interface CalendarSidebarRenderProps {
  app: ICalendarApp;
  calendars: CalendarType[];
  toggleCalendarVisibility: (calendarId: string, visible: boolean) => void;
  toggleAll: (visible: boolean) => void;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  renderCalendarContextMenu?: (calendar: CalendarType, onClose: () => void) => TNode;
  createCalendarMode?: 'inline' | 'modal';
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => TNode;
  editingCalendarId?: string | null;
  setEditingCalendarId?: (id: string | null) => void;
  onCreateCalendar?: () => void;
  colorPickerMode?: 'blossom' | 'default';
}

/**
 * Sidebar config
 */
export interface SidebarConfig {
  enabled?: boolean;
  width?: number | string;
  initialCollapsed?: boolean;
  render?: (props: CalendarSidebarRenderProps) => TNode;
  renderCalendarContextMenu?: (calendar: CalendarType, onClose: () => void) => TNode;
  createCalendarMode?: 'inline' | 'modal';
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => TNode;
  /** Color picker mode: 'blossom' for BlossomColorPicker, 'default' for react-color */
  colorPickerMode?: 'blossom' | 'default';
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
  useCalendarHeader?: boolean | ((props: CalendarHeaderProps) => TNode);
  customMobileEventRenderer?: MobileEventRenderer;
  locale?: string | Locale;
  readOnly?: boolean | ReadOnlyConfig;
}

/**
 * Read-only configuration
 */
export interface ReadOnlyConfig {
  draggable?: boolean; // Whether to allow dragging
  viewable?: boolean; // Whether to allow inspecting (open detail panel/dialog/drawer)
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
  readOnly: boolean | ReadOnlyConfig;
}

/**
 * Calendar application instance
 * Core interface of CalendarApp
 */
export interface ICalendarApp {
  // State
  state: CalendarAppState;
  getReadOnlyConfig: () => ReadOnlyConfig;

  // Subscription management
  subscribe: (listener: (app: ICalendarApp) => void) => (() => void);

  // View management
  changeView: (view: ViewType) => void;
  getCurrentView: () => CalendarView;
  getViewConfig: (viewType: ViewType) => Record<string, unknown>;

  // Date management
  setCurrentDate: (date: Date) => void;
  getCurrentDate: () => Date;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  selectDate: (date: Date) => void;

  // Undo management
  undo: () => void;

  // Event management
  applyEventsChanges: (changes: {
    add?: Event[];
    update?: Array<{ id: string; updates: Partial<Event> }>;
    delete?: string[];
  }, isPending?: boolean) => void;
  addEvent: (event: Event) => void;
  updateEvent: (id: string, event: Partial<Event>, isPending?: boolean) => void;
  deleteEvent: (id: string) => void;
  getEvents: () => Event[];
  getAllEvents: () => Event[];
  onEventClick: (event: Event) => void;
  onMoreEventsClick: (date: Date) => void;
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

  // Sidebar
  getSidebarConfig: () => SidebarConfig;

  // Calendar Header
  getCalendarHeaderConfig: () => boolean | ((props: CalendarHeaderProps) => TNode);

  // Trigger render callback (internal use, notify subscribers)
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
  app: ICalendarApp;
  currentView: ViewType;
  currentDate: Date;
  events: Event[];
  applyEventsChanges: (changes: {
    add?: Event[];
    update?: Array<{ id: string; updates: Partial<Event> }>;
    delete?: string[];
  }, isPending?: boolean) => void;
  changeView: (view: ViewType) => void;
  setCurrentDate: (date: Date) => void;
  addEvent: (event: Event) => void;
  updateEvent: (id: string, event: Partial<Event>, isPending?: boolean) => void;
  deleteEvent: (id: string) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  selectDate: (date: Date) => void;
  undo: () => void;
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
  readOnlyConfig: ReadOnlyConfig;
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
