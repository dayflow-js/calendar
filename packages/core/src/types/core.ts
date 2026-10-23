// oxlint-disable typescript/no-explicit-any
// Core type definitions
import { AnyComponent, ComponentChildren } from 'preact';
import { Temporal } from 'temporal-polyfill';

import { CalendarSystem } from '@/calendar/calendarSystem';
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
  GANTT = 'gantt',
}

export type CalendarViewType = ViewType | string;

/** A non-event range rendered behind events in a Day/Week time grid. */
export type TimeGridBackgroundRange = {
  id: string;
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  title?: string;
  ariaLabel?: string;
  editable?: boolean;
  selected?: boolean;
  invalid?: boolean;
  /** Visual treatment for the range. `bar` keeps only a narrow leading marker. */
  variant?: 'block' | 'bar';
  /** Split a block into appointment-sized visual segments. */
  segmentMinutes?: number;
  /** Per-segment availability. `false` renders a released, non-interactive gap. */
  segmentAvailability?: boolean[];
  /** Optional hover/focus card, primarily used by compact bar ranges. */
  hoverCard?: {
    title: string;
    detail: string;
  };
  /** Optional range fill, useful for compact bars associated with a calendar. */
  backgroundColor?: string;
  className?: string;
  meta?: Record<string, unknown>;
};

export type TimeGridBackgroundContext = {
  app: ICalendarApp;
  rangeStart: Temporal.PlainDate;
  rangeEnd: Temporal.PlainDate;
  timeZone: string;
};

/** Stable geometry and date context for plugin-owned Day/Week grid layers. */
export type TimeGridLayerContext = {
  app: ICalendarApp;
  view: ViewType.DAY | ViewType.WEEK;
  /** Exact visible column dates, in display order. */
  visibleDates: readonly Temporal.PlainDate[];
  timeZone: string;
  firstHour: number;
  /** Exclusive end hour. */
  lastHour: number;
  hourHeight: number;
};

export type TimeGridBackgroundChangeReason =
  | 'create'
  | 'move'
  | 'resize-start'
  | 'resize-end'
  | 'keyboard-move'
  | 'keyboard-resize-start'
  | 'keyboard-resize-end';

/**
 * Generic plugin capability for rendering and editing background time ranges.
 * Ranges stay outside EventManager and are always rendered below calendar events.
 */
export type TimeGridBackgroundSource = {
  id: string;
  editable?: boolean;
  snapMinutes?: number;
  defaultCreateDurationMinutes?: number;
  getRanges: (context: TimeGridBackgroundContext) => TimeGridBackgroundRange[];
  onRangeSelect?: (range: TimeGridBackgroundRange) => void;
  onRangeOpen?: (range: TimeGridBackgroundRange) => void;
  onRangeCreate?: (
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime
  ) => void;
  onRangeChange?: (
    range: TimeGridBackgroundRange,
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime,
    reason: TimeGridBackgroundChangeReason
  ) => void;
  onRangeDelete?: (range: TimeGridBackgroundRange) => void;
};

/** Context passed to plugin content rendered above the quick-create form. */
export interface QuickCreatePopupContext {
  app: ICalendarApp;
  close: () => void;
  focusInput: () => void;
  translate: (key: string, fallback: string) => string;
}

/**
 * Plugin interface
 * Defines the basic structure of calendar plugins
 */
