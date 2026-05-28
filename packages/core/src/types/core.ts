// oxlint-disable typescript/no-explicit-any
// Core type definitions
import { AnyComponent, ComponentChildren } from 'preact';

import { ViewSwitcherMode } from '@/components/common/ViewHeader';
import { CalendarRegistry } from '@/core/calendarRegistry';
import { Locale } from '@/locale/types';

import { CalendarType, ThemeConfig, ThemeMode } from './calendarTypes';
import { Event } from './event';
import { EventLayout } from './layout';
import { TimeZoneValue } from './timezone';

/** Generic type for framework-specific components */
export type TComponent = AnyComponent<any, any>;
/** Generic type for framework-specific nodes/elements */
export type TNode = ComponentChildren;

/**
 * View type enum
 */
export enum ViewType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  AGENDA = 'agenda',
  RESOURCE = 'resource',
}

export type CalendarViewType = ViewType | string;

/**
 * Plugin interface
 * Defines the basic structure of calendar plugins
 */
export interface CalendarPlugin {
  name: string;
  install: (app: ICalendarApp) => void;
  config?: any;
  api?: unknown;
}

/**
 * View interface
 * Defines the basic structure of calendar views
 */
export interface CalendarView {
  type: CalendarViewType;
  label?: string;
  component: TComponent;
  config?: Record<string, unknown>;
}

export type RangeChangeReason =
  | 'initial'
  | 'navigation'
  | 'viewChange'
  | 'scroll';

/**
 * Source of an event mutation.
 * - 'local': user-initiated change from the UI
 * - 'remote': applied by an external sync engine (e.g. CalDAV); must not trigger write-back
 * - 'drag' / 'resize': UI drag or resize interaction (pending → confirmed)
 */
export type EventMutationSource = 'local' | 'remote' | 'drag' | 'resize';

export type RawEventChange =
  | { type: 'create'; event: Event }
  | { type: 'update'; before: Event; after: Event }
  | { type: 'delete'; event: Event };

export type EventChange = RawEventChange & { source: EventMutationSource };

/**
 * Payload delivered to subscribeVisibleRangeChange listeners.
 * Includes the view type so sync engines can scope their range queries correctly.
 */
export type VisibleRangePayload = {
  start: Date;
  end: Date;
  reason: RangeChangeReason;
  view: CalendarViewType;
};

/**
 * Calendar callbacks interface
 * Defines calendar event callback functions
 */
export interface CalendarCallbacks {
  onEventBatchChange?: (changes: EventChange[]) => void | Promise<void>;
  onViewChange?: (view: CalendarViewType) => void | Promise<void>;
  onEventCreate?: (event: Event) => void | Promise<void>;
  onEventUpdate?: (event: Event) => void | Promise<void>;
  onEventDelete?: (eventId: string) => void | Promise<void>;
  onDateChange?: (date: Date) => void | Promise<void>;
  onRender?: () => void | Promise<void>;
  onVisibleRangeChange?: (
    start: Date,
    end: Date,
    reason: RangeChangeReason
  ) => void | Promise<void>;
  onCalendarUpdate?: (calendar: CalendarType) => void | Promise<void>;
  onCalendarCreate?: (calendar: CalendarType) => void | Promise<void>;
  onCalendarDelete?: (calendarId: string) => void | Promise<void>;
  onCalendarMerge?: (
    sourceId: string,
    targetId: string
  ) => void | Promise<void>;
  onCalendarReorder?: (
    fromIndex: number,
    toIndex: number
  ) => void | Promise<void>;
  onEventClick?: (event: Event) => void | Promise<void>;
  onEventDoubleClick?: (
    event: Event,
    e: MouseEvent
  ) => boolean | undefined | Promise<boolean | undefined>;
  onMoreEventsClick?: (date: Date) => void | Promise<void>;
  onDismissUI?: () => void | Promise<void>;
  /**
   * Toggle event detail panel or dialog.
   * If eventId is null, closes the detail UI.
   */
  onEventDetailToggle?: (eventId: string | null) => void;
  /**
   * Toggle the mobile event detail drawer.
   * Pass an event to open it, or null to close it.
   */
  onMobileEventDetailToggle?: (event: Event | null) => void;
}

export interface CalendarHeaderProps {
  calendar: ICalendarApp;
  switcherMode?: ViewSwitcherMode;
  onAddCalendar?: (e: MouseEvent | TouchEvent | any) => void;
  onSearchChange?: (value: string) => void;
  /** Triggered when search icon is clicked (typically on mobile) */
  onSearchClick?: () => void;
  searchValue?: string;
  isSearchOpen?: boolean;
  isEditable?: boolean;
  /** Left safe area padding (px) to avoid overlapping with traffic light buttons in macMode */
  safeAreaLeft?: number;
}

/** Args passed to all eventContent* slot renderers. */
export interface EventContentSlotArgs {
  event: Event;
  viewType: ViewType;
  isAllDay: boolean;
  isMobile: boolean;
  isSelected: boolean;
  isDragging: boolean;
  layout?: EventLayout;
}

