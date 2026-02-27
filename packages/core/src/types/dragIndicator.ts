import { RefObject, ComponentChildren } from 'preact';

// Drag-related type definitions
import { DragConfig, ICalendarApp, ViewType } from '@/types';

import { Event } from './event';
import { EventLayout } from './layout';

/**
 * Drag mode type
 */
export type Mode = 'create' | 'move' | 'resize' | null;

/**
 * Drag reference interface
 * Stores state information for drag operations
 */
export interface DragRef {
  active: boolean;
  mode: Mode;
  eventId: string | null;
  dayIndex: number;
  startX: number;
  startY: number;
  startHour: number;
  endHour: number;
  originalDay: number;
  originalStartHour: number;
  originalEndHour: number;
  resizeDirection: string | null;
  hourOffset: number | null;
  duration: number;
  lastRawMouseHour: number | null;
  lastUpdateTime: number;
  initialMouseY: number;
  lastClientY: number;
  allDay: boolean;
  eventDate?: Date;
}

/**
 * Event detail position interface
 * Used to position event detail popup
 */
export interface EventDetailPosition {
  top: number;
  left: number;
  eventHeight: number;
  eventMiddleY: number;
  isSunday?: boolean;
}

export interface DragIndicatorProps {
  drag: DragRef;
  color?: string;
  title?: string;
  layout?: EventLayout | null;
  allDay: boolean;
  formatTime: (hour: number) => string;
  getLineColor: (color: string) => string;
  getDynamicPadding: (drag: DragRef) => string;
  locale?: string;
  isMobile?: boolean;
}

export interface DragIndicatorRenderer {
  renderAllDayContent: (props: DragIndicatorProps) => ComponentChildren;
  renderRegularContent: (props: DragIndicatorProps) => ComponentChildren;
  renderDefaultContent: (props: DragIndicatorProps) => ComponentChildren;
}

export interface UnifiedDragRef extends DragRef {
  // Month view specific properties
  targetDate?: Date | null;
  originalDate?: Date | null;
  originalEvent?: Event | null;
  dragOffset?: number;
  originalStartDate?: Date | null;
  originalEndDate?: Date | null;
  eventDate?: Date;
  originalStartTime?: { hour: number; minute: number; second: number } | null;
  originalEndTime?: { hour: number; minute: number; second: number } | null;
  sourceElement?: HTMLElement | null;
  indicatorVisible?: boolean;
  // Week/Day view all-day event cross-day property
  eventDurationDays?: number;
  // Number of days the current segment occupies (for cross-week MultiDayEvent)
  currentSegmentDays?: number;
  // dayIndex when dragging starts (for cross-day event fragment dragging)
  startDragDayIndex?: number;
  // Event properties needed for deferred indicator creation
  calendarId?: string;
  title?: string;
}

export interface useDragProps extends Partial<DragConfig> {
  calendarRef: RefObject<HTMLDivElement>;
  allDayRowRef?: RefObject<HTMLDivElement>; // Required for Week/Day views
  timeGridRef?: RefObject<HTMLDivElement>; // Optional, used for translated grid layouts
  viewType: ViewType;
  onEventsUpdate: (
    updateFunc: (events: Event[]) => Event[],
    isResizing?: boolean
  ) => void;
  onEventCreate: (event: Event) => void;
  onEventEdit?: (event: Event) => void; // Required for Month view
  calculateNewEventLayout?: (
    dayIndex: number,
    startHour: number,
    endHour: number
  ) => EventLayout | null; // Required for Week/Day views
  calculateDragLayout?: (
    event: Event,
    targetDay: number,
    targetStartHour: number,
    targetEndHour: number
  ) => EventLayout | null; // Required for Week/Day views
  currentWeekStart: Date;
  events: Event[];
  renderer?: DragIndicatorRenderer; // Required for Week/Day views
  app?: ICalendarApp;
  isMobile?: boolean;
  gridWidth?: string;
  displayDays?: number;
}

// Unified drag state type definitions
export type MonthDragState = {
  active: boolean;
  mode: 'create' | 'move' | 'resize' | null;
  eventId: string | null;
  targetDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
};

export type WeekDayDragState = {
  active: boolean;
  mode: 'create' | 'move' | 'resize' | null;
  eventId: string | null;
  dayIndex: number;
  startHour: number;
  endHour: number;
  allDay: boolean;
};