export interface CalendarPlugin {
  name: string;
  /**
   * May return a cleanup function. It runs on `app.destroy()` and should undo
   * anything `install` attached outside the app (global listeners, timers).
   * A plugin that returns one must tolerate `install` running again on the
   * same app: adapters re-arm it via `app.restore()`.
   */
  // oxlint-disable-next-line typescript/no-invalid-void-type
  install: (app: ICalendarApp) => void | (() => void);
  updateConfig?: (config: Record<string, unknown>) => void;
  config?: any;
  api?: unknown;
  /** Optional Week/Day time-grid background capability. */
  timeGridBackground?: TimeGridBackgroundSource;
  /**
   * Plugin-owned layer rendered inside the Day/Week time grid, below events.
   * It runs in Core's internal Preact tree, independently of the host adapter.
   */
  renderTimeGridLayer?: (context: TimeGridLayerContext) => ComponentChildren;
  /** Optional plugin-owned content rendered above the quick-create form. */
  renderQuickCreateTopContent?: (
    context: QuickCreatePopupContext
  ) => ComponentChildren;
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
  onEventClick?: (event: Event, e?: MouseEvent) => void | Promise<void>;
  onEventDoubleClick?: (
    event: Event,
    e: MouseEvent
  ) => boolean | undefined | Promise<boolean | undefined>;
  onMoreEventsClick?: (date: Date, e?: MouseEvent) => void | Promise<void>;
  onDismissUI?: (
    e?: MouseEvent | TouchEvent | KeyboardEvent | Event
  ) => void | Promise<void>;
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
  triggerEvent?: MouseEvent | TouchEvent;
}

/** Args passed to the gridContextMenu slot renderer. */
export interface GridContextMenuSlotArgs {
  date: Date;
  viewType?: ViewType;
  onClose: () => void;
  triggerEvent?: MouseEvent | TouchEvent;
}

/** Args passed to the gridPopupContent slot renderer (Year view grid mode). */
export interface GridPopupContentSlotArgs {
  date: Date;
  events: Event[];
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
export type EventDetailTrigger = 'click' | 'dbClick';

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
  /** Enable task creation/type switching in the built-in editors. Defaults to false.
   * Existing task data remains visible and editable when disabled. */
  enableTasks?: boolean;
  /**
   * Gesture that opens the event detail panel/dialog on desktop.
   * - 'dbClick' (default): single-click selects, double-click opens (Mac Calendar style).
   * - 'click': single-click opens (Google Calendar style).
   * Touch input is unaffected — a single tap always opens.
   */
  eventDetailTrigger?: EventDetailTrigger;
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
  /**
   * Global time format for all views and features ('12h' or '24h').
   * When set, takes highest priority and overrides view-level or search-level format configs.
   */
  timeFormat?: '12h' | '24h';
  /** Calendar used for display and calendar navigation. Event instants remain ISO/Gregorian. */
  calendarSystem?: CalendarSystem;
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
  /** Global time format override ('12h' or '24h'). */
  timeFormat?: '12h' | '24h';
  calendarSystem: CalendarSystem;
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
  onEventClick: (event: Event, e?: MouseEvent) => void;
  onEventDoubleClick: (
    event: Event,
    e: MouseEvent
  ) => boolean | undefined | Promise<boolean | undefined>;
  onMoreEventsClick: (date: Date, e?: MouseEvent) => void;
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

  /**
   * Run every plugin's cleanup. Call it when the app is no longer needed;
   * `useCalendarApp` in the framework adapters does so on unmount.
   */
  destroy: () => void;
  /** Re-install the plugins `destroy()` tore down. No-op otherwise. */
  restore: () => void;

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
  getTasksEnabled: () => boolean;

  // Whether any event-detail UI (panel or dialog) is enabled. Behavior gates
  // (e.g. open-on-double-click) should use this instead of the per-UI flags.
  getEventDetailEnabled: () => boolean;

  // Get which gesture opens the event detail panel/dialog on desktop.
  getEventDetailTrigger: () => EventDetailTrigger;

  // Update configuration dynamically
  updateConfig: (config: Partial<CalendarAppConfig>) => void;

  /** The resolved global display/edit timezone (IANA string). */
  readonly timeZone: string;

  // Overrides management
  setOverrides: (overrides: string[]) => void;

  // Theme management
  setTheme: (mode: ThemeMode) => void;
  getTheme: () => ThemeMode;
  getThemeColors: () => ThemeConfig['colors'];
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
