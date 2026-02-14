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

  // Extract the underlying app instance
  const app = (calendar as any)?.app || calendar;
  const renderPropsKeysRef = useRef<string[]>([]);

  useEffect(() => {
    if (!containerRef.current || !app) return;

    const renderer = new CalendarRenderer(app);
    rendererRef.current = renderer;
    renderer.mount(containerRef.current);

    const unsubscribe = renderer
      .getCustomRenderingStore()
      .subscribe(renderings => {
        // Create a new map to trigger re-render
        setCustomRenderings(new Map(renderings));
      });

    return () => {
      unsubscribe();
      renderer.unmount();
      rendererRef.current = null;
    };
  }, [app]);

  useEffect(() => {
    if (!rendererRef.current) return;
    const store = rendererRef.current.getCustomRenderingStore();
    const activeOverrides = Object.keys(renderProps).filter(
      key => (renderProps as any)[key] !== undefined
    );

    // Only update if keys have changed
    if (
      JSON.stringify(renderPropsKeysRef.current) !==
      JSON.stringify(activeOverrides)
    ) {
      store.setOverrides(activeOverrides);
      renderPropsKeysRef.current = activeOverrides;
    }
  }, [renderProps]);

  // Portals for custom content
  const portals = useMemo(() => {
    return Array.from(customRenderings.values()).map(
      (rendering: CustomRendering) => {
        const { id, containerEl, generatorName, generatorArgs } = rendering;

        // Look up the generator in renderProps
        const generator = (renderProps as any)[generatorName];

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
  }, [customRenderings, renderProps]);

  return (
    <>
      <div ref={containerRef} className="df-calendar-wrapper" />
      {portals}
    </>
  );
};
