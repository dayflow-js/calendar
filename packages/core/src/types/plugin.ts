import { DragConfig } from './config';
import { ViewType } from './core';
import { MonthDragState, WeekDayDragState } from './dragIndicator';
// Plugin-related type definitions
import { Event } from './event';
import { EventLayout } from './layout';

/**
 * Events service interface
 * Provides various event management functions
 */
export interface EventsService {
  // Basic event operations
  getAll: () => Event[];
  getById: (id: string) => Event | undefined;
  add: (event: Event) => void;
  update: (id: string, updates: Partial<Event>) => Event;
  delete: (id: string) => void;

  // Event queries
  getByDate: (date: Date) => Event[];
  getByDateRange: (startDate: Date, endDate: Date) => Event[];
  getByDay: (dayIndex: number, weekStart: Date) => Event[];
  getAllDayEvents: (dayIndex: number, events: Event[]) => Event[];

  // Event calculation and recalculation
  recalculateEventDays: (events: Event[], weekStart: Date) => Event[];

  // Event validation
  validateEvent: (event: Partial<Event>) => string[];

  // Event filtering
  filterEvents: (events: Event[], filter: (event: Event) => boolean) => Event[];
}

/**
 * Events plugin configuration
 */
export interface EventsPluginConfig {
  enableAutoRecalculate?: boolean;
  enableValidation?: boolean;
  defaultEvents?: Event[];
  maxEventsPerDay?: number;
}

/**
 * Drag Hook options
 */
export interface DragHookOptions extends Partial<DragConfig> {
  calendarRef: unknown;
  allDayRowRef?: unknown;
  viewType: ViewType;
  onEventsUpdate: (
    updateFunc: (events: Event[]) => Event[],
    isResizing?: boolean
  ) => void;
  onEventCreate: (event: Event) => void;
  onEventEdit: (event: Event) => void;
  currentWeekStart: Date;
  events: Event[];
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
  isMobile?: boolean;
}

/**
 * Drag Hook return value
 */
export interface DragHookReturn {
  handleMoveStart?: (e: unknown, event: Event) => void;
  handleCreateStart?: (e: unknown, ...args: (Date | number)[]) => void;
  handleResizeStart?: (e: unknown, event: Event, direction: string) => void;
  handleCreateAllDayEvent?: (e: unknown, dayIndex: number) => void;
  dragState: MonthDragState | WeekDayDragState;
  isDragging: boolean;
}

/**
 * Drag plugin configuration
 */
export interface DragPluginConfig {
  // Feature toggles
  enableDrag: boolean;
  enableResize: boolean;
  enableCreate: boolean;
  enableAllDayCreate: boolean;

  // View support
  supportedViews: ViewType[];

  // Allow additional properties
  [key: string]: unknown;
}

/**
 * Drag service interface
 * Provides drag capability for views
 */
export interface DragService {
  // Get drag configuration
  getConfig: () => DragPluginConfig;
  updateConfig: (updates: Partial<DragPluginConfig>) => void;

  // Check if view supports dragging
  isViewSupported: (viewType: ViewType) => boolean;
}
