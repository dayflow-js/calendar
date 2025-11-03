import React from 'react';
import {
  CalendarApp as ICalendarApp,
  CalendarAppConfig,
  CalendarAppState,
  CalendarPlugin,
  CalendarView,
  ViewType,
  CalendarCallbacks,
  SidebarConfig,
  CalendarType,
} from '@/types';
import { Event } from '@/types';
import {
  CalendarRegistry,
  setDefaultCalendarRegistry,
} from './calendarRegistry';
import { logger } from '@/utils/logger';

const DEFAULT_SIDEBAR_WIDTH = '240px';

const normalizeSidebarWidth = (width?: number | string): string => {
  if (typeof width === 'number') {
    return `${width}px`;
  }
  if (typeof width === 'string' && width.trim().length > 0) {
    return width;
  }
  return DEFAULT_SIDEBAR_WIDTH;
};

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

  const { enabled = true, width, initialCollapsed = false, render } = input;

  return {
    enabled,
    width: normalizeSidebarWidth(width),
    initialCollapsed,
    render,
  };
};

export class CalendarApp implements ICalendarApp {
  public state: CalendarAppState;
  private callbacks: CalendarCallbacks;
  private calendarRegistry: CalendarRegistry;
  private sidebarConfig: SidebarConfig;
  private visibleMonth: Date;
  private useEventDetailDialog: boolean;

  constructor(config: CalendarAppConfig) {
    // Initialize state
    this.state = {
      currentView: config.defaultView || ViewType.WEEK,
      currentDate: config.initialDate || new Date(),
      events: config.events || [],
      switcherMode: config.switcherMode || 'buttons',
      plugins: new Map(),
      views: new Map(),
    };

    this.callbacks = config.callbacks || {};

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

    // Register views
    config.views.forEach(view => {
      this.state.views.set(view.type, view);
    });

    // Install plugins
    config.plugins?.forEach(plugin => {
      this.installPlugin(plugin);
    });
  }

  // View management
  changeView = (view: ViewType): void => {
    if (!this.state.views.has(view)) {
      throw new Error(`View ${view} is not registered`);
    }

    this.state.currentView = view;
    this.callbacks.onViewChange?.(view);
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
  };

  getCurrentDate = (): Date => {
    return new Date(this.state.currentDate);
  };

  setVisibleMonth = (date: Date): void => {
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );
    if (
      this.visibleMonth.getFullYear() === next.getFullYear() &&
      this.visibleMonth.getMonth() === next.getMonth()
    ) {
      return;
    }
    this.visibleMonth = next;
    this.callbacks.onVisibleMonthChange?.(new Date(this.visibleMonth));
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
    }
    this.setCurrentDate(newDate);
  };

  // Date selection method
  selectDate = (date: Date): void => {
    this.setCurrentDate(date);
    this.callbacks.onDateChange?.(new Date(date));
  };

  // Event management
  addEvent = (event: Event): void => {
    this.state.events = [...this.state.events, event];
    this.callbacks.onEventCreate?.(event);
  };

  updateEvent = (
    id: string,
    eventUpdate: Partial<Event>,
    isPending?: boolean
  ): void => {
    const eventIndex = this.state.events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
      throw new Error(`Event with id ${id} not found`);
    }

    const updatedEvent = { ...this.state.events[eventIndex], ...eventUpdate };
    this.state.events = [
      ...this.state.events.slice(0, eventIndex),
      updatedEvent,
      ...this.state.events.slice(eventIndex + 1),
    ];
    // When resizing the events do not callbacks
    if (isPending) return;
    this.callbacks.onEventUpdate?.(updatedEvent);
  };

  deleteEvent = (id: string): void => {
    const eventIndex = this.state.events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
      throw new Error(`Event with id ${id} not found`);
    }

    this.state.events = [
      ...this.state.events.slice(0, eventIndex),
      ...this.state.events.slice(eventIndex + 1),
    ];

    this.callbacks.onEventDelete?.(id);
  };

  getAllEvents = (): Event[] => {
    return [...this.state.events];
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

  setCalendarVisibility = (calendarId: string, visible: boolean): void => {
    this.calendarRegistry.setVisibility(calendarId, visible);
    this.callbacks.onRender?.();
  };

  setAllCalendarsVisibility = (visible: boolean): void => {
    this.calendarRegistry.setAllVisibility(visible);
    this.callbacks.onRender?.();
  };

  getSidebarConfig = (): SidebarConfig => {
    return this.sidebarConfig;
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

  // Render method - temporarily returns empty element, to be implemented later
  render = (): React.ReactElement => {
    return React.createElement(
      'div',
      { className: 'calendar-app' },
      'Calendar App'
    );
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
  };

  // Get CalendarRegistry instance
  getCalendarRegistry = (): CalendarRegistry => {
    return this.calendarRegistry;
  };

  // Get whether to use event detail dialog
  getUseEventDetailDialog = (): boolean => {
    return this.useEventDetailDialog;
  };
}
