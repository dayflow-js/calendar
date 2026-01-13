// Week/Day view specific implementation
import { useCallback } from 'react';
import { ViewType, UseWeekDayDragParams, UseWeekDayDragReturn } from '../../types';
import { getDateByDayIndex } from '../../utils';
import { useLocale } from '@/locale';

export const useWeekDayDrag = (
  params: UseWeekDayDragParams
): UseWeekDayDragReturn => {
  const { t } = useLocale();
  const { options, common, state, manager, handleDragMove, handleDragEnd } =
    params;
  const { viewType, currentWeekStart, app } = options;
  const { dragRef, setDragState } = state;
  const { createDragIndicator } = manager;
  const { pixelYToHour, getColumnDayIndex } = common;

  const isMonthView = viewType === ViewType.MONTH;

  // Create all-day event
  const handleCreateAllDayEvent = useCallback(
    (e: React.MouseEvent, dayIndex: number) => {
      if (isMonthView) return;

      e.preventDefault();
      e.stopPropagation();
      if (dragRef.current?.active) return;

      const drag = dragRef.current;
      if (!drag) return;
      Object.assign(drag, {
        active: true,
        mode: 'create',
        eventId: null,
        startX: e.clientX,
        startY: e.clientY,
        dayIndex,
        allDay: true,
        eventDate: currentWeekStart
          ? getDateByDayIndex(currentWeekStart, dayIndex)
          : new Date(),
      });

      setDragState({
        active: true,
        mode: 'create',
        eventId: null,
        dayIndex,
        startHour: 0,
        endHour: 0,
        allDay: true,
      });
      createDragIndicator(drag, 'blue', t('newAllDayEvent'));
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    },
    [
      isMonthView,
      createDragIndicator,
      currentWeekStart,
      handleDragEnd,
      handleDragMove,
      dragRef,
      setDragState,
      app?.state.locale
    ]
  );

  return {
    handleCreateAllDayEvent,
    pixelYToHour,
    getColumnDayIndex,
  };
};
