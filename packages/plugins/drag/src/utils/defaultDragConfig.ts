import { getLineColor } from '@dayflow/core';

export const defaultDragConfig = {
  HOUR_HEIGHT: 72,
  FIRST_HOUR: 0,
  LAST_HOUR: 24,
  MIN_DURATION: 0.25,
  TIME_COLUMN_WIDTH: 80,
  ALL_DAY_HEIGHT: 28,

  getLineColor: (color: string) => getLineColor(color),

  getDynamicPadding: (drag: { endHour: number; startHour: number }) => {
    const duration = drag.endHour - drag.startHour;
    return duration <= 0.25 ? 'px-1 py-0' : 'p-1';
  },
};
