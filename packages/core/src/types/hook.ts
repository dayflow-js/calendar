// Hook-related type definitions

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

import { JSX, RefObject } from 'preact';

/**
 * Virtual scroll item interface (YearView)
 */
// ...
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
  scrollElementRef: RefObject<HTMLDivElement>;
  handleScroll: (
    e: JSX.TargetedEvent<HTMLDivElement, globalThis.Event>
  ) => void;
  scrollToYear: (targetYear: number, smooth?: boolean) => void;
  handlePreviousYear: () => void;
  handleNextYear: () => void;
  handleToday: () => void;
  setScrollTop: (val: number | ((prev: number) => number)) => void;
  setContainerHeight: (val: number | ((prev: number) => number)) => void;
  setCurrentYear: (val: number | ((prev: number) => number)) => void;
  setIsScrolling: (val: boolean | ((prev: boolean) => boolean)) => void;
}