/** Args passed to the eventContextMenu slot renderer. */
export interface EventContextMenuSlotArgs {
  event: Event;
  onClose: () => void;
}

/** Args passed to the gridContextMenu slot renderer. */
export interface GridContextMenuSlotArgs {
  date: Date;
  viewType?: ViewType;
  onClose: () => void;
}

/** Args passed to the monthDateNumberContent slot renderer. */
export interface MonthDateNumberSlotArgs {
  date: Date;
  day: number;
  isToday: boolean;
  belongsToCurrentMonth: boolean;
  locale: string;
  viewType: ViewType.MONTH;
}

/**
 * Calendar application configuration
 * Used to initialize CalendarApp
 */
/**
 * Comparator function for sorting all-day events across all views.
 * Return negative if `a` should appear before `b`, positive if after, 0 if equal.
 */
export type AllDaySortComparator = (a: Event, b: Event) => number;

export interface CalendarAppConfig {
  views: CalendarView[];
  plugins?: CalendarPlugin[];
  events?: Event[];
  callbacks?: CalendarCallbacks;
  defaultView?: CalendarViewType;
  initialDate?: Date;
  switcherMode?: ViewSwitcherMode;
  calendars?: CalendarType[];
  defaultCalendar?: string;
  theme?: ThemeConfig;
  useEventDetailDialog?: boolean;
  useEventDetailPanel?: boolean;
  /**
   * Gesture that opens the event detail panel/dialog on desktop.
   * - 'dblclick' (default): single-click selects, double-click opens (Mac Calendar style).
   * - 'click': single-click opens (Google Calendar style).
   * Touch input is unaffected — a single tap always opens.
   */
  eventDetailTrigger?: 'click' | 'dblclick';
  useCalendarHeader?: boolean;
  locale?: string | Locale;
  readOnly?: boolean | ReadOnlyConfig;
  /** Custom sort comparator for all-day events, applied in day/week/month/year views. */
  allDaySortComparator?: AllDaySortComparator;
  /**
   * Global display and editing timezone for all views.
   * Controls how event times are projected and how drag/resize/create operations interpret wall-clock time.
   * Defaults to the user's system timezone.
   * Switching this field only triggers a re-render — it never calls onEventUpdate or any persistence callback.
   */
  timeZone?: TimeZoneValue;
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
  currentView: CalendarViewType;
  currentDate: Date;
  events: Event[];
  plugins: Map<string, CalendarPlugin>;
  views: Map<CalendarViewType, CalendarView>;
  switcherMode?: ViewSwitcherMode;

  locale: string | Locale;
  highlightedEventId?: string | null;
  selectedEventId?: string | null;
  readOnly: boolean | ReadOnlyConfig;
  overrides: string[];
  allDaySortComparator?: AllDaySortComparator;
  /** Resolved global timezone (IANA string). See CalendarAppConfig.timeZone. */
  timeZone: string;
}

/**
 * Calendar application instance
 * Core interface of CalendarApp
 */
export interface ICalendarApp {
  // State
  state: CalendarAppState;
  getReadOnlyConfig: (id?: string) => ReadOnlyConfig;
  canMutateFromUI: (id?: string) => boolean;

  // Subscription management
  subscribe: (listener: (app: ICalendarApp) => void) => () => void;

  /**
   * Subscribe to visible range changes. Fires on navigation, view change, and scroll.
   * The payload includes the current view so sync engines can scope range queries.
   * Returns an unsubscribe function.
   */
  subscribeVisibleRangeChange: (
    listener: (payload: VisibleRangePayload) => void
  ) => () => void;

  /**
   * Subscribe to all event mutations (create, update, delete).
   * Each change includes a `source` field — remote sync engines should skip write-back
   * when `source === 'remote'`.
   * Returns an unsubscribe function.
   */
  subscribeEventChanges: (
    listener: (changes: EventChange[]) => void
  ) => () => void;

