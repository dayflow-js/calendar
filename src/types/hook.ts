// Hook-related type definitions
import React from 'react';
import { Root } from 'react-dom/client';
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
  scrollElementRef: React.RefObject<HTMLDivElement>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollToYear: (targetYear: number, smooth?: boolean) => void;
  handlePreviousYear: () => void;
  handleNextYear: () => void;
  handleToday: () => void;
  setScrollTop: React.Dispatch<React.SetStateAction<number>>;
  setContainerHeight: React.Dispatch<React.SetStateAction<number>>;
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>;
  setIsScrolling: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Drag state Hook return value
 */
export interface UseDragStateReturn {
  // Refs
  dragRef: React.RefObject<UnifiedDragRef>;
  currentDragRef: React.RefObject<{ x: number; y: number }>;

  // State
  dragState: MonthDragState | WeekDayDragState;
  setDragState: React.Dispatch<
    React.SetStateAction<MonthDragState | WeekDayDragState>
  >;

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
  dragIndicatorRef: React.RefObject<HTMLDivElement | null>;
  reactRootRef: React.RefObject<Root | null>;
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
  handleDragMove: (e: MouseEvent) => void;
  handleDragEnd: (e: MouseEvent) => void;
  handleCreateStart: (e: React.MouseEvent, ...args: (Date | number)[]) => void;
  handleMoveStart: (e: React.MouseEvent, event: Event) => void;
  handleResizeStart: (
    e: React.MouseEvent,
    event: Event,
    direction: string
  ) => void;
  handleUniversalDragMove: (e: MouseEvent) => void;
  handleUniversalDragEnd: () => void;
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
