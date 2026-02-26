import type { ICalendarApp, DragHookOptions, DragHookReturn } from '@/types';

type DragForViewFn = (
  app: ICalendarApp,
  options: DragHookOptions
) => DragHookReturn;

let impl: DragForViewFn | null = null;

export function registerDragImplementation(fn: DragForViewFn) {
  impl = fn;
}

const NO_OP: DragHookReturn = {
  handleMoveStart: () => {
    /* noop */
  },
  handleCreateStart: () => {
    /* noop */
  },
  handleResizeStart: undefined,
  handleCreateAllDayEvent: () => {
    /* noop */
  },
  dragState: {
    active: false,
    mode: null,
    eventId: null,
    targetDate: null,
    startDate: null,
    endDate: null,
  },
  isDragging: false,
};

export function useDragForView(
  app: ICalendarApp,
  options: DragHookOptions
): DragHookReturn {
  if (impl) return impl(app, options);
  return NO_OP;
}
