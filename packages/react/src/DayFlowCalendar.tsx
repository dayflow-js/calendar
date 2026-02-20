import {
  useRef,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
  type FC,
} from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarRenderer,
  type ICalendarApp,
  type CustomRendering,
  type UseCalendarAppReturn,
} from '@dayflow/core';

export interface DayFlowCalendarProps {
  calendar: ICalendarApp | UseCalendarAppReturn;
  /** Custom event content renderer (React) */
  eventContent?: (args: {
    event: any;
    isAllDay: boolean;
    isMobile: boolean;
  }) => ReactNode;
  /** Custom event detail panel content (React) */
  eventDetailContent?: (args: {
    event: any;
    position: any;
    onClose: () => void;
  }) => ReactNode;
  /** Custom event detail dialog (React) */
  eventDetailDialog?: (args: {
    event: any;
    isOpen: boolean;
    onClose: () => void;
    onEventUpdate: any;
    onEventDelete: any;
    isAllDay: boolean;
    app: any;
  }) => ReactNode;
  /** Custom calendar header content (React) */
  headerContent?: (args: any) => ReactNode;
  /** Custom create calendar dialog (React) */
  createCalendarDialog?: (args: {
    onClose: () => void;
    onCreate: (calendar: any) => void;
    colorPickerMode?: string;
  }) => ReactNode;
  /** Title bar slot (React) */
  titleBarSlot?:
    | ReactNode
    | ((context: {
        isCollapsed: boolean;
        toggleCollapsed: () => void;
      }) => ReactNode);
  /** Custom color picker renderer (React) */
  colorPicker?: (args: any) => ReactNode;
  /** Custom color picker wrapper renderer (React) */
  colorPickerWrapper?: (args: any) => ReactNode;
}

export const DayFlowCalendar: FC<DayFlowCalendarProps> = ({
  calendar,
  ...renderProps
}: DayFlowCalendarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CalendarRenderer | null>(null);
  const [customRenderings, setCustomRenderings] = useState<
    Map<string, CustomRendering>
  >(new Map());
  const [isMounted, setIsMounted] = useState(false);
  const [, setTick] = useState(0);

  // Extract the underlying app instance
  const app = (calendar as any)?.app || calendar;
  const renderPropsKeysRef = useRef<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
    if (!containerRef.current || !app) return;

    const renderer = new CalendarRenderer(app);
    rendererRef.current = renderer;
    renderer.mount(containerRef.current);

    const unsubscribeStore = renderer
      .getCustomRenderingStore()
      .subscribe(
        (
          renderings:
            | Iterable<readonly [string, CustomRendering]>
            | null
            | undefined
        ) => {
          // Create a new map to trigger re-render
          setCustomRenderings(new Map(renderings));
        }
      );

    // Subscribe to app changes to refresh portals if needed
    const unsubscribeApp = app.subscribe(() => {
      setTick(t => t + 1);
    });

    return () => {
      unsubscribeStore();
      unsubscribeApp();
      renderer.unmount();
      rendererRef.current = null;
    };
  }, [app]);

  useEffect(() => {
    if (!rendererRef.current) return;
    const store = rendererRef.current.getCustomRenderingStore();

    // Regular overrides from props
    const activeOverrides = Object.keys(renderProps).filter(
      key => (renderProps as any)[key] !== undefined
    );

    // Also check for overrides from plugins (like sidebar)
    const pluginOverrides: string[] = [];
    if (app && app.state && app.state.plugins) {
      app.state.plugins.forEach((plugin: any) => {
        if (plugin.name === 'sidebar' && plugin.config) {
          if (plugin.config.render) pluginOverrides.push('sidebar');
          if (plugin.config.renderCreateCalendarDialog)
            pluginOverrides.push('createCalendarDialog');
          if (plugin.config.renderCalendarContextMenu)
            pluginOverrides.push('calendarContextMenu');
        }
        // Add other plugins as needed
      });
    }

    const allOverrides = Array.from(
      new Set([...activeOverrides, ...pluginOverrides])
    );

    // Only update if keys have changed
    if (
      JSON.stringify(renderPropsKeysRef.current) !==
      JSON.stringify(allOverrides)
    ) {
      store.setOverrides(allOverrides);
      renderPropsKeysRef.current = allOverrides;
    }
  }, [renderProps, app]);

  // Portals for custom content
  const portals = useMemo(() => {
    if (!isMounted) return [];
    return Array.from(customRenderings.values()).map(
      (rendering: CustomRendering) => {
        const { id, containerEl, generatorName, generatorArgs } = rendering;

        // 1. Look up the generator in renderProps
        let generator = (renderProps as any)[generatorName];

        // 2. If not in props, look up in plugins
        if (!generator && app && app.state && app.state.plugins) {
          app.state.plugins.forEach((plugin: any) => {
            if (plugin.name === 'sidebar' && plugin.config) {
              if (generatorName === 'sidebar') generator = plugin.config.render;
              if (generatorName === 'createCalendarDialog')
                generator = plugin.config.renderCreateCalendarDialog;
              if (generatorName === 'calendarContextMenu')
                generator = plugin.config.renderCalendarContextMenu;
            }
          });
        }

        if (!generator) {
          return null;
        }

        const content =
          typeof generator === 'function'
            ? generator(generatorArgs)
            : generator;

        return createPortal(content, containerEl, id);
      }
    );
  }, [customRenderings, renderProps, isMounted, app]);

  return (
    <>
      <div ref={containerRef} className="df-calendar-wrapper" />
      {isMounted && portals}
    </>
  );
};
