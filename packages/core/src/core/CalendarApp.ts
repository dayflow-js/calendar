import { Temporal } from 'temporal-polyfill';

import { Locale } from '@/locale/types';
import { isValidLocale } from '@/locale/utils';
import {
  CalendarAppConfig,
  CalendarAppState,
  CalendarCallbacks,
  CalendarType,
  CalendarView,
  CalendarViewType,
  Event,
  ICalendarApp,
  MobileEventRenderer,
  RangeChangeReason,
  ReadOnlyConfig,
  ViewType,
} from '@/types';
import { ThemeMode } from '@/types/calendarTypes';
import { compareViews } from '@/utils/calendarApp';
import { isDeepEqual } from '@/utils/helpers';
import { normalizeTimeZoneValue } from '@/utils/timeZoneUtils';

import {
  CalendarRegistry,
  setDefaultCalendarRegistry,
} from './calendarRegistry';
import { EventManager } from './events/EventManager';
import { NavigationController } from './navigation/NavigationController';
import {
  canMutateFromUI,
  getReadOnlyConfig,
} from './permissions/CalendarPermissions';
import { PluginManager } from './plugins/PluginManager';

export class CalendarApp implements ICalendarApp {
  public state: CalendarAppState;
  private callbacks: CalendarCallbacks;
  private calendarRegistry: CalendarRegistry;
  private themeChangeListeners: Set<(theme: ThemeMode) => void>;
  private listeners: Set<(app: ICalendarApp) => void>;
  private eventManager: EventManager;
  private navigation: NavigationController;
  private pluginManager: PluginManager;
  private useEventDetailDialog: boolean;
  private useCalendarHeader: boolean;
  private customMobileEventRenderer?: MobileEventRenderer;

  constructor(config: CalendarAppConfig) {
    const resolvedTimeZone =
      normalizeTimeZoneValue(config.timeZone) ??
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    const defaultCurrentDate = (() => {
      const d = Temporal.Now.plainDateISO(resolvedTimeZone);
      return new Date(d.year, d.month - 1, d.day);
    })();
    this.state = {
      currentView: config.defaultView || ViewType.WEEK,
      currentDate: config.initialDate || defaultCurrentDate,
      events: config.events || [],
      switcherMode: config.switcherMode || 'buttons',
      plugins: new Map(),
      views: new Map(),
      locale: CalendarApp.resolveLocale(config.locale),
      highlightedEventId: null,
      selectedEventId: null,
      readOnly: config.readOnly || false,
      overrides: [],
      allDaySortComparator: config.allDaySortComparator,
      timeZone: resolvedTimeZone,
    };

    this.callbacks = config.callbacks || {};
    this.themeChangeListeners = new Set();
    this.listeners = new Set();

    this.calendarRegistry = new CalendarRegistry(
      config.calendars,
      config.defaultCalendar,
      config.theme?.mode || 'light'
    );
    setDefaultCalendarRegistry(this.calendarRegistry);

    this.eventManager = new EventManager(
      this.state,
      this.calendarRegistry,
      () => this.callbacks,
      this.notify,
      this.triggerRender,
      config.events || []
    );

    this.navigation = new NavigationController(
      this.state,
      () => this.callbacks,
      this.notify,
      this.state.currentDate
    );

    this.pluginManager = new PluginManager(this.state, this.notify);

    this.useEventDetailDialog = config.useEventDetailDialog ?? false;
    this.useCalendarHeader = config.useCalendarHeader ?? true;
    this.customMobileEventRenderer = config.customMobileEventRenderer;

    config.views.forEach(view => this.state.views.set(view.type, view));
    config.plugins?.forEach(plugin => this.pluginManager.install(plugin, this));

    this.handleVisibleRangeChange('initial');
  }

  private static resolveLocale(locale?: string | Locale): string | Locale {
    if (!locale) return 'en-US';
    if (typeof locale === 'string') {
      return isValidLocale(locale) ? locale : 'en-US';
    }
    if (
      locale &&
      typeof locale === 'object' &&
      !isValidLocale((locale as Locale).code)
    ) {
      return { ...(locale as Locale), code: 'en-US' };
    }
    return locale;
  }

  // Subscription

