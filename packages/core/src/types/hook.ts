// Hook-related type definitions
import { StateUpdater } from 'preact/hooks';
import { RefObject } from 'preact';
import { Event } from './event';
import { EventLayout } from './layout';
import {
  UnifiedDragRef,
  MonthDragState,
  WeekDayDragState,
  useDragProps,
} from './dragIndicator';

/**
 * Virtual scroll item interface (YearView)
 */
export interface VirtualItem {
  index: number;
  year: number;
  top: number;
  height: number;
}

/**
 * Virtual scroll Hook parameters interface (YearView)
 */
export interface UseVirtualScrollProps {
  currentDate: Date;
  yearHeight: number;
  onCurrentYearChange?: (year: number) => void;
}

/**
 * Virtual scroll Hook return value interface (YearView)
 */
export interface UseVirtualScrollReturn {
  scrollTop: number;
  containerHeight: number;
  currentYear: number;
  isScrolling: boolean;
  virtualData: {
    totalHeight: number;
    visibleItems: VirtualItem[];
  };
  scrollElementRef: any;
  handleScroll: (e: any) => void;
  scrollToYear: (targetYear: number, smooth?: boolean) => void;
  handlePreviousYear: () => void;
  handleNextYear: () => void;
  handleToday: () => void;
  setScrollTop: (val: number | ((prev: number) => number)) => void;
  setContainerHeight: (val: number | ((prev: number) => number)) => void;
  setCurrentYear: (val: number | ((prev: number) => number)) => void;
  setIsScrolling: (val: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * Drag state Hook return value
 */
export interface UseDragStateReturn {
  // Refs
  dragRef: RefObject<UnifiedDragRef>;
  currentDragRef: RefObject<{ x: number; y: number }>;

  // State
  dragState: MonthDragState | WeekDayDragState;
  setDragState: (val: MonthDragState | WeekDayDragState | ((prev: MonthDragState | WeekDayDragState) => MonthDragState | WeekDayDragState)) => void;

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
  handleCreateStart: (e: any | any, ...args: (Date | number)[]) => void;
  handleMoveStart: (e: any | any, event: Event) => void;
  handleResizeStart: (
    e: any | any,
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
