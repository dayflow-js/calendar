// Week/Day view specific implementation
import { useCallback } from 'preact/hooks';
import {
  ViewType,
  UseWeekDayDragParams,
  UseWeekDayDragReturn,
  Event,
  getDateByDayIndex,
  useLocale,
  dateToPlainDate,
} from '@dayflow/core';

export const useWeekDayDrag = (
  params: UseWeekDayDragParams
): UseWeekDayDragReturn => {
  const { t } = useLocale();
  const { options, common, state, handleDragMove, handleDragEnd } =
    params;
  const { viewType, currentWeekStart, app } = options;
  const { dragRef, setDragState } = state;
  const { pixelYToHour, getColumnDayIndex } = common;

  const isMonthView = viewType === ViewType.MONTH;

  // Create all-day event
  const handleCreateAllDayEvent = useCallback(
    (e: any, dayIndex: number) => {
      if (app?.state.readOnly) return;
      if (isMonthView) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.type === 'dblclick') {
        const eventDate = currentWeekStart
          ? getDateByDayIndex(currentWeekStart, dayIndex)
          : new Date();
        const startTemporal = dateToPlainDate(eventDate);
        const endTemporal = dateToPlainDate(eventDate);

        const newEvent: Event = {
          id: String(Date.now()),
          title: t('newAllDayEvent'),
          day: dayIndex,
          start: startTemporal,
          end: endTemporal,
          calendarId: 'blue',
          allDay: true,
        };

        options.onEventCreate(newEvent);
        return;
      }

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

      // Do not create indicator immediately for drag (mousedown), wait for move
      drag.indicatorVisible = false;

      drag.sourceElement = null; // Clear source element

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    },
    [
      isMonthView,
      currentWeekStart,
      handleDragEnd,
      handleDragMove,
      dragRef,
      setDragState,
      app?.state.locale,
      options,
    ]
  );

  return {
    handleCreateAllDayEvent,
    pixelYToHour,
    getColumnDayIndex,
  };
};