// Unified return value interface
export interface useDragReturn {
  // Common methods
  createDragIndicator: (
    drag: UnifiedDragRef,
    color?: string,
    title?: string,
    layout?: EventLayout | null,
    sourceElement?: HTMLElement
  ) => void;
  updateDragIndicator: (
    ...args: (number | boolean | EventLayout | null | undefined)[]
  ) => void;
  removeDragIndicator: () => void;
  handleCreateAllDayEvent?: (
    e: MouseEvent | TouchEvent,
    dayIndex: number
  ) => void; // Week/Day views
  handleCreateStart: (
    e: MouseEvent | TouchEvent,
    ...args: (Date | number)[]
  ) => void;
  handleMoveStart: (e: MouseEvent | TouchEvent, event: Event) => void;
  handleResizeStart: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  dragState: MonthDragState | WeekDayDragState;
  isDragging: boolean;
  // Week/Day view specific
  pixelYToHour?: (y: number) => number;
  getColumnDayIndex?: (x: number) => number;
}

/**
 * Month view event drag state (alias for MonthDragState, maintains backward compatibility)
 */
export type MonthEventDragState = MonthDragState;

/**
 * Drag state Hook return value
 */
export interface UseDragStateReturn {
  // Refs
  dragRef: RefObject<UnifiedDragRef>;
  currentDragRef: RefObject<{ x: number; y: number }>;

  // State
  dragState: MonthDragState | WeekDayDragState;
  setDragState: (
    val:
      | MonthDragState
      | WeekDayDragState
      | ((
          prev: MonthDragState | WeekDayDragState
        ) => MonthDragState | WeekDayDragState)
  ) => void;

  // Methods
  resetDragState: () => void;
  throttledSetEvents: (
    updateFunc: (events: Event[]) => Event[],
    dragState?: string
  ) => void;
}

/**
 * Drag common utilities Hook return value
 */
export interface UseDragCommonReturn {
  // Week/Day view utilities
  pixelYToHour: (y: number) => number;
  getColumnDayIndex: (x: number) => number;
  checkIfInAllDayArea: (clientY: number) => boolean;
  handleDirectScroll: (clientY: number) => void;

  // Month view utilities
  daysDifference: (date1: Date, date2: Date) => number;
  addDaysToDate: (date: Date, days: number) => Date;
  getTargetDateFromPosition: (clientX: number, clientY: number) => Date | null;

  // Constants
  ONE_DAY_MS: number;
}

/**
 * Drag management Hook return value
 */
export interface UseDragManagerReturn {
  dragIndicatorRef: RefObject<HTMLDivElement | null>;
  removeDragIndicator: () => void;
  createDragIndicator: (
    drag: UnifiedDragRef,
    color?: string,
    title?: string,
    layout?: EventLayout | null,
    sourceElement?: HTMLElement
  ) => void;
  updateDragIndicator: (
    ...args: (number | boolean | EventLayout | null | undefined)[]
  ) => void;
}

/**
 * Drag handler Hook return value
 */
export interface UseDragHandlersReturn {
  handleDragMove: (e: MouseEvent | TouchEvent) => void;
  handleDragEnd: (e: MouseEvent | TouchEvent) => void;
  handleCreateStart: (
    e: MouseEvent | TouchEvent,
    ...args: (Date | number)[]
  ) => void;
  handleMoveStart: (e: MouseEvent | TouchEvent, event: Event) => void;
  handleResizeStart: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  handleUniversalDragMove: (e: MouseEvent | TouchEvent) => void;
  handleUniversalDragEnd: (e?: MouseEvent | TouchEvent) => void;
}

/**
 * Drag handler Hook parameters
 */
export interface UseDragHandlersParams {
  options: useDragProps;
  common: UseDragCommonReturn;
  state: UseDragStateReturn;
  manager: UseDragManagerReturn;
}

export interface UseMonthDragReturn {
  // Month view specific utilities
  daysDifference: (date1: Date, date2: Date) => number;
  addDaysToDate: (date: Date, days: number) => Date;
  getTargetDateFromPosition: (clientX: number, clientY: number) => Date | null;
}

export interface UseMonthDragParams {
  options: useDragProps;
  common: UseDragCommonReturn;
  state: UseDragStateReturn;
  manager: UseDragManagerReturn;
}

export interface UseWeekDayDragReturn {
  handleCreateAllDayEvent: (
    e: MouseEvent | TouchEvent,
    dayIndex: number
  ) => void;
  pixelYToHour: (y: number) => number;
  getColumnDayIndex: (x: number) => number;
}

export interface UseWeekDayDragParams {
  options: useDragProps;
  common: UseDragCommonReturn;
  state: UseDragStateReturn;
  manager: UseDragManagerReturn;
  handleDragMove: (e: MouseEvent) => void;
  handleDragEnd: (e: MouseEvent) => void;
}
