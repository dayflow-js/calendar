import { useState, useEffect } from 'preact/hooks';

export interface ResponsiveResult {
  isMobile: boolean;
}

/**
 * Tracks viewport width and returns whether the current breakpoint is mobile
 * (≤768 px).  Subscribes to window resize to stay current.
 */
export function useResponsive(): ResponsiveResult {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return { isMobile };
}
