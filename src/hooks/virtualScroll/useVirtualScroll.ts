import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  VirtualItem,
  UseVirtualScrollProps,
  UseVirtualScrollReturn,
} from '@/types';

// Virtual scroll configuration
export const VIRTUAL_SCROLL_CONFIG = {
  // Basic configuration
  OVERSCAN: 0, // Number of additional years to render before and after (0 for best performance)
  BUFFER_SIZE: 20, // Cache size (reduced for better performance)
  MIN_YEAR: 1970, // Minimum year
  MAX_YEAR: 2100, // Maximum year

  // Performance configuration
  SCROLL_THROTTLE: 8, // Scroll throttle for smooth scrolling (8ms = ~120fps)
  SCROLL_DEBOUNCE: 100, // Scroll end detection (reduced for faster response)
  CACHE_CLEANUP_THRESHOLD: 30, // Cache cleanup threshold

  // Responsive configuration - initial minimum height for year items
  // Actual height will be measured by ResizeObserver and adjusted automatically
  // These values are just initial estimates for the first render
  MOBILE_YEAR_HEIGHT: 1200, // Mobile: initial min height
  TABLET_YEAR_HEIGHT: 900, // Tablet: initial min height
  YEAR_HEIGHT: 700, // Desktop: initial min height
} as const;

// Performance monitoring class
export class VirtualScrollPerformance {
  private static metrics = {
    scrollEvents: 0,
    renderTime: [] as number[],
    cacheHits: 0,
    cacheMisses: 0,
    startTime: Date.now(),
    frameDrops: 0,
    avgScrollDelta: 0,
    totalScrollDistance: 0,
  };

  static trackScrollEvent(scrollDelta: number = 0) {
    this.metrics.scrollEvents++;
    this.metrics.totalScrollDistance += Math.abs(scrollDelta);
    this.metrics.avgScrollDelta =
      this.metrics.totalScrollDistance / this.metrics.scrollEvents;
  }

  static trackRenderTime(time: number) {
    this.metrics.renderTime.push(time);
    if (time > 16.67) {
      // Exceeds one frame time
      this.metrics.frameDrops++;
    }
    // Keep only the last 100 render times
    if (this.metrics.renderTime.length > 100) {
      this.metrics.renderTime.shift();
    }
  }

  static trackCacheHit() {
    this.metrics.cacheHits++;
  }

  static trackCacheMiss() {
    this.metrics.cacheMisses++;
  }

  static getMetrics() {
    const avgRenderTime =
      this.metrics.renderTime.length > 0
        ? this.metrics.renderTime.reduce((a, b) => a + b, 0) /
          this.metrics.renderTime.length
        : 0;

    const cacheHitRate =
      this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? (this.metrics.cacheHits /
            (this.metrics.cacheHits + this.metrics.cacheMisses)) *
          100
        : 0;

    const uptime = Date.now() - this.metrics.startTime;
    const fps = avgRenderTime > 0 ? 1000 / avgRenderTime : 0;

    return {
      scrollEvents: this.metrics.scrollEvents,
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      uptime: Math.round(uptime / 1000),
      scrollEventsPerSecond:
        Math.round((this.metrics.scrollEvents / (uptime / 1000)) * 100) / 100,
      estimatedFPS: Math.round(fps),
      frameDrops: this.metrics.frameDrops,
      avgScrollDelta: Math.round(this.metrics.avgScrollDelta * 100) / 100,
    };
  }

  static reset() {
    this.metrics = {
      scrollEvents: 0,
      renderTime: [],
      cacheHits: 0,
      cacheMisses: 0,
      startTime: Date.now(),
      frameDrops: 0,
      avgScrollDelta: 0,
      totalScrollDistance: 0,
    };
  }
}

// High-performance cache class
export class YearDataCache<T> {
  private cache = new Map<number, T>();
  private accessOrder: number[] = [];
  private maxSize: number;

  constructor(maxSize: number = VIRTUAL_SCROLL_CONFIG.BUFFER_SIZE) {
    this.maxSize = maxSize;
  }

