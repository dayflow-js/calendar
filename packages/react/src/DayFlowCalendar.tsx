import { CalendarRenderer } from '@dayflow/core';
import type {
  ICalendarApp,
  CustomRendering,
  UseCalendarAppReturn,
  Event,
  EventDetailPosition,
  CalendarHeaderProps,
  CalendarType,
} from '@dayflow/core';
import { useRef, useEffect, useState, useMemo } from 'react';
import type { ReactNode, FC } from 'react';
import { createPortal } from 'react-dom';

export interface DayFlowCalendarProps {
  calendar: ICalendarApp | UseCalendarAppReturn;
  /** Custom event content renderer (React) */
  eventContent?: (args: {
    event: Event;
    isAllDay: boolean;
    isMobile: boolean;
  }) => ReactNode;
  /** Custom event detail panel content (React) */
  eventDetailContent?: (args: {
    event: Event;
    position: EventDetailPosition;
    onClose: () => void;
  }) => ReactNode;
  /** Custom event detail dialog (React) */
  eventDetailDialog?: (args: {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onEventUpdate: (event: Event) => void;
    onEventDelete: (id: string) => void;
    isAllDay: boolean;
    app: ICalendarApp;
  }) => ReactNode;
  /** Custom calendar header content (React) */
  headerContent?: (args: CalendarHeaderProps) => ReactNode;
  /** Custom create calendar dialog (React) */
  createCalendarDialog?: (args: {
    onClose: () => void;
    onCreate: (calendar: CalendarType) => void;
    colorPickerMode?: 'default' | 'custom';
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
  colorPicker?: (args: unknown) => ReactNode;
  /** Custom color picker wrapper renderer (React) */
  colorPickerWrapper?: (args: unknown) => ReactNode;
}

/** Compute active override names from props and installed plugins. */
function computeActiveOverrides(
  app: ICalendarApp,
  renderProps: Omit<DayFlowCalendarProps, 'calendar'>
): string[] {
  const fromProps = Object.keys(renderProps).filter(
    key => (renderProps as Record<string, unknown>)[key] !== undefined
  );

  const fromPlugins: string[] = [];
  if (app?.state?.plugins) {
    app.state.plugins.forEach(plugin => {
      if (plugin.name === 'sidebar' && plugin.config) {
        const config = plugin.config as Record<string, unknown>;
        if (config['render']) {
          fromPlugins.push('sidebar');
        }
        if (config['renderCreateCalendarDialog']) {
          fromPlugins.push('createCalendarDialog');
        }
        if (config['renderCalendarContextMenu']) {
          fromPlugins.push('calendarContextMenu');
        }
      }
    });
  }

  return [...new Set([...fromProps, ...fromPlugins])];
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
  const app =
    'app' in calendar && calendar.app
      ? calendar.app
      : (calendar as ICalendarApp);
  const renderPropsKeysRef = useRef<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
    if (!containerRef.current || !app) {
      return;
    }

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
    if (!rendererRef.current) {
      return;
    }
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
    if (!isMounted) {
      return [];
    }
    return [...customRenderings.values()].map((rendering: CustomRendering) => {
      const { id, containerEl, generatorName, generatorArgs } = rendering;

      // 1. Look up the generator in props
      let generator = (renderProps as Record<string, unknown>)[generatorName];

      // 2. If not in props, look up in plugins
      if (!generator && app && app.state && app.state.plugins) {
        app.state.plugins.forEach(plugin => {
          if (plugin.name === 'sidebar' && plugin.config) {
            const config = plugin.config as Record<string, unknown>;
            if (generatorName === 'sidebar') {
              generator = config['render'];
            }
            if (generatorName === 'createCalendarDialog') {
              generator = config['renderCreateCalendarDialog'];
            }
            if (generatorName === 'calendarContextMenu') {
              generator = config['renderCalendarContextMenu'];
            }
          }
        });
      }

      if (!generator) {
        return null;
      }

      const content =
        typeof generator === 'function' ? generator(generatorArgs) : generator;

      return createPortal(content, containerEl, id);
    });
  }, [customRenderings, renderProps, isMounted, app]);

  return (
    <>
      <div ref={containerRef} className='df-calendar-wrapper' />
      {isMounted && portals}
    </>
  );
};
