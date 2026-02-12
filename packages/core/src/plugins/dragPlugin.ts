import { useDrag } from '../hooks/drag';
import {
  CalendarPlugin,
  ICalendarApp,
  ViewType,
  DragHookOptions,
  DragHookReturn,
  DragPluginConfig,
  DragService,
} from '../types';
import { logger } from '../utils/logger';

// Create drag plugin
export function createDragPlugin(
  config: Partial<DragPluginConfig> = {}
): CalendarPlugin {
  const finalConfig: DragPluginConfig = {
    enableDrag: true,
    enableResize: true,
    enableCreate: true,
    enableAllDayCreate: true,
    supportedViews: [ViewType.DAY, ViewType.WEEK, ViewType.MONTH, ViewType.YEAR],
    ...config,
  };

  // Drag service implementation
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
    install: () => {
      logger.log('Drag plugin installed - providing drag capabilities');
    },
    api: dragService,
  };
}

// Convenient Hook: provide drag functionality for views
export function useDragForView(
  app: ICalendarApp,
  options: DragHookOptions
): DragHookReturn {
  const dragService = app.getPlugin<DragService>('drag');

  // Always call Hook to maintain React Hook rules
  const result = useDrag({ ...options, app });

  // If dragPlugin is not installed, gracefully degrade - return disabled drag functionality
  if (!dragService) {
    logger.warn(
      'Drag plugin is not installed. Drag functionality will be disabled. Add createDragPlugin() to your plugins array to enable dragging.'
    );

    return {
      handleMoveStart: () => { }, // Disable move
      handleCreateStart: () => { }, // Disable create
      handleResizeStart: () => { }, // Disable resize
      handleCreateAllDayEvent: undefined,
      dragState: result.dragState,
      isDragging: false, // Never in dragging state
    };
  }

  const config = dragService.getConfig();
  const isSupported = dragService.isViewSupported(options.viewType);
  const readOnlyConfig = app.getReadOnlyConfig();
  const isDraggable = readOnlyConfig.draggable !== false;
  const isEditable = !app.state.readOnly;

  // If view is not supported or config is disabled, also gracefully degrade
  if (!isSupported) {
    console.info(
      `Drag functionality is not supported for ${options.viewType} view.`
    );
  }

  return {
    handleMoveStart:
      isSupported && config.enableDrag && isDraggable
        ? result.handleMoveStart
        : () => { },
    handleCreateStart:
      isSupported && config.enableCreate && isEditable
        ? result.handleCreateStart
        : () => { },
    handleResizeStart:
      isSupported && config.enableResize && isEditable
        ? result.handleResizeStart
        : undefined,
    handleCreateAllDayEvent:
      isSupported && config.enableAllDayCreate && isEditable
        ? result.handleCreateAllDayEvent
        : () => { },
    dragState: result.dragState,
    isDragging: isSupported && isDraggable ? result.isDragging : false,
  };
}

// Type guard
export function isDragService(obj: unknown): obj is DragService {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'useDragForView' in obj &&
    'getConfig' in obj &&
    'updateConfig' in obj
  );
}

// Convenient configuration creation function
export function createDragConfig(
  overrides: Partial<DragPluginConfig> = {}
): DragPluginConfig {
  return {
    enableDrag: true,
    enableResize: true,
    enableCreate: true,
    enableAllDayCreate: true,
    supportedViews: [ViewType.DAY, ViewType.WEEK, ViewType.MONTH, ViewType.YEAR],
    ...overrides,
  };
}
