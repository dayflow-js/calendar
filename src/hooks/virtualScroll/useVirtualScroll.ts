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
  OVERSCAN: 2, // Number of additional years to render before and after
  BUFFER_SIZE: 50, // Cache size
  MIN_YEAR: 1900, // Minimum year
  MAX_YEAR: 2200, // Maximum year

  // Performance configuration
  SCROLL_THROTTLE: 8, // Scroll throttle (120fps)
  SCROLL_DEBOUNCE: 150, // Scroll end detection
  CACHE_CLEANUP_THRESHOLD: 100, // Cache cleanup threshold

  // Responsive configuration - adjust year height to fit new layout
  MOBILE_YEAR_HEIGHT: 1400, // Mobile year height (2 columns 6 rows need more space)
  TABLET_YEAR_HEIGHT: 1000, // Tablet year height (3 columns 4 rows)
  YEAR_HEIGHT: 900, // Desktop year height (4 columns 3 rows, more compact)
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
      if (width < 768) {
        setConfig({
          yearHeight: VIRTUAL_SCROLL_CONFIG.MOBILE_YEAR_HEIGHT, // 1400px for 2x6 layout
          screenSize: 'mobile',
        });
      } else if (width < 1024) {
        setConfig({
          yearHeight: VIRTUAL_SCROLL_CONFIG.TABLET_YEAR_HEIGHT, // 1100px for 3x4 layout
          screenSize: 'tablet',
        });
      } else {
        setConfig({
          yearHeight: VIRTUAL_SCROLL_CONFIG.YEAR_HEIGHT, // 700px for 4x3 layout
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

        const centerPos = newScrollTop + containerHeight / 2;
        const newYear = Math.round(
          VIRTUAL_SCROLL_CONFIG.MIN_YEAR + centerPos / yearHeight
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
      const targetTop =
        targetIndex * yearHeight - containerHeight / 2 + yearHeight / 2;

      scrollElementRef.current.scrollTo({
        top: Math.max(0, targetTop),
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [yearHeight, containerHeight]
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
