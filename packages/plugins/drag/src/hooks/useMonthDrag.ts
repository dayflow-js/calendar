import { UseMonthDragParams, UseMonthDragReturn } from '@dayflow/core';

export const useMonthDrag = (
  params: UseMonthDragParams
): UseMonthDragReturn => {
  const { common } = params;
  const { daysDifference, addDaysToDate, getTargetDateFromPosition } = common;

  return {
    daysDifference,
    addDaysToDate,
    getTargetDateFromPosition,
  };
};
