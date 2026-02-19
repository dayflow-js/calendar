import {
  registerDragImplementation,
  CalendarPlugin,
  ICalendarApp,
  ViewType,
  DragHookOptions,
  DragHookReturn,
  DragPluginConfig,
  DragService,
} from '@dayflow/core';
import { useDrag } from './hooks';

export function createDragPlugin(
  config: Partial<DragPluginConfig> = {}
): CalendarPlugin {
  const finalConfig: DragPluginConfig = {
    enableDrag: true,
    enableResize: true,
    enableCreate: true,
    enableAllDayCreate: true,
    supportedViews: [
      ViewType.DAY,
      ViewType.WEEK,
      ViewType.MONTH,
      ViewType.YEAR,
    ],
    ...config,
  };

  const dragService: DragService = {
    getConfig: () => finalConfig,
    updateConfig: (updates: Partial<DragPluginConfig>) => {
      Object.assign(finalConfig, updates);
    },
    isViewSupported: (viewType: ViewType): boolean => {
      return finalConfig.supportedViews.includes(viewType);
    },
  };

  return {
    name: 'drag',
    config: finalConfig,
    install: (app: ICalendarApp) => {
      if ((globalThis as any).process?.env?.NODE_ENV !== 'production') {
        console.log('[DayFlow] Drag plugin installed');
      }

      registerDragImplementation(
        (app: ICalendarApp, options: DragHookOptions): DragHookReturn => {
          const result = useDrag({ ...options, app });

          const currentDragService = app.getPlugin<DragService>('drag');
          if (!currentDragService) {
            return {
              handleMoveStart: () => {},
              handleCreateStart: () => {},
              handleResizeStart: () => {},
              handleCreateAllDayEvent: undefined,
              dragState: result.dragState,
              isDragging: false,
            };
          }

          const cfg = currentDragService.getConfig();
          const isSupported = currentDragService.isViewSupported(options.viewType);
          const readOnlyConfig = app.getReadOnlyConfig();
          const isDraggable = readOnlyConfig.draggable !== false;
          const isEditable = !app.state.readOnly;

          if (!isSupported) {
            console.info(
              `Drag functionality is not supported for ${options.viewType} view.`
            );
          }

          return {
            handleMoveStart:
              isSupported && cfg.enableDrag && isDraggable
                ? result.handleMoveStart
                : () => {},
            handleCreateStart:
              isSupported && cfg.enableCreate && isEditable
                ? result.handleCreateStart
                : () => {},
            handleResizeStart:
              isSupported && cfg.enableResize && isEditable
                ? result.handleResizeStart
                : undefined,
            handleCreateAllDayEvent:
              isSupported && cfg.enableAllDayCreate && isEditable
                ? result.handleCreateAllDayEvent
                : () => {},
            dragState: result.dragState,
            isDragging: isSupported && isDraggable ? result.isDragging : false,
          };
        }
      );
    },
    api: dragService,
  };
}

export function isDragService(obj: unknown): obj is DragService {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'useDragForView' in obj &&
    'getConfig' in obj &&
    'updateConfig' in obj
  );
}

export function createDragConfig(
  overrides: Partial<DragPluginConfig> = {}
): DragPluginConfig {
  return {
    enableDrag: true,
    enableResize: true,
    enableCreate: true,
    enableAllDayCreate: true,
    supportedViews: [
      ViewType.DAY,
      ViewType.WEEK,
      ViewType.MONTH,
      ViewType.YEAR,
    ],
    ...overrides,
  };
}