  get(year: number): T | undefined {
    const data = this.cache.get(year);
    if (data) {
      VirtualScrollPerformance.trackCacheHit();
      this.updateAccessOrder(year);
      return data;
    }
    VirtualScrollPerformance.trackCacheMiss();
    return undefined;
  }

  set(year: number, data: T): void {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used item (LRU)
      const oldestYear = this.accessOrder.shift();
      if (oldestYear !== undefined) {
        this.cache.delete(oldestYear);
      }
    }

    this.cache.set(year, data);
    this.updateAccessOrder(year);
  }

  private updateAccessOrder(year: number): void {
    const index = this.accessOrder.indexOf(year);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(year);
  }

  getSize(): number {
    return this.cache.size;
  }

  getHitRate(): number {
    const metrics = VirtualScrollPerformance.getMetrics();
    return metrics.cacheHitRate;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

// Responsive configuration Hook
export const useResponsiveConfig = () => {
  const [config, setConfig] = useState<{
    yearHeight:
      | typeof VIRTUAL_SCROLL_CONFIG.YEAR_HEIGHT
      | typeof VIRTUAL_SCROLL_CONFIG.MOBILE_YEAR_HEIGHT
      | typeof VIRTUAL_SCROLL_CONFIG.TABLET_YEAR_HEIGHT;
    screenSize: 'mobile' | 'tablet' | 'desktop';
  }>({
    yearHeight: VIRTUAL_SCROLL_CONFIG.YEAR_HEIGHT,
    screenSize: 'desktop',
  });

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;
      if (width < 640) {
        // Only trigger mobile layout on very small screens (< 640px)
        setConfig({
          yearHeight: VIRTUAL_SCROLL_CONFIG.MOBILE_YEAR_HEIGHT,
          screenSize: 'mobile',
        });
      } else if (width < 900) {
        // Tablet layout for medium screens (640px - 900px)
        setConfig({
          yearHeight: VIRTUAL_SCROLL_CONFIG.TABLET_YEAR_HEIGHT,
          screenSize: 'tablet',
        });
      } else {
        // Desktop layout for larger screens (>= 900px)
        setConfig({
          yearHeight: VIRTUAL_SCROLL_CONFIG.YEAR_HEIGHT,
          screenSize: 'desktop',
        });
      }
    };

    updateConfig();
    window.addEventListener('resize', updateConfig);
    return () => window.removeEventListener('resize', updateConfig);
  }, []);

  return config;
};

