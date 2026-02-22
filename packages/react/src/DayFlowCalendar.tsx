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
  collapsedSafeAreaLeft?: number;
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

/** Compute active override names from props and installed plugins. */
function computeActiveOverrides(
  app: any,
  renderProps: Omit<DayFlowCalendarProps, 'calendar'>
): string[] {
  const fromProps = Object.keys(renderProps).filter(
    key => (renderProps as any)[key] !== undefined
  );

  const fromPlugins: string[] = [];
  if (app?.state?.plugins) {
    app.state.plugins.forEach((plugin: any) => {
      if (plugin.name === 'sidebar' && plugin.config) {
        if (plugin.config.render) fromPlugins.push('sidebar');
        if (plugin.config.renderCreateCalendarDialog)
          fromPlugins.push('createCalendarDialog');
        if (plugin.config.renderCalendarContextMenu)
          fromPlugins.push('calendarContextMenu');
      }
    });
  }

  return Array.from(new Set([...fromProps, ...fromPlugins]));
}

/** Shallow ordered comparison — avoids JSON.stringify allocation. */
function overridesChanged(prev: string[], next: string[]): boolean {
  return prev.length !== next.length || prev.some((v, i) => v !== next[i]);
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

  // Extract the underlying app instance
  const app = (calendar as any)?.app || calendar;
  const renderPropsKeysRef = useRef<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
    if (!containerRef.current || !app) return;

    // Compute overrides synchronously so the very first Preact render already
    // knows which slots are handled by this adapter — no race window.
    const initialOverrides = computeActiveOverrides(app, renderProps);
    renderPropsKeysRef.current = initialOverrides;

    const renderer = new CalendarRenderer(app, initialOverrides);
    rendererRef.current = renderer;
    renderer.setProps(renderProps);
    renderer.mount(containerRef.current);

    const store = renderer.getCustomRenderingStore();

    const unsubscribeStore = store.subscribe(
      (
        renderings:
          | Iterable<readonly [string, CustomRendering]>
          | null
          | undefined
      ) => {
        setCustomRenderings(new Map(renderings));
      }
    );

    return () => {
      // if React recycles this fiber on the next route.
      store.setOverrides([]);
      unsubscribeStore();
      renderer.unmount();
      rendererRef.current = null;
    };
  }, [app]);

  // Keep overrides and props in sync when they change after the initial mount.
  useEffect(() => {
    if (!rendererRef.current) return;
    const store = rendererRef.current.getCustomRenderingStore();

    const allOverrides = computeActiveOverrides(app, renderProps);
    if (overridesChanged(renderPropsKeysRef.current, allOverrides)) {
      store.setOverrides(allOverrides);
      renderPropsKeysRef.current = allOverrides;
    }

    rendererRef.current.setProps(renderProps);
  }, [renderProps, app]);

  // Portals for custom content
  const portals = useMemo(() => {
    if (!isMounted) return [];
    return Array.from(customRenderings.values()).map(
      (rendering: CustomRendering) => {
        const { id, containerEl, generatorName, generatorArgs } = rendering;

        // 1. Look up the generator in props
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
