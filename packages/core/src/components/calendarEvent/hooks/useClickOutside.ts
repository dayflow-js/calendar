import { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

import { clearPanelHandoffStartPosition } from '@/components/calendarEvent/hooks/usePanelHandoffAnimation';

interface UseClickOutsideProps {
  eventRef: RefObject<HTMLElement>;
  detailPanelRef: RefObject<HTMLElement>;
  calendarRef: RefObject<HTMLElement>;
  eventId: string;
  isEventSelected: boolean;
  showDetailPanel: boolean;
  onEventSelect?: (id: string | null) => void;
  onDetailPanelToggle?: (key: string | null) => void;
  setIsSelected: (selected: boolean) => void;
  setActiveDayIndex: (index: number | null) => void;
}

export const useClickOutside = ({
  eventRef,
  detailPanelRef,
  calendarRef,
  eventId,
  isEventSelected,
  showDetailPanel,
  onEventSelect,
  onDetailPanelToggle,
  setIsSelected,
  setActiveDayIndex,
}: UseClickOutsideProps) => {
  useEffect(() => {
    if (!isEventSelected && !showDetailPanel) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedInsideEvent = eventRef.current?.contains(target);
      const clickedAnyEvent = target.closest('[data-event-id]') !== null;
      const clickedOnSameEvent =
        target.closest(`[data-event-id="${eventId}"]`) !== null;
      const clickedInsidePanel = detailPanelRef.current?.contains(target);
      const clickedInsideGlobalPanel = target.closest(
        '[data-event-detail-panel]'
      );
      const clickedInsideDetailDialog = target.closest(
        '[data-event-detail-dialog]'
      );
      const clickedInsideRangePickerPopup = target.closest(
        '[data-range-picker-popup]'
      );
      const clickedInsideCalendarPickerDropdown = target.closest(
        '[data-calendar-picker-dropdown]'
      );

      if (showDetailPanel) {
        if (clickedAnyEvent) return;

        if (
          !clickedInsideEvent &&
          !clickedOnSameEvent &&
          !clickedInsidePanel &&
          !clickedInsideGlobalPanel &&
          !clickedInsideDetailDialog &&
          !clickedInsideRangePickerPopup &&
          !clickedInsideCalendarPickerDropdown
        ) {
          onEventSelect?.(null);
          setActiveDayIndex(null);
          setIsSelected(false);
          clearPanelHandoffStartPosition(calendarRef);
          onDetailPanelToggle?.(null);
        }
      } else if (
        isEventSelected &&
        !clickedInsideEvent &&
        !clickedOnSameEvent &&
        !clickedInsideGlobalPanel &&
        !clickedInsideDetailDialog &&
        !clickedInsideRangePickerPopup &&
        !clickedInsideCalendarPickerDropdown
      ) {
        onEventSelect?.(null);
        setActiveDayIndex(null);
        setIsSelected(false);
        clearPanelHandoffStartPosition(calendarRef);
        onDetailPanelToggle?.(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    isEventSelected,
    showDetailPanel,
    onEventSelect,
    onDetailPanelToggle,
    eventId,
    calendarRef,
  ]);
};
