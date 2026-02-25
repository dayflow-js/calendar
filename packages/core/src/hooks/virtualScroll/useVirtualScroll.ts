import { JSX } from 'preact';
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'preact/hooks';

import {
  UseVirtualScrollProps,
  UseVirtualScrollReturn,
  VirtualItem,
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

// Performance monitoring
let metrics = {
  scrollEvents: 0,
  renderTime: [] as number[],
  cacheHits: 0,
  cacheMisses: 0,
  startTime: Date.now(),
  frameDrops: 0,
  avgScrollDelta: 0,
  totalScrollDistance: 0,
};

export const trackScrollEvent = (scrollDelta: number = 0) => {
  metrics.scrollEvents++;
  metrics.totalScrollDistance += Math.abs(scrollDelta);
  metrics.avgScrollDelta = metrics.totalScrollDistance / metrics.scrollEvents;
};

export const trackRenderTime = (time: number) => {
  metrics.renderTime.push(time);
  if (time > 16.67) {
    // Exceeds one frame time
    metrics.frameDrops++;
  }
  // Keep only the last 100 render times
  if (metrics.renderTime.length > 100) {
    metrics.renderTime.shift();
  }
};

export const trackCacheHit = () => {
  metrics.cacheHits++;
};

export const trackCacheMiss = () => {
  metrics.cacheMisses++;
};

export const getMetrics = () => {
  const avgRenderTime =
    metrics.renderTime.length > 0
      ? metrics.renderTime.reduce((a, b) => a + b, 0) /
        metrics.renderTime.length
      : 0;

  const cacheHitRate =
    metrics.cacheHits + metrics.cacheMisses > 0
      ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
      : 0;

  const uptime = Date.now() - metrics.startTime;
  const fps = avgRenderTime > 0 ? 1000 / avgRenderTime : 0;

  return {
    scrollEvents: metrics.scrollEvents,
    avgRenderTime: Math.round(avgRenderTime * 100) / 100,
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    uptime: Math.round(uptime / 1000),
    scrollEventsPerSecond:
      Math.round((metrics.scrollEvents / (uptime / 1000)) * 100) / 100,
    estimatedFPS: Math.round(fps),
    frameDrops: metrics.frameDrops,
    avgScrollDelta: Math.round(metrics.avgScrollDelta * 100) / 100,
  };
};

export const resetMetrics = () => {
  metrics = {
    scrollEvents: 0,
    renderTime: [],
    cacheHits: 0,
    cacheMisses: 0,
    startTime: Date.now(),
    frameDrops: 0,
    avgScrollDelta: 0,
    totalScrollDistance: 0,
  };
};

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
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    trackRenderTime(renderTime);

    return { totalHeight, visibleItems };
  }, [scrollTop, containerHeight, yearHeight]);

  // Scroll handling - remove initialization check
  const handleScroll = useCallback(
    (e: JSX.TargetedEvent<HTMLDivElement, globalThis.Event>) => {
      const now = performance.now();
      if (now - lastScrollTime.current < VIRTUAL_SCROLL_CONFIG.SCROLL_THROTTLE)
        return;
      lastScrollTime.current = now;

      const element = e.currentTarget;
      const newScrollTop = element.scrollTop;
      const scrollDelta = Math.abs(newScrollTop - lastScrollTop.current);
      lastScrollTop.current = newScrollTop;

      trackScrollEvent(scrollDelta);

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
  useEffect(
    () => () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    },
    []
  );

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