// Virtual scroll main Hook
export const useVirtualScroll = ({
  currentDate,
  yearHeight,
  onCurrentYearChange,
}: UseVirtualScrollProps): UseVirtualScrollReturn => {
  // State management - start directly from correct position
  const initialYear = currentDate.getFullYear();
  const initialIndex = initialYear - VIRTUAL_SCROLL_CONFIG.MIN_YEAR;
  const initialScrollTop = initialIndex * yearHeight;

  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const [containerHeight, setContainerHeight] = useState(600);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [isScrolling, setIsScrolling] = useState(false);

  // References
  const scrollElementRef = useRef<HTMLDivElement>(
    document.createElement('div')
  );
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTime = useRef(0);
  const lastScrollTop = useRef(0);
  const previousYearHeightRef = useRef(yearHeight);
  useEffect(() => {
    if (previousYearHeightRef.current === yearHeight) return;
    previousYearHeightRef.current = yearHeight;

    const targetTop =
      (currentYear - VIRTUAL_SCROLL_CONFIG.MIN_YEAR) * yearHeight;

    setScrollTop(targetTop);
    lastScrollTop.current = targetTop;

    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = targetTop;
    }
  }, [yearHeight, currentYear]);

  // Virtual scroll calculation - optimize initial render
  const virtualData = useMemo(() => {
    const startTime = performance.now();

    const totalYears =
      VIRTUAL_SCROLL_CONFIG.MAX_YEAR - VIRTUAL_SCROLL_CONFIG.MIN_YEAR + 1;
    const totalHeight = totalYears * yearHeight;

    // Use current scrollTop, already at correct position initially
    const startIndex = Math.floor(scrollTop / yearHeight);
    const endIndex = Math.min(
      totalYears - 1,
      Math.ceil((scrollTop + containerHeight) / yearHeight)
    );

    const bufferStart = Math.max(
      0,
      startIndex - VIRTUAL_SCROLL_CONFIG.OVERSCAN
    );
    const bufferEnd = Math.min(
      totalYears - 1,
      endIndex + VIRTUAL_SCROLL_CONFIG.OVERSCAN
    );

    const visibleItems: VirtualItem[] = [];
    for (let i = bufferStart; i <= bufferEnd; i++) {
      visibleItems.push({
        index: i,
        year: VIRTUAL_SCROLL_CONFIG.MIN_YEAR + i,
        top: i * yearHeight,
        height: yearHeight,
      });
    }

    const renderTime = performance.now() - startTime;
    VirtualScrollPerformance.trackRenderTime(renderTime);

    return { totalHeight, visibleItems };
  }, [scrollTop, containerHeight, yearHeight]);

  // Scroll handling - remove initialization check
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const now = performance.now();
      if (now - lastScrollTime.current < VIRTUAL_SCROLL_CONFIG.SCROLL_THROTTLE)
        return;
      lastScrollTime.current = now;

      const element = e.currentTarget;
      const newScrollTop = element.scrollTop;
      const scrollDelta = Math.abs(newScrollTop - lastScrollTop.current);
      lastScrollTop.current = newScrollTop;

      VirtualScrollPerformance.trackScrollEvent(scrollDelta);

      requestAnimationFrame(() => {
        setScrollTop(newScrollTop);

        // Calculate year at the top of the viewport (for sticky header)
        const topPos = newScrollTop;
        const newYear = Math.floor(
          VIRTUAL_SCROLL_CONFIG.MIN_YEAR + topPos / yearHeight
        );

        if (
          newYear !== currentYear &&
          newYear >= VIRTUAL_SCROLL_CONFIG.MIN_YEAR &&
          newYear <= VIRTUAL_SCROLL_CONFIG.MAX_YEAR
        ) {
          setCurrentYear(newYear);
          onCurrentYearChange?.(newYear);
        }
      });

      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, VIRTUAL_SCROLL_CONFIG.SCROLL_DEBOUNCE);
    },
    [containerHeight, currentYear, yearHeight, onCurrentYearChange]
  );

  // Container size listener - remove complex initialization logic
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    // Immediately set correct scroll position
    element.scrollTop = initialScrollTop;
    lastScrollTop.current = initialScrollTop;

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [initialScrollTop]);

  // Scroll to specified year
  const scrollToYear = useCallback(
    (targetYear: number, smooth = true) => {
      if (!scrollElementRef.current) return;

      const targetIndex = targetYear - VIRTUAL_SCROLL_CONFIG.MIN_YEAR;
      const targetTop = targetIndex * yearHeight;

      scrollElementRef.current.scrollTo({
        top: Math.max(0, targetTop),
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [yearHeight]
  );

  // Navigation functions
  const handlePreviousYear = useCallback(() => {
    const target = Math.max(VIRTUAL_SCROLL_CONFIG.MIN_YEAR, currentYear - 1);
    setCurrentYear(target);
    scrollToYear(target);
  }, [currentYear, scrollToYear]);

  const handleNextYear = useCallback(() => {
    const target = Math.min(VIRTUAL_SCROLL_CONFIG.MAX_YEAR, currentYear + 1);
    setCurrentYear(target);
    scrollToYear(target);
  }, [currentYear, scrollToYear]);

  const handleToday = useCallback(() => {
    const todayYear = new Date().getFullYear();
    setCurrentYear(todayYear);
    scrollToYear(todayYear);
  }, [scrollToYear]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return {
    scrollTop,
    containerHeight,
    currentYear,
    isScrolling,
    virtualData,
    scrollElementRef,
    handleScroll,
    scrollToYear,
    handlePreviousYear,
    handleNextYear,
    handleToday,
    setScrollTop,
    setContainerHeight,
    setCurrentYear,
    setIsScrolling,
  };
};
