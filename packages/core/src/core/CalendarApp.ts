import {
  ICalendarApp,
  CalendarAppConfig,
  CalendarAppState,
  CalendarPlugin,
  CalendarView,
  ViewType,
  CalendarCallbacks,
  SidebarConfig,
  CalendarType,
  MobileEventRenderer,
  ReadOnlyConfig,
  TNode,
} from '../types';
import { Event } from '../types';
import {
  CalendarRegistry,
  setDefaultCalendarRegistry,
} from './calendarRegistry';
import { logger } from '../utils/logger';
import { normalizeCssWidth } from '../utils/styleUtils';
import { ThemeMode } from '../types/calendarTypes';
import { isValidLocale } from '../locale/utils';
import { isDeepEqual } from '../utils/helpers';

const DEFAULT_SIDEBAR_WIDTH = '240px';

const resolveSidebarConfig = (
  input?: boolean | SidebarConfig
): SidebarConfig => {
  if (!input) {
    return {
      enabled: false,
      width: DEFAULT_SIDEBAR_WIDTH,
      initialCollapsed: false,
    };
  }

  if (input === true) {
    return {
      enabled: true,
      width: DEFAULT_SIDEBAR_WIDTH,
      initialCollapsed: false,
    };
  }

  const {
    enabled = true,
    width,
    initialCollapsed = false,
    render,
    createCalendarMode,
    renderCalendarContextMenu,
    renderCreateCalendarDialog,
    colorPickerMode,
  } = input;

  return {
    enabled,
    width: normalizeCssWidth(width, DEFAULT_SIDEBAR_WIDTH),
    initialCollapsed,
    render,
    createCalendarMode,
    renderCalendarContextMenu,
    renderCreateCalendarDialog,
    colorPickerMode,
  };
};

export class CalendarApp implements ICalendarApp {
  public state: CalendarAppState;
  private callbacks: CalendarCallbacks;
  private calendarRegistry: CalendarRegistry;
  private sidebarConfig: SidebarConfig;
  private visibleMonth: Date;
  private useEventDetailDialog: boolean;
  private useCalendarHeader: boolean | ((props: any) => TNode);
  private customMobileEventRenderer?: MobileEventRenderer;
  private themeChangeListeners: Set<(theme: ThemeMode) => void>;
  private listeners: Set<(app: ICalendarApp) => void>;
  private undoStack: Array<{ type: string; data: any }> = [];
  private pendingSnapshot: Event[] | null = null;
  private readonly MAX_UNDO_STACK = 50;

  constructor(config: CalendarAppConfig) {
    // Initialize state
    this.state = {
      currentView: config.defaultView || ViewType.WEEK,
      currentDate: config.initialDate || new Date(),
      events: config.events || [],
      switcherMode: config.switcherMode || 'buttons',
      plugins: new Map(),
      views: new Map(),
      locale: this.resolveLocale(config.locale),
      highlightedEventId: null,
      selectedEventId: null,
      readOnly: config.readOnly || false,
    };

    this.callbacks = config.callbacks || {};
    this.themeChangeListeners = new Set();
    this.listeners = new Set();

    // Initialize CalendarRegistry
    this.calendarRegistry = new CalendarRegistry(
      config.calendars,
      config.defaultCalendar,
      config.theme?.mode || 'light'
    );

    setDefaultCalendarRegistry(this.calendarRegistry);

    this.sidebarConfig = resolveSidebarConfig(config.useSidebar);
    this.state.sidebar = this.sidebarConfig;
    const current = this.state.currentDate;
    this.visibleMonth = new Date(current.getFullYear(), current.getMonth(), 1);
    this.useEventDetailDialog = config.useEventDetailDialog ?? false;
    this.useCalendarHeader = config.useCalendarHeader ?? true;
    this.customMobileEventRenderer = config.customMobileEventRenderer;

    // Register views
    config.views.forEach(view => {
      this.state.views.set(view.type, view);
    });

    // Install plugins
    config.plugins?.forEach(plugin => {
      this.installPlugin(plugin);
    });
  }

  private resolveLocale(locale?: string | any): string | any {
    if (!locale) {
      return 'en-US';
    }

    if (typeof locale === 'string') {
      return isValidLocale(locale) ? locale : 'en-US';
    }

    if (locale && typeof locale === 'object' && !isValidLocale(locale.code)) {
      return { ...locale, code: 'en-US' };
    }

    return locale;
  }