  subscribe = (listener: (app: ICalendarApp) => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify = (): void => {
    this.listeners.forEach(listener => listener(this));
  };

  triggerRender = (): void => {
    this.callbacks.onRender?.();
    this.notify();
  };

  // Navigation (delegated)

  changeView = (view: CalendarViewType): void =>
    this.navigation.changeView(view);

  getCurrentView = (): CalendarView => this.navigation.getCurrentView();

  emitVisibleRange = (
    start: Date,
    end: Date,
    reason?: RangeChangeReason
  ): void => this.navigation.emitVisibleRange(start, end, reason);

  handleVisibleRangeChange = (reason: RangeChangeReason): void =>
    this.navigation.handleVisibleRangeChange(reason);

  setCurrentDate = (date: Date): void => this.navigation.setCurrentDate(date);

  getCurrentDate = (): Date => this.navigation.getCurrentDate();

  setVisibleMonth = (date: Date): void => this.navigation.setVisibleMonth(date);

  getVisibleMonth = (): Date => this.navigation.getVisibleMonth();

  goToToday = (): void => this.navigation.goToToday();
  goToPrevious = (): void => this.navigation.goToPrevious();
  goToNext = (): void => this.navigation.goToNext();

  selectDate = (date: Date): void => this.navigation.selectDate(date);

  // Events (delegated)

  undo = (): void => this.eventManager.undo();

  applyEventsChanges = (
    changes: {
      add?: Event[];
      update?: Array<{ id: string; updates: Partial<Event> }>;
      delete?: string[];
    },
    isPending?: boolean,
    source?: 'drag' | 'resize'
  ): void => this.eventManager.applyEventsChanges(changes, isPending, source);

  addEvent = (event: Event): void => this.eventManager.addEvent(event);

  addExternalEvents = (calendarId: string, events: Event[]): void =>
    this.eventManager.addExternalEvents(calendarId, events);

  updateEvent = (
    id: string,
    eventUpdate: Partial<Event>,
    isPending?: boolean,
    source?: 'drag' | 'resize'
  ): Promise<void> =>
    this.eventManager.updateEvent(id, eventUpdate, isPending, source);

  deleteEvent = (id: string): Promise<void> =>
    this.eventManager.deleteEvent(id);

  getAllEvents = (): Event[] => this.eventManager.getAllEvents();
  getEvents = (): Event[] => this.eventManager.getEvents();

  onEventClick = (event: Event): void => this.eventManager.onEventClick(event);

  onEventDoubleClick = (
    event: Event,
    e: MouseEvent
  ): boolean | undefined | Promise<boolean | undefined> =>
    this.eventManager.onEventDoubleClick(event, e);

  onMoreEventsClick = (date: Date): void =>
    this.eventManager.onMoreEventsClick(date);

  highlightEvent = (eventId: string | null): void =>
    this.eventManager.highlightEvent(eventId);

  selectEvent = (eventId: string | null): void =>
    this.eventManager.selectEvent(eventId);

  dismissUI = (): void => this.eventManager.dismissUI();

  // Permissions (pure functions)

  getReadOnlyConfig = (id?: string): ReadOnlyConfig =>
    getReadOnlyConfig(
      this.state.readOnly,
      id,
      this.calendarRegistry,
      this.state.events
    );

  canMutateFromUI = (id?: string): boolean =>
    canMutateFromUI(
      this.state.readOnly,
      id,
      this.calendarRegistry,
      this.state.events
    );

  // Calendars

  getCalendars = (): CalendarType[] => this.calendarRegistry.getAll();

  reorderCalendars = (fromIndex: number, toIndex: number): void => {
    this.calendarRegistry.reorder(fromIndex, toIndex);
    this.triggerRender();
  };

  setCalendarVisibility = (calendarId: string, visible: boolean): void => {
    this.calendarRegistry.setVisibility(calendarId, visible);
    this.triggerRender();
  };

  setAllCalendarsVisibility = (visible: boolean): void => {
    this.calendarRegistry.setAllVisibility(visible);
    this.triggerRender();
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
    this.triggerRender();
  };

  createCalendar = async (calendar: CalendarType): Promise<void> => {
    this.calendarRegistry.register(calendar);
    await this.callbacks.onCalendarCreate?.(calendar);
    this.triggerRender();
  };

  deleteCalendar = async (id: string): Promise<void> => {
    this.calendarRegistry.unregister(id);
    await this.callbacks.onCalendarDelete?.(id);
    this.triggerRender();
  };

  mergeCalendars = async (
    sourceId: string,
    targetId: string
  ): Promise<void> => {
    const store = this.eventManager.getStore();
    const sourceEvents = store
      .getAllEvents()
      .filter(e => e.calendarId === sourceId);

    this.eventManager.pushToUndo();
    store.beginTransaction();
    sourceEvents.forEach(event =>
      store.updateEvent(event.id, { calendarId: targetId })
    );
    await store.endTransaction();

    await this.deleteCalendar(sourceId);
    await this.callbacks.onCalendarMerge?.(sourceId, targetId);
    // onRender and notify are triggered by store batch-change listener
  };

  // Plugins (delegated)

  getPlugin = <T = unknown>(name: string): T | undefined =>
    this.pluginManager.getPlugin<T>(name);

  hasPlugin = (name: string): boolean => this.pluginManager.hasPlugin(name);

  getPluginConfig = (pluginName: string): Record<string, unknown> =>
    this.pluginManager.getPluginConfig(pluginName);

  updatePluginConfig = (
    pluginName: string,
    config: Record<string, unknown>
  ): void => this.pluginManager.updatePluginConfig(pluginName, config);

  // Theme

  setTheme = (mode: ThemeMode): void => {
    this.calendarRegistry.setTheme(mode);
    this.themeChangeListeners.forEach(listener => listener(mode));
    this.triggerRender();
  };

  getTheme = (): ThemeMode => this.calendarRegistry.getTheme();

  subscribeThemeChange = (
    callback: (theme: ThemeMode) => void
  ): (() => void) => {
    this.themeChangeListeners.add(callback);
    return () => this.unsubscribeThemeChange(callback);
  };

  unsubscribeThemeChange = (callback: (theme: ThemeMode) => void): void => {
    this.themeChangeListeners.delete(callback);
  };

  // ── Config ───────────────────────────────────────────────────────────────────

  getViewConfig = (viewType: CalendarViewType): Record<string, unknown> => {
    const view = this.state.views.get(viewType);
    return view?.config || {};
  };

  getCalendarRegistry = (): CalendarRegistry => this.calendarRegistry;
  getUseEventDetailDialog = (): boolean => this.useEventDetailDialog;
  getCustomMobileEventRenderer = (): MobileEventRenderer | undefined =>
    this.customMobileEventRenderer;
  getCalendarHeaderConfig = (): boolean => this.useCalendarHeader;

  get timeZone(): string {
    return this.state.timeZone;
  }

  setOverrides = (overrides: string[]): void => {
    this.state.overrides = overrides;
    this.triggerRender();
  };

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
    if (config.callbacks !== undefined) {
      this.callbacks = config.callbacks;
    }
    if (
      config.theme?.mode !== undefined &&
      config.theme.mode !== this.getTheme()
    ) {
      this.setTheme(config.theme.mode);
      // setTheme already triggers re-render
    }
    if (
      config.switcherMode !== undefined &&
      config.switcherMode !== this.state.switcherMode
    ) {
      this.state.switcherMode = config.switcherMode;
      hasChanged = true;
    }
    if (config.locale !== undefined) {
      const newLocale = CalendarApp.resolveLocale(config.locale);
      if (!isDeepEqual(newLocale, this.state.locale)) {
        this.state.locale = newLocale;
        hasChanged = true;
      }
    }
    if (
      config.allDaySortComparator !== undefined &&
      config.allDaySortComparator !== this.state.allDaySortComparator
    ) {
      this.state.allDaySortComparator = config.allDaySortComparator;
      hasChanged = true;
    }
    if (config.timeZone !== undefined) {
      const newTz =
        normalizeTimeZoneValue(config.timeZone) ??
        Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (newTz !== this.state.timeZone) {
        this.state.timeZone = newTz;
        hasChanged = true;
      }
    }
    if (config.views !== undefined) {
      const newViews = new Map(this.state.views);
      let viewsChanged = false;
      let viewsUpdated = false;
      config.views.forEach(view => {
        const existingView = newViews.get(view.type);
        const diff = compareViews(existingView, view);

        if (diff.hasChanges) {
          newViews.set(view.type, view);
          viewsUpdated = true;
        }

        viewsChanged = viewsChanged || diff.requiresRender;
      });

      if (viewsUpdated) {
        this.state.views = newViews;
      }

      if (viewsChanged) {
        hasChanged = true;
      }
    }

    if (config.calendars !== undefined) {
      let calendarsChanged = false;
      for (const cal of config.calendars) {
        const existing = this.calendarRegistry.get(cal.id);
        if (existing && existing.source !== cal.source) {
          this.calendarRegistry.updateCalendar(cal.id, { source: cal.source });
          calendarsChanged = true;
        }
      }
      if (calendarsChanged) hasChanged = true;
    }

    if (hasChanged) {
      this.triggerRender();
    }
  };
}
