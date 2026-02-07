/* eslint-disable @typescript-eslint/no-explicit-any */
// View factory type definitions
import React from 'react';
import { CalendarView, ViewType, CalendarApp } from './core';
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
export interface BaseViewProps {
  // Core application instance
  app: CalendarApp;

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
  config?: Record<string, any>;
  
  // Selection control
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string | null) => void;
  detailPanelEventId?: string | null;
  onDetailPanelToggle?: (eventId: string | null) => void;

  // Customization
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  calendarRef: React.RefObject<HTMLDivElement>;
  switcherMode?: ViewSwitcherMode;
  meta?: Record<string, any>;
}

/**
 * Day view specific Props
 */
export interface DayViewProps extends BaseViewProps {
  // Day view specific properties
  showMiniCalendar?: boolean;
  showAllDay?: boolean;
  scrollToCurrentTime?: boolean;
}

/**
 * Week view specific Props
 */
export interface WeekViewProps extends BaseViewProps {
  // Week view specific properties
  showWeekends?: boolean;
  showAllDay?: boolean;
  startOfWeek?: number;
  scrollToCurrentTime?: boolean;
}

/**
 * Month view specific Props
 */
export interface MonthViewProps extends BaseViewProps {
  // Month view specific properties
  showOtherMonth?: boolean;
  weekHeight?: number;
  showWeekNumbers?: boolean;
  enableVirtualScroll?: boolean;
}

/**
 * View factory configuration interface
 * Base configuration for creating views
 */
export interface ViewFactoryConfig {
  // Base configuration
  enableDrag?: boolean;
  enableResize?: boolean;
  enableCreate?: boolean;

  // Plugin configuration
  dragConfig?: Record<string, any>;
  eventsConfig?: Record<string, any>;
  virtualScrollConfig?: Record<string, any>;

  // View-specific configuration
  viewConfig?: Record<string, any>;
}

/**
 * Day view factory configuration
 */
export interface DayViewConfig extends ViewFactoryConfig {
  showMiniCalendar?: boolean;
  showAllDay?: boolean;
  scrollToCurrentTime?: boolean;
  hourHeight?: number;
  firstHour?: number;
  lastHour?: number;
}

/**
 * Week view factory configuration
 */
export interface WeekViewConfig extends ViewFactoryConfig {
  showWeekends?: boolean;
  showAllDay?: boolean;
  startOfWeek?: number;
  scrollToCurrentTime?: boolean;
  hourHeight?: number;
  firstHour?: number;
  lastHour?: number;
}

/**
 * Month view factory configuration
 */
export interface MonthViewConfig extends ViewFactoryConfig {
  showOtherMonth?: boolean;
  weekHeight?: number;
  showWeekNumbers?: boolean;
  enableVirtualScroll?: boolean;
  initialWeeksToLoad?: number;
}

/**
 * Year view factory configuration
 */
export interface YearViewConfig extends ViewFactoryConfig {
  enableVirtualScroll?: boolean;
  showDebugInfo?: boolean;
  mode?: 'year-canvas' | 'fixed-week';
  showTimedEventsInYearView?: boolean;
}

/**
 * View adapter Props
 * Adapter properties for wrapping original components
 */
export interface ViewAdapterProps extends BaseViewProps {
  viewType: ViewType;
  originalComponent: React.ComponentType<any>;
  config: ViewFactoryConfig;
  className?: string;
}

/**
 * Drag integration Props
 * Properties for integrating drag functionality into views
 */
export interface DragIntegrationProps {
  app: CalendarApp;
  viewType: ViewType;
  calendarRef: React.RefObject<HTMLDivElement>;
  allDayRowRef?: React.RefObject<HTMLDivElement>;
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
  app: CalendarApp;
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