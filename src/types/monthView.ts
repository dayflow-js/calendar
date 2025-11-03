import { WeeksData } from '.';

export interface UseVirtualMonthScrollProps {
  currentDate: Date;
  weekHeight: number;
  onCurrentMonthChange?: (month: string, year: number) => void;
  initialWeeksToLoad?: number;
}

// Hook return value interface
export interface UseVirtualMonthScrollReturn {
  scrollTop: number;
  containerHeight: number;
  currentMonth: string;
  currentYear: number;
  isScrolling: boolean;
  virtualData: {
    totalHeight: number;
    visibleItems: VirtualWeekItem[];
    displayStartIndex: number; // Index of the first week that should actually be displayed
  };
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollToDate: (targetDate: Date, smooth?: boolean) => void;
  handlePreviousMonth: () => void;
  handleNextMonth: () => void;
  handleToday: () => void;
  setScrollTop: React.Dispatch<React.SetStateAction<number>>;
  setContainerHeight: React.Dispatch<React.SetStateAction<number>>;
  setCurrentMonth: React.Dispatch<React.SetStateAction<string>>;
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>;
  setIsScrolling: React.Dispatch<React.SetStateAction<boolean>>;
  cache: WeekDataCache;
  scrollElementRefCallback: (element: HTMLDivElement | null) => void;
  weeksData: WeeksData[];
}

// Virtual scroll configuration
export const VIRTUAL_MONTH_SCROLL_CONFIG = {
  OVERSCAN: 6,
  BUFFER_SIZE: 100,
  MIN_YEAR: 1900,
  MAX_YEAR: 2200,
  SCROLL_THROTTLE: 8,
  SCROLL_DEBOUNCE: 150,
  CACHE_CLEANUP_THRESHOLD: 200,
  MOBILE_WEEK_HEIGHT: 80,
  TABLET_WEEK_HEIGHT: 90,
  WEEK_HEIGHT: 119,
} as const;

// Virtual scroll item interface
export interface VirtualWeekItem {
  index: number;
  weekData: WeeksData;
  top: number;
  height: number;
}

// High-performance week data cache class
export class WeekDataCache {
  private cache = new Map<string, WeeksData>();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = VIRTUAL_MONTH_SCROLL_CONFIG.BUFFER_SIZE) {
    this.maxSize = maxSize;
  }

  private getKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  get(weekStartDate: Date): WeeksData | undefined {
    const key = this.getKey(weekStartDate);
    const data = this.cache.get(key);
    if (data) {
      this.updateAccessOrder(key);
      return data;
    }
    return undefined;
  }

  set(weekStartDate: Date, data: WeeksData): void {
    const key = this.getKey(weekStartDate);

    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, data);
    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  getSize(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}
