import { JSX, RefObject } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { ICalendarApp } from '@/types';

interface UseWeekViewSwipeParams {
  app: ICalendarApp;
  columnsPerPage: number;
  currentDate: Date;
  displayDays: number;
  isSlidingView: boolean;
  scrollerRef: RefObject<HTMLDivElement>;
  swipeContentRef: RefObject<HTMLDivElement>;
  topFrozenContentRef: RefObject<HTMLDivElement>;
}

export const useWeekViewSwipe = ({
  app,
  columnsPerPage,
  currentDate,
  displayDays,
  isSlidingView,
  scrollerRef,
  swipeContentRef,
  topFrozenContentRef,
}: UseWeekViewSwipeParams) => {
  const [mobilePageStart, setMobilePageStart] = useState<Date>(() => {
    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isHorizontalSwipe = useRef(false);
  const liveSwipeOffsetRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSlidingView) return;

    setMobilePageStart(prev => {
      const target = new Date(currentDate);
      target.setHours(0, 0, 0, 0);

      const windowStart = new Date(prev);
      const windowEnd = new Date(prev);
      windowEnd.setDate(windowEnd.getDate() + columnsPerPage - 1);

      if (target >= windowStart && target <= windowEnd) {
        return prev;
      }

      return target;
    });
  }, [columnsPerPage, currentDate, isSlidingView]);

  const handleScroll = useCallback(
    (e: JSX.TargetedEvent<HTMLDivElement, globalThis.Event>) => {
      const { scrollLeft } = e.currentTarget;
      if (!topFrozenContentRef.current) return;

      const baseTranslateX = isSlidingView ? 'calc(-100% / 3)' : '0px';
      const horizontalOffset = isSlidingView
        ? `${swipeOffset}px`
        : `-${scrollLeft}px`;

      topFrozenContentRef.current.style.transform = `translateX(calc(${baseTranslateX} + ${horizontalOffset}))`;
      topFrozenContentRef.current.style.transition =
        isSlidingView && isTransitioning ? 'transform 0.3s ease-out' : 'none';
    },
    [isSlidingView, isTransitioning, swipeOffset, topFrozenContentRef]
  );

  useEffect(() => {
    if (!isSlidingView) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const startSwipe = (clientX: number, clientY: number) => {
      touchStartPos.current = {
        x: clientX,
        y: clientY,
      };
      isHorizontalSwipe.current = false;
      liveSwipeOffsetRef.current = 0;
      setIsTransitioning(false);
    };

    const moveSwipe = (
      clientX: number,
      clientY: number,
      preventDefault?: () => void
    ) => {
      if (isTransitioning) return;

      const deltaX = clientX - touchStartPos.current.x;
      const deltaY = clientY - touchStartPos.current.y;

      if (
        !isHorizontalSwipe.current &&
        Math.abs(deltaX) > 10 &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        isHorizontalSwipe.current = true;
      }

      if (!isHorizontalSwipe.current) return;

      preventDefault?.();

      const containerWidth = scroller.clientWidth;
      const maxOffset = containerWidth / 2;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
      const transform = `translateX(calc(-100% / 3 + ${offset}px))`;

      if (topFrozenContentRef.current) {
        topFrozenContentRef.current.style.transition = 'none';
        topFrozenContentRef.current.style.transform = transform;
      }

      if (swipeContentRef.current) {
        swipeContentRef.current.style.transition = 'none';
        swipeContentRef.current.style.transform = transform;
      }

      liveSwipeOffsetRef.current = offset;
    };

    const endSwipe = () => {
      if (!isHorizontalSwipe.current) {
        liveSwipeOffsetRef.current = 0;
        return;
      }

      const offset = liveSwipeOffsetRef.current;
      const threshold = 100;
      const containerWidth =
        swipeContentRef.current?.clientWidth || scroller.clientWidth;
      const dayWidth = containerWidth / displayDays;

      if (offset > threshold) {
        setIsTransitioning(true);
        setSwipeOffset(dayWidth);
        setTimeout(() => {
          const nextDate = new Date(mobilePageStart);
          nextDate.setDate(nextDate.getDate() - 1);
          setMobilePageStart(nextDate);
          app.setCurrentDate(nextDate);
          setSwipeOffset(0);
          liveSwipeOffsetRef.current = 0;
          setIsTransitioning(false);
        }, 300);
      } else if (offset < -threshold) {
        setIsTransitioning(true);
        setSwipeOffset(-dayWidth);
        setTimeout(() => {
          const nextDate = new Date(mobilePageStart);
          nextDate.setDate(nextDate.getDate() + 1);
          setMobilePageStart(nextDate);
          app.setCurrentDate(nextDate);
          setSwipeOffset(0);
          liveSwipeOffsetRef.current = 0;
          setIsTransitioning(false);
        }, 300);
      } else {
        setIsTransitioning(true);
        setSwipeOffset(0);
        liveSwipeOffsetRef.current = 0;
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      }

      isHorizontalSwipe.current = false;
    };

    const handleScrollerTouchStart = (e: TouchEvent) => {
      startSwipe(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleScrollerTouchMove = (e: TouchEvent) => {
      moveSwipe(e.touches[0].clientX, e.touches[0].clientY, () => {
        if (e.cancelable) e.preventDefault();
      });
    };

    const handleScrollerTouchEnd = () => {
      endSwipe();
    };

    const handleScrollerPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;

      activePointerIdRef.current = e.pointerId;
      scroller.setPointerCapture?.(e.pointerId);
      startSwipe(e.clientX, e.clientY);
    };

    const handleScrollerPointerMove = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;

      moveSwipe(e.clientX, e.clientY, () => {
        if (e.cancelable) e.preventDefault();
      });
    };

    const handleScrollerPointerEnd = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;

      scroller.releasePointerCapture?.(e.pointerId);
      activePointerIdRef.current = null;
      endSwipe();
    };

    scroller.addEventListener('touchstart', handleScrollerTouchStart, {
      passive: true,
    });
    scroller.addEventListener('touchmove', handleScrollerTouchMove, {
      passive: false,
    });
    scroller.addEventListener('touchend', handleScrollerTouchEnd, {
      passive: true,
    });
    scroller.addEventListener('pointerdown', handleScrollerPointerDown);
    scroller.addEventListener('pointermove', handleScrollerPointerMove);
    scroller.addEventListener('pointerup', handleScrollerPointerEnd);
    scroller.addEventListener('pointercancel', handleScrollerPointerEnd);

    return () => {
      scroller.removeEventListener('touchstart', handleScrollerTouchStart);
      scroller.removeEventListener('touchmove', handleScrollerTouchMove);
      scroller.removeEventListener('touchend', handleScrollerTouchEnd);
      scroller.removeEventListener('pointerdown', handleScrollerPointerDown);
      scroller.removeEventListener('pointermove', handleScrollerPointerMove);
      scroller.removeEventListener('pointerup', handleScrollerPointerEnd);
      scroller.removeEventListener('pointercancel', handleScrollerPointerEnd);
    };
  }, [
    app,
    displayDays,
    isSlidingView,
    isTransitioning,
    mobilePageStart,
    scrollerRef,
    swipeContentRef,
    topFrozenContentRef,
  ]);

  useEffect(() => {
    if (!isSlidingView) {
      if (topFrozenContentRef.current) {
        topFrozenContentRef.current.style.transform = '';
        topFrozenContentRef.current.style.transition = '';
      }

      if (swipeContentRef.current) {
        swipeContentRef.current.style.transform = '';
        swipeContentRef.current.style.transition = '';
      }
      return;
    }

    const baseTranslateX = 'calc(-100% / 3)';
    const transition = isTransitioning ? 'transform 0.3s ease-out' : 'none';
    const transform = `translateX(calc(${baseTranslateX} + ${swipeOffset}px))`;

    if (topFrozenContentRef.current) {
      topFrozenContentRef.current.style.transition = transition;
      topFrozenContentRef.current.style.transform = transform;
    }

    if (swipeContentRef.current) {
      swipeContentRef.current.style.transition = transition;
      swipeContentRef.current.style.transform = transform;
    }
  }, [
    isSlidingView,
    isTransitioning,
    swipeContentRef,
    swipeOffset,
    topFrozenContentRef,
  ]);

  const goToPrevious = useCallback(() => {
    if (!isSlidingView) return false;

    const nextCurrentDate = new Date(currentDate);
    nextCurrentDate.setDate(nextCurrentDate.getDate() - 1);

    setMobilePageStart(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
    app.setCurrentDate(nextCurrentDate);

    return true;
  }, [app, currentDate, isSlidingView]);

  const goToNext = useCallback(() => {
    if (!isSlidingView) return false;

    const nextCurrentDate = new Date(currentDate);
    nextCurrentDate.setDate(nextCurrentDate.getDate() + 1);

    setMobilePageStart(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
    app.setCurrentDate(nextCurrentDate);

    return true;
  }, [app, currentDate, isSlidingView]);

  return {
    handleScroll,
    goToNext,
    goToPrevious,
    mobilePageStart,
  };
};
