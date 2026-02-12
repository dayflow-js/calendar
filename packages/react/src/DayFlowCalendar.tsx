import { useRef, useEffect, useState, useMemo, type CSSProperties, type ReactNode, type FC } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRenderer, type ICalendarApp, type CustomRendering } from '@dayflow/core';

export interface DayFlowCalendarProps {
  app: ICalendarApp;
  className?: string;
  style?: CSSProperties;
  /** Custom event content renderer (React) */
  eventContent?: (args: { event: any; isAllDay: boolean; isMobile: boolean }) => ReactNode;
  /** Custom event detail panel content (React) */
  eventDetailContent?: (args: { event: any; position: any; onClose: () => void }) => ReactNode;
  /** Custom event detail dialog (React) */
  eventDetailDialog?: (args: { event: any; isOpen: boolean; onClose: () => void; onEventUpdate: any; onEventDelete: any; isAllDay: boolean; app: any }) => ReactNode;
  /** Custom calendar header content (React) */
  headerContent?: (args: any) => ReactNode;
  /** Custom create calendar dialog (React) */
  createCalendarDialog?: (args: { onClose: () => void; onCreate: (calendar: any) => void; colorPickerMode?: string }) => ReactNode;
  /** Title bar slot (React) */
  titleBarSlot?: ReactNode | ((context: { isCollapsed: boolean; toggleCollapsed: () => void }) => ReactNode);
  /** Custom color picker renderer (React) */
  colorPicker?: (args: any) => ReactNode;
  /** Custom color picker wrapper renderer (React) */
  colorPickerWrapper?: (args: any) => ReactNode;
}

export const DayFlowCalendar: FC<DayFlowCalendarProps> = ({
  app,
  className,
  style,
  ...renderProps
}: DayFlowCalendarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CalendarRenderer | null>(null);
  const [customRenderings, setCustomRenderings] = useState<Map<string, CustomRendering>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new CalendarRenderer(app);
    rendererRef.current = renderer;
    renderer.mount(containerRef.current);

    const unsubscribe = renderer.getCustomRenderingStore().subscribe((renderings) => {
      // Create a new map to trigger re-render
      setCustomRenderings(new Map(renderings));
    });

    return () => {
      unsubscribe();
      renderer.unmount();
      rendererRef.current = null;
    };
  }, [app]);

  // Portals for custom content
  const portals = useMemo(() => {
    return Array.from(customRenderings.values()).map((rendering: CustomRendering) => {
      const { id, containerEl, generatorName, generatorArgs } = rendering;
      
      // Look up the generator in renderProps
      const generator = (renderProps as any)[generatorName];
      
      if (!generator) {
        return null;
      }

      const content = typeof generator === 'function' 
        ? generator(generatorArgs) 
        : generator;

      return createPortal(content, containerEl, id);
    });
  }, [customRenderings, renderProps]);

  return (
    <div className={className} style={style}>
      <div ref={containerRef} className="df-core-container" style={{ height: '100%' }} />
      {portals}
    </div>
  );
};