  // Subscription management
  subscribe = (listener: (app: ICalendarApp) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify = (): void => {
    this.listeners.forEach(listener => listener(this));
  };

  private pushToUndo = (eventsSnapshot?: Event[]): void => {
    // Store a snapshot of events array (shallow copy)
    this.undoStack.push({
      type: 'events_snapshot',
      data: eventsSnapshot || [...this.state.events],
    });

    if (this.undoStack.length > this.MAX_UNDO_STACK) {
      this.undoStack.shift();
    }
  };

  public undo = (): void => {
    if (this.undoStack.length === 0) return;

    const lastState = this.undoStack.pop();
    if (lastState?.type === 'events_snapshot') {
      this.state.events = lastState.data;
      this.triggerRender();
      this.notify();
    }
  };

  getReadOnlyConfig = (): ReadOnlyConfig => {
    const ro = this.state.readOnly;
    if (ro === true) {
      return { draggable: false, viewable: false };
    }
    if (ro === false) {
      return { draggable: true, viewable: true };
    }
    return {
      draggable: ro.draggable ?? false,
      viewable: ro.viewable ?? false,
    };
  };

  /**
   * Helper to check if the calendar is in any form of read-only mode.
   * If readOnly config is present, it's considered non-editable.
   */
  private isInternalEditable = (): boolean => {
    if (this.state.readOnly === true) return false;
    if (typeof this.state.readOnly === 'object') return false;
    return true;
  };

  // View management
  changeView = (view: ViewType): void => {
    if (!this.state.views.has(view)) {
      throw new Error(`View ${view} is not registered`);
    }

    this.state.currentView = view;
    this.state.highlightedEventId = null;
    this.callbacks.onViewChange?.(view);
    this.notify();
  };

  getCurrentView = (): CalendarView => {
    const view = this.state.views.get(this.state.currentView);
    if (!view) {
      throw new Error(
        `Current view ${this.state.currentView} is not registered`
      );
    }
    return view;
  };

  // Date management
  setCurrentDate = (date: Date): void => {
    this.state.currentDate = new Date(date);
    this.callbacks.onDateChange?.(this.state.currentDate);
    this.setVisibleMonth(this.state.currentDate);
    this.notify();
  };

  getCurrentDate = (): Date => {
    return new Date(this.state.currentDate);
  };

  setVisibleMonth = (date: Date): void => {
    const next = new Date(date.getFullYear(), date.getMonth(), 1);
    if (
      this.visibleMonth.getFullYear() === next.getFullYear() &&
      this.visibleMonth.getMonth() === next.getMonth()
    ) {
      return;
    }
    this.visibleMonth = next;
    this.callbacks.onVisibleMonthChange?.(new Date(this.visibleMonth));
    this.notify();
  };

  getVisibleMonth = (): Date => {
    return new Date(this.visibleMonth);
  };

  goToToday = (): void => {
    this.setCurrentDate(new Date());
  };

  goToPrevious = (): void => {
    const newDate = new Date(this.state.currentDate);
    switch (this.state.currentView) {
      case ViewType.DAY:
        newDate.setDate(newDate.getDate() - 1);
        break;
      case ViewType.WEEK:
        newDate.setDate(newDate.getDate() - 7);
        break;
      case ViewType.MONTH:
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case ViewType.YEAR:
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    this.setCurrentDate(newDate);
  };

  goToNext = (): void => {
    const newDate = new Date(this.state.currentDate);
    switch (this.state.currentView) {
      case ViewType.DAY:
        newDate.setDate(newDate.getDate() + 1);
        break;
      case ViewType.WEEK:
        newDate.setDate(newDate.getDate() + 7);
        break;
      case ViewType.MONTH:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case ViewType.YEAR:
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    this.setCurrentDate(newDate);
  };

  // Date selection method
  selectDate = (date: Date): void => {
    this.setCurrentDate(date);
    this.callbacks.onDateChange?.(new Date(date));
  };

  // Event management

  public applyEventsChanges = (
    changes: {
      add?: Event[];
      update?: Array<{ id: string; updates: Partial<Event> }>;
      delete?: string[];
    },
    isPending?: boolean
  ): void => {
    if (!this.isInternalEditable() && !isPending) return;

    if (isPending) {
      // Starting or continuing a multi-step operation (drag/resize)
      // Only capture the INITIAL state before the first change
      if (!this.pendingSnapshot) {
        this.pendingSnapshot = [...this.state.events];
      }
    } else {
      // Finalizing an operation
      if (this.pendingSnapshot) {
        // We have a snapshot from the start of the interaction
        this.pushToUndo(this.pendingSnapshot);
        this.pendingSnapshot = null;
      } else {
        // Single step operation (like delete or paste)
        this.pushToUndo();
      }
    }

    let newEvents = [...this.state.events];

    // 1. Delete
    if (changes.delete) {
      const deleteIds = new Set(changes.delete);
      newEvents = newEvents.filter(e => !deleteIds.has(e.id));
    }

    // 2. Update
    if (changes.update) {
      changes.update.forEach(({ id, updates }) => {
        const index = newEvents.findIndex(e => e.id === id);
        if (index !== -1) {
          newEvents[index] = { ...newEvents[index], ...updates };
        }
      });
    }

    // 3. Add
    if (changes.add) {
      newEvents = [...newEvents, ...changes.add];
    }

    this.state.events = newEvents;

    if (!isPending) {
      // Trigger individual callbacks if needed, though usually used for batch
      if (changes.add)
        changes.add.forEach(e => this.callbacks.onEventCreate?.(e));
      if (changes.delete)
        changes.delete.forEach(id => this.callbacks.onEventDelete?.(id));
      if (changes.update && this.callbacks.onEventUpdate) {
        changes.update.forEach(({ id }) => {
          const updated = this.state.events.find(e => e.id === id);
          if (updated) this.callbacks.onEventUpdate?.(updated);
        });
      }
    }

    this.notify();
  };

  addEvent = (event: Event): void => {
    if (!this.isInternalEditable()) {
      logger.warn('Cannot add event in read-only mode');
      return;
    }

    this.pendingSnapshot = null; // New operation, clear any pending
    this.pushToUndo();

    this.state.events = [...this.state.events, event];

    this.callbacks.onEventCreate?.(event);
    this.notify();
  };

  updateEvent = (
    id: string,
    eventUpdate: Partial<Event>,
    isPending?: boolean
  ): void => {
    if (!this.isInternalEditable() && !isPending) {
      logger.warn('Cannot update event in read-only mode');
      return;
    }

    if (!this.isInternalEditable()) {
      return;
    }

    const eventIndex = this.state.events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
      throw new Error(`Event with id ${id} not found`);
    }

    // Save state before update
    if (isPending) {
      if (!this.pendingSnapshot) {
        this.pendingSnapshot = [...this.state.events];
      }
    } else {
      if (this.pendingSnapshot) {
        this.pushToUndo(this.pendingSnapshot);
        this.pendingSnapshot = null;
      } else {
        this.pushToUndo();
      }
    }

    const updatedEvent = { ...this.state.events[eventIndex], ...eventUpdate };
    this.state.events = [
      ...this.state.events.slice(0, eventIndex),
      updatedEvent,
      ...this.state.events.slice(eventIndex + 1),
    ];
    // When resizing the events do not callbacks
    if (isPending) {
      this.notify();
      return;
    }

    this.callbacks.onEventUpdate?.(updatedEvent);
    this.notify();
  };

  deleteEvent = (id: string): void => {
    if (!this.isInternalEditable()) {
      logger.warn('Cannot delete event in read-only mode');
      return;
    }

    const eventIndex = this.state.events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
      throw new Error(`Event with id ${id} not found`);
    }

    this.pendingSnapshot = null;
    this.pushToUndo();

    this.state.events = [
      ...this.state.events.slice(0, eventIndex),
      ...this.state.events.slice(eventIndex + 1),
    ];

    this.callbacks.onEventDelete?.(id);
    this.notify();
  };

  getAllEvents = (): Event[] => {
    return [...this.state.events];
  };

  onEventClick = (event: Event): void => {
    this.callbacks.onEventClick?.(event);
  };

  onMoreEventsClick = (date: Date): void => {
    this.callbacks.onMoreEventsClick?.(date);
  };

  highlightEvent = (eventId: string | null): void => {
    if (this.state.highlightedEventId === eventId) return;
    this.state.highlightedEventId = eventId;
    this.callbacks.onRender?.();
    this.notify();
  };

  selectEvent = (eventId: string | null): void => {
    if (this.state.selectedEventId === eventId) return;
    this.state.selectedEventId = eventId;
    this.callbacks.onRender?.();
    this.notify();
  };

  dismissUI = (): void => {
    this.callbacks.onDismissUI?.();
    // Also notify listeners so components can react to UI dismiss signal if they prefer
    this.notify();
  };

  getEvents = (): Event[] => {
    const allEvents = this.getAllEvents();
    const visibleCalendars = new Set(
      this.calendarRegistry
        .getAll()
        .filter(calendar => calendar.isVisible !== false)
        .map(calendar => calendar.id)
    );

    return allEvents.filter(event => {
      if (!event.calendarId) {
        return true;
      }

      if (!this.calendarRegistry.has(event.calendarId)) {
        return true;
      }

      return visibleCalendars.has(event.calendarId);
    });
  };

  getCalendars = (): CalendarType[] => {
    return this.calendarRegistry.getAll();
  };

  reorderCalendars = (fromIndex: number, toIndex: number): void => {
    this.calendarRegistry.reorder(fromIndex, toIndex);
    this.callbacks.onRender?.();
    this.notify();
  };

  setCalendarVisibility = (calendarId: string, visible: boolean): void => {
    this.calendarRegistry.setVisibility(calendarId, visible);
    this.callbacks.onRender?.();
    this.notify();
  };

  setAllCalendarsVisibility = (visible: boolean): void => {
    this.calendarRegistry.setAllVisibility(visible);
    this.callbacks.onRender?.();
    this.notify();
  };

  updateCalendar = (
    id: string,
    updates: Partial<CalendarType>,
    isPending?: boolean
  ): void => {
    this.calendarRegistry.updateCalendar(id, updates);
    if (isPending) {
      this.notify();
      return;
    }
    const updatedCalendar = this.calendarRegistry.get(id);
    if (updatedCalendar) {
      this.callbacks.onCalendarUpdate?.(updatedCalendar);
    }
    this.callbacks.onRender?.();
    this.notify();
  };

  createCalendar = (calendar: CalendarType): void => {
    this.calendarRegistry.register(calendar);
    this.callbacks.onCalendarCreate?.(calendar);
    this.callbacks.onRender?.();
    this.notify();
  };

  deleteCalendar = (id: string): void => {
    this.calendarRegistry.unregister(id);
    this.callbacks.onCalendarDelete?.(id);
    this.callbacks.onRender?.();
    this.notify();
  };

  mergeCalendars = (sourceId: string, targetId: string): void => {
    const sourceEvents = this.state.events.filter(
      e => e.calendarId === sourceId
    );

    // Update all events from source calendar to target calendar
    sourceEvents.forEach(event => {
      this.updateEvent(event.id, { calendarId: targetId });
    });

    // Delete source calendar
    this.deleteCalendar(sourceId);

    // Call callback
    this.callbacks.onCalendarMerge?.(sourceId, targetId);
    this.callbacks.onRender?.();
    this.notify();
  };

  getSidebarConfig = (): SidebarConfig => {
    return this.sidebarConfig;
  };

  getCalendarHeaderConfig = (): boolean | ((props: any) => TNode) => {
    return this.useCalendarHeader;
  };

  // Plugin management
  private installPlugin = (plugin: CalendarPlugin): void => {
    if (this.state.plugins.has(plugin.name)) {
      logger.warn(`Plugin ${plugin.name} is already installed`);
      return;
    }

    this.state.plugins.set(plugin.name, plugin);
    plugin.install(this);
  };

  getPlugin = <T = unknown>(name: string): T | undefined => {
    const plugin = this.state.plugins.get(name);
    return plugin?.api as T;
  };

  hasPlugin = (name: string): boolean => {
    return this.state.plugins.has(name);
  };

  // Get plugin configuration
  getPluginConfig = (pluginName: string): Record<string, unknown> => {
    const plugin = this.state.plugins.get(pluginName);
    return plugin?.config || {};
  };

  // Update plugin configuration
  updatePluginConfig = (
    pluginName: string,
    config: Record<string, unknown>
  ): void => {
    const plugin = this.state.plugins.get(pluginName);
    if (plugin) {
      plugin.config = { ...plugin.config, ...config };
      this.notify();
    }
  };

  // Get view configuration
  getViewConfig = (viewType: ViewType): Record<string, unknown> => {
    const view = this.state.views.get(viewType);
    return view?.config || {};
  };

  // Trigger render callback
  triggerRender = (): void => {
    this.callbacks.onRender?.();
    this.notify();
  };

  // Get CalendarRegistry instance
  getCalendarRegistry = (): CalendarRegistry => {
    return this.calendarRegistry;
  };

  // Get whether to use event detail dialog
  getUseEventDetailDialog = (): boolean => {
    return this.useEventDetailDialog;
  };

  // Get custom mobile event renderer
  getCustomMobileEventRenderer = (): MobileEventRenderer | undefined => {
    return this.customMobileEventRenderer;
  };

  // Update configuration dynamically
  updateConfig = (config: Partial<CalendarAppConfig>): void => {
    let hasChanged = false;

    if (
      config.customMobileEventRenderer !== undefined &&
      config.customMobileEventRenderer !== this.customMobileEventRenderer
    ) {
      this.customMobileEventRenderer = config.customMobileEventRenderer;
      hasChanged = true;
    }
    if (
      config.useEventDetailDialog !== undefined &&
      config.useEventDetailDialog !== this.useEventDetailDialog
    ) {
      this.useEventDetailDialog = config.useEventDetailDialog;
      hasChanged = true;
    }
    if (
      config.useCalendarHeader !== undefined &&
      config.useCalendarHeader !== this.useCalendarHeader
    ) {
      this.useCalendarHeader = config.useCalendarHeader;
      hasChanged = true;
    }
    if (
      config.readOnly !== undefined &&
      !isDeepEqual(config.readOnly, this.state.readOnly)
    ) {
      this.state.readOnly = config.readOnly;
      hasChanged = true;
    }
    if (config.callbacks) {
      // We update callbacks but don't trigger re-render as they don't affect visual state
      this.callbacks = { ...this.callbacks, ...config.callbacks };
    }
    if (
      config.theme?.mode !== undefined &&
      config.theme.mode !== this.getTheme()
    ) {
      this.setTheme(config.theme.mode);
      // setTheme already triggers re-render via onRender callback
    }
    if (config.useSidebar !== undefined) {
      const newSidebarConfig = resolveSidebarConfig(config.useSidebar);
      if (!isDeepEqual(newSidebarConfig, this.sidebarConfig)) {
        this.sidebarConfig = newSidebarConfig;
        this.state.sidebar = this.sidebarConfig;
        hasChanged = true;
      }
    }
    if (
      config.switcherMode !== undefined &&
      config.switcherMode !== this.state.switcherMode
    ) {
      this.state.switcherMode = config.switcherMode;
      hasChanged = true;
    }
    if (config.locale !== undefined) {
      const newLocale = this.resolveLocale(config.locale);
      if (!isDeepEqual(newLocale, this.state.locale)) {
        this.state.locale = newLocale;
        hasChanged = true;
      }
    }

    if (hasChanged) {
      // Trigger re-render to reflect changes
      this.triggerRender();
      this.notify();
    }
  };

  // Theme management
  /**
   * Set theme mode
   * @param mode - Theme mode ('light', 'dark', or 'auto')
   */
  setTheme = (mode: ThemeMode): void => {
    this.calendarRegistry.setTheme(mode);

    // Notify all listeners
    this.themeChangeListeners.forEach(listener => {
      listener(mode);
    });

    // Trigger re-render
    this.callbacks.onRender?.();
    this.notify();
  };

  /**
   * Get current theme mode
   * @returns Current theme mode
   */
  getTheme = (): ThemeMode => {
    return this.calendarRegistry.getTheme();
  };

  /**
   * Subscribe to theme changes
   * @param callback - Function to call when theme changes
   * @returns Unsubscribe function
   */
  subscribeThemeChange = (
    callback: (theme: ThemeMode) => void
  ): (() => void) => {
    this.themeChangeListeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.unsubscribeThemeChange(callback);
    };
  };

  /**
   * Unsubscribe from theme changes
   * @param callback - Function to remove from listeners
   */
  unsubscribeThemeChange = (callback: (theme: ThemeMode) => void): void => {
    this.themeChangeListeners.delete(callback);
  };
}