  // View management
  changeView: (view: CalendarViewType) => void;
  getCurrentView: () => CalendarView;
  getViewConfig: (viewType: CalendarViewType) => Record<string, unknown>;

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
  applyEventsChanges: (
    changes: {
      add?: Event[];
      update?: Array<{ id: string; updates: Partial<Event> }>;
      delete?: string[];
    },
    isPending?: boolean,
    source?: EventMutationSource
  ) => void;
  addEvent: (event: Event) => void;
  /** Add events from external sources (like subscriptions) without persisting to main DB */
  addExternalEvents: (calendarId: string, events: Event[]) => void;
  updateEvent: (
    id: string,
    event: Partial<Event>,
    isPending?: boolean,
    source?: EventMutationSource
  ) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEvents: () => Event[];
  getAllEvents: () => Event[];
  onEventClick: (event: Event) => void;
  onEventDoubleClick: (
    event: Event,
    e: MouseEvent
  ) => boolean | undefined | Promise<boolean | undefined>;
  onMoreEventsClick: (date: Date) => void;
  onEventDetailToggle: (eventId: string | null) => void;
  onMobileEventDetailToggle: (event: Event | null) => void;
  highlightEvent: (eventId: string | null) => void;
  selectEvent: (eventId: string | null) => void;
  getCalendars: () => CalendarType[];
  reorderCalendars: (fromIndex: number, toIndex: number) => void;
  setCalendarVisibility: (calendarId: string, visible: boolean) => void;
  setAllCalendarsVisibility: (visible: boolean) => void;
  updateCalendar: (
    id: string,
    updates: Partial<CalendarType>,
    isPending?: boolean
  ) => void;
  createCalendar: (calendar: CalendarType) => Promise<void>;
  deleteCalendar: (id: string) => Promise<void>;
  mergeCalendars: (sourceId: string, targetId: string) => Promise<void>;
  setVisibleMonth: (date: Date) => void;
  getVisibleMonth: () => Date;
  emitVisibleRange: (
    start: Date,
    end: Date,
    reason?: RangeChangeReason
  ) => void;

  // UI Signals
  dismissUI: () => void;

  // Plugin management
  getPlugin: <T = unknown>(name: string) => T | undefined;
  hasPlugin: (name: string) => boolean;
  getPluginConfig: (pluginName: string) => Record<string, unknown>;
  updatePluginConfig: (
    pluginName: string,
    config: Record<string, unknown>
  ) => void;

  // Calendar Header
  getCalendarHeaderConfig: () => boolean;

  // Trigger render callback (internal use, notify subscribers)
  triggerRender: () => void;

  // Get CalendarRegistry instance
  getCalendarRegistry: () => CalendarRegistry;

  // Get whether to use event detail dialog
  getUseEventDetailDialog: () => boolean;

  // Get whether to use event detail panel
  getUseEventDetailPanel: () => boolean;

  // Whether any event-detail UI (panel or dialog) is enabled. Behavior gates
  // (e.g. open-on-dblclick) should use this instead of the per-UI flags.
  getEventDetailEnabled: () => boolean;

  // Get which gesture opens the event detail panel/dialog on desktop.
  getEventDetailTrigger: () => 'click' | 'dblclick';

  // Update configuration dynamically
  updateConfig: (config: Partial<CalendarAppConfig>) => void;

  /** The resolved global display/edit timezone (IANA string). */
  readonly timeZone: string;

  // Overrides management
  setOverrides: (overrides: string[]) => void;

  // Theme management
  setTheme: (mode: ThemeMode) => void;
  getTheme: () => ThemeMode;
  subscribeThemeChange: (callback: (theme: ThemeMode) => void) => () => void;
  unsubscribeThemeChange: (callback: (theme: ThemeMode) => void) => void;
}

/**
 * useCalendarApp Hook return type
 * Calendar application interface provided for React components
 */
export interface UseCalendarAppReturn {
  app: ICalendarApp;
  currentView: CalendarViewType;
  currentDate: Date;
  events: Event[];
  applyEventsChanges: (
    changes: {
      add?: Event[];
      update?: Array<{ id: string; updates: Partial<Event> }>;
      delete?: string[];
    },
    isPending?: boolean,
    source?: EventMutationSource
  ) => void;
  changeView: (view: CalendarViewType) => void;
  setCurrentDate: (date: Date) => void;
  addEvent: (event: Event) => void;
  updateEvent: (
    id: string,
    event: Partial<Event>,
    isPending?: boolean,
    source?: EventMutationSource
  ) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  selectDate: (date: Date) => void;
  undo: () => void;
  getCalendars: () => CalendarType[];
  createCalendar: (calendar: CalendarType) => Promise<void>;
  mergeCalendars: (sourceId: string, targetId: string) => Promise<void>;
  setCalendarVisibility: (calendarId: string, visible: boolean) => void;
  setAllCalendarsVisibility: (visible: boolean) => void;
  getAllEvents: () => Event[];
  highlightEvent: (eventId: string | null) => void;
  setVisibleMonth: (date: Date) => void;
  getVisibleMonth: () => Date;
  emitVisibleRange: (
    start: Date,
    end: Date,
    reason?: RangeChangeReason
  ) => void;
  canMutateFromUI: (id?: string) => boolean;
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
    agenda: Record<string, unknown>;
  };
}

export interface UseCalendarReturn {
  // State
  view: CalendarViewType;
  currentDate: Date;
  events: Event[];
  currentWeekStart: Date;

  // Actions
  changeView: (view: CalendarViewType) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  selectDate: (date: Date) => void;
  updateEvent: (
    eventId: string,
    updates: Partial<Event>,
    isPending?: boolean
  ) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addEvent: (event: Omit<Event, 'id'>) => void;
  setEvents: (events: Event[] | ((prev: Event[]) => Event[])) => void;
}
