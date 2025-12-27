// Drag-related type definitions
import { DragConfig, CalendarApp } from '../types';
import { EventLayout } from './layout';
import { Event } from './event';
import {
  UseDragCommonReturn,
  UseDragManagerReturn,
  UseDragStateReturn,
} from './hook';

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
}

export interface DragIndicatorRenderer {
  renderAllDayContent: (props: DragIndicatorProps) => React.ReactNode;
  renderRegularContent: (props: DragIndicatorProps) => React.ReactNode;
  renderDefaultContent: (props: DragIndicatorProps) => React.ReactNode;
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
}

export interface useDragProps extends Partial<DragConfig> {
  calendarRef: React.RefObject<HTMLDivElement | null>;
  allDayRowRef?: React.RefObject<HTMLDivElement | null>; // Required for Week/Day views
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
  app?: CalendarApp;
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
  handleCreateAllDayEvent?: (e: React.MouseEvent, dayIndex: number) => void; // Week/Day views
  handleCreateStart: (e: React.MouseEvent, ...args: (Date | number)[]) => void;
  handleMoveStart: (e: React.MouseEvent, event: Event) => void;
  handleResizeStart: (
    e: React.MouseEvent,
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
  handleCreateAllDayEvent: (e: React.MouseEvent, dayIndex: number) => void;
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
