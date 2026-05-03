import { CalendarRenderer } from '@dayflow/core';
import type {
  ICalendarApp,
  CustomRendering,
  UseCalendarAppReturn,
  EventContentSlotArgs,
  EventContextMenuSlotArgs,
  GridContextMenuSlotArgs,
  EventDetailContentProps,
  EventDetailDialogProps,
  CreateCalendarDialogProps,
  TitleBarSlotProps,
  ColorPickerProps,
  CreateCalendarDialogColorPickerProps,
  CalendarHeaderProps,
  CalendarSearchProps,
  MobileEventProps,
} from '@dayflow/core';
import { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';

// useLayoutEffect on the client fires before paint; fall back to useEffect on
// the server to avoid SSR hydration warnings (the calendar is client-only anyway).
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;
import type { ReactNode, FC } from 'react';
import { createPortal } from 'react-dom';

export interface DayFlowCalendarProps {
  calendar: ICalendarApp | UseCalendarAppReturn;
  /** Custom event content renderer for Day view timed events */
  eventContentDay?: (args: EventContentSlotArgs) => ReactNode;
  /** Custom event content renderer for Week view timed events */
  eventContentWeek?: (args: EventContentSlotArgs) => ReactNode;
  /** Custom event content renderer for Month view timed events */
  eventContentMonth?: (args: EventContentSlotArgs) => ReactNode;
  /** Custom event content renderer for Year view events */
  eventContentYear?: (args: EventContentSlotArgs) => ReactNode;
  /** Custom event content renderer for all-day events in Day view */
  eventContentAllDayDay?: (args: EventContentSlotArgs) => ReactNode;
  /** Custom event content renderer for all-day events in Week view */
  eventContentAllDayWeek?: (args: EventContentSlotArgs) => ReactNode;
  /** Custom event content renderer for all-day events in Month view */
  eventContentAllDayMonth?: (args: EventContentSlotArgs) => ReactNode;
  /** Custom event content renderer for all-day events in Year view */
  eventContentAllDayYear?: (args: EventContentSlotArgs) => ReactNode;
  /** Custom event detail panel content (React) */
  eventDetailContent?: (args: EventDetailContentProps) => ReactNode;
  /** Custom event detail dialog (React) */
  eventDetailDialog?: (args: EventDetailDialogProps) => ReactNode;
  /** Custom create calendar dialog (React) */
  createCalendarDialog?: (args: CreateCalendarDialogProps) => ReactNode;
  /** Optional left padding to account for safe area insets (e.g. on Mac) */
  collapsedSafeAreaLeft?: number;
  /** Title bar slot (React) */
  titleBarSlot?: (context: TitleBarSlotProps) => ReactNode;
  /** Custom color picker renderer (React) */
  colorPicker?: (args: ColorPickerProps) => ReactNode;
  /** Custom create calendar dialog color picker renderer (React) */
  createCalendarDialogColorPicker?: (
    args: CreateCalendarDialogColorPickerProps
  ) => ReactNode;
  /** Custom calendar header renderer (React) */
  calendarHeader?: (args: CalendarHeaderProps) => ReactNode;
  /** Custom event right-click context menu renderer (React) */
  eventContextMenu?: (args: EventContextMenuSlotArgs) => ReactNode;
  /** Custom grid/cell right-click context menu renderer (React) */
  gridContextMenu?: (args: GridContextMenuSlotArgs) => ReactNode;
  /** Custom mobile event detail drawer (React) */
  mobileEventDetail?: (args: MobileEventProps) => ReactNode;
  /** Search configuration */
  search?: CalendarSearchProps;
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
        if (config['renderSidebarHeader']) {
          fromPlugins.push('sidebarHeader');
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

  useIsomorphicLayoutEffect(() => {
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

    const store = renderer.getCustomRenderingStore();

    // Subscribe BEFORE mount so every slot registration that happens during
    // the synchronous Preact render is captured in the same React batch.
    // This eliminates the gap between "old containers detached" and "new
    // portals created" that caused titleBarSlot (and other slots) to flicker.
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

    renderer.mount(containerRef.current);

    return () => {
      // Unsubscribe FIRST so that when renderer.unmount() triggers
      // store.unregister() calls, React state is NOT cleared to an empty map.
      // The old portals stay in React state (invisible, containers detached)
      // until the next effect's subscribe + mount batch replaces them atomically.
      unsubscribeStore();
      store.setOverrides([]);
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
      app.setOverrides(allOverrides);
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
            switch (generatorName) {
              case 'sidebar':
                generator = config['render'];
                break;
              case 'createCalendarDialog':
                generator = config['renderCreateCalendarDialog'];
                break;
              case 'calendarContextMenu':
                generator = config['renderCalendarContextMenu'];
                break;
              case 'sidebarHeader':
                generator = config['renderSidebarHeader'];
                break;
              default:
                break;
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
