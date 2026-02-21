import { useRef, useState } from 'preact/hooks';
import { Event } from '@/types';

interface UseEventInteractionProps {
  event: Event;
  isTouchEnabled: boolean;
  onMoveStart?: (e: any, event: Event) => void;
  onEventLongPress?: (eventId: string) => void;
  onEventSelect?: (eventId: string | null) => void;
  onDetailPanelToggle?: (key: string | null) => void;
  canOpenDetail: boolean;
  app?: any;
  multiDaySegmentInfo?: any;
  isMultiDay?: boolean;
  segment?: any;
  detailPanelKey: string;
}

export const useEventInteraction = ({
  event,
  isTouchEnabled,
  onMoveStart,
  onEventLongPress,
  onEventSelect,
  onDetailPanelToggle,
  canOpenDetail,
  app,
  multiDaySegmentInfo,
  isMultiDay,
  segment,
  detailPanelKey,
}: UseEventInteractionProps) => {
  const [isSelected, setIsSelected] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: any) => {
    if (!onMoveStart || !isTouchEnabled) return;
    e.stopPropagation();
    setIsPressed(true);

    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const currentTarget = e.currentTarget;

    touchStartPosRef.current = { x: clientX, y: clientY };

    longPressTimerRef.current = setTimeout(() => {
      if (onEventLongPress) {
        onEventLongPress(event.id);
      } else {
        setIsSelected(true);
      }

      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        currentTarget: currentTarget,
        touches: [{ clientX, clientY }],
        cancelable: false,
      } as unknown as any;

      if (multiDaySegmentInfo) {
        const adjustedEvent = {
          ...event,
          day: multiDaySegmentInfo.dayIndex ?? event.day,
          _segmentInfo: multiDaySegmentInfo,
        };
        onMoveStart(syntheticEvent, adjustedEvent as Event);
      } else if (isMultiDay && segment) {
        const adjustedEvent = {
          ...event,
          day: segment.startDayIndex,
          _segmentInfo: {
            dayIndex: segment.startDayIndex,
            isFirst: segment.isFirstSegment,
            isLast: segment.isLastSegment,
          },
        };
        onMoveStart(syntheticEvent, adjustedEvent as Event);
      } else {
        onMoveStart(syntheticEvent, event);
      }
      longPressTimerRef.current = null;
      touchStartPosRef.current = null;

      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchMove = (e: any) => {
    if (longPressTimerRef.current && touchStartPosRef.current) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        touchStartPosRef.current = null;
        setIsPressed(false);
      }
    }
  };

  const handleTouchEnd = (e: any) => {
    setIsPressed(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isTouchEnabled && touchStartPosRef.current) {
      e.preventDefault();
      e.stopPropagation();

      if (onEventSelect) {
        onEventSelect(event.id);
      } else if (canOpenDetail) {
        setIsSelected(true);
      }

      if (app) {
        app.onEventClick(event);
      }

      if (canOpenDetail) {
        onDetailPanelToggle?.(detailPanelKey);
      } else {
        onDetailPanelToggle?.(null);
      }
    }

    touchStartPosRef.current = null;
  };

  return {
    isSelected,
    setIsSelected,
    isPressed,
    setIsPressed,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
