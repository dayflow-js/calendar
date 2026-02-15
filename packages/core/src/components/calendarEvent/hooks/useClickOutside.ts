import { useEffect } from 'preact/hooks';

interface UseClickOutsideProps {
  eventRef: { current: HTMLElement | null };
  detailPanelRef: { current: HTMLElement | null };
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
      const clickedOnSameEvent =
        target.closest(`[data-event-id="${eventId}"]`) !== null;
      const clickedInsidePanel = detailPanelRef.current?.contains(target);
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
        if (
          !clickedInsideEvent &&
          !clickedOnSameEvent &&
          !clickedInsidePanel &&
          !clickedInsideDetailDialog &&
          !clickedInsideRangePickerPopup &&
          !clickedInsideCalendarPickerDropdown
        ) {
          onEventSelect?.(null);
          setActiveDayIndex(null);
          setIsSelected(false);
          onDetailPanelToggle?.(null);
        }
      } else if (
        isEventSelected &&
        !clickedInsideEvent &&
        !clickedOnSameEvent &&
        !clickedInsideDetailDialog &&
        !clickedInsideRangePickerPopup &&
        !clickedInsideCalendarPickerDropdown
      ) {
        onEventSelect?.(null);
        setActiveDayIndex(null);
        setIsSelected(false);
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
  ]);
};
