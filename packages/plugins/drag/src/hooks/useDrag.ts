import {
  useDragProps,
  useDragReturn,
  ViewType,
  getLineColor,
} from '@dayflow/core';
import { defaultDragConfig } from '@drag/utils/defaultDragConfig';
import { useMemo } from 'preact/hooks';

import { useDragCommon } from './useDragCommon';
import { useDragHandlers } from './useDragHandlers';
import { useDragManager } from './useDragManager';
import { useDragState } from './useDragState';
import { useMonthDrag } from './useMonthDrag';
import { useWeekDayDrag } from './useWeekDayDrag';

export const useDrag = (options: useDragProps): useDragReturn => {
  // Merge default configuration with user-provided configuration
  const config = useMemo(
    () => ({
      ...defaultDragConfig,
      ...options,
      getLineColor: (color: string) => {
        if (options.getLineColor) {
          return options.getLineColor(color);
        }
        return getLineColor(color, options.app?.getCalendarRegistry());
      },
    }),
    [options]
  );

  const { viewType } = config;
  const isDateGridView =
    viewType === ViewType.MONTH || viewType === ViewType.YEAR;

  // Initialize common utility functions (shared utility methods)
  const common = useDragCommon(config);

  // Initialize state management (drag state and refs)
  const state = useDragState(config);

  // Initialize indicator manager (create, update, remove indicators)
  const manager = useDragManager(config);

  // Initialize drag event handlers (all event handling logic)
  const handlers = useDragHandlers({
    options: config,
    common,
    state,
    manager,
  });

  // Initialize view-specific features
  const weekDaySpecific = useWeekDayDrag({
    options: config,
    common,
    state,
    manager,
    handleDragMove: handlers.handleDragMove,
    handleDragEnd: handlers.handleDragEnd,
  });

  const monthSpecific = useMonthDrag({
    options: config,
    common,
    state,
    manager,
  });

  // Combine and return complete interface
  return {
    // Indicator management methods
    createDragIndicator: manager.createDragIndicator,
    updateDragIndicator: manager.updateDragIndicator,
    removeDragIndicator: manager.removeDragIndicator,

    // Drag event handler methods
    handleCreateStart: handlers.handleCreateStart,
    handleMoveStart: handlers.handleMoveStart,
    handleResizeStart: handlers.handleResizeStart,

    // State
    dragState: state.dragState,
    isDragging: state.dragState.active,

    // Week/Day view specific methods (optional)
    ...(isDateGridView
      ? {
          // Month view specific methods
          daysDifference: monthSpecific.daysDifference,
          addDaysToDate: monthSpecific.addDaysToDate,
          getTargetDateFromPosition: monthSpecific.getTargetDateFromPosition,
        }
      : {
          // Week/Day view specific methods
          handleCreateAllDayEvent: weekDaySpecific.handleCreateAllDayEvent,
          pixelYToHour: weekDaySpecific.pixelYToHour,
          getColumnDayIndex: weekDaySpecific.getColumnDayIndex,
        }),
  };
};
