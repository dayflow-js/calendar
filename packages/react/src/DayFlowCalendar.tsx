import React, { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRenderer, ICalendarApp, CustomRendering } from '@dayflow/core';

export interface DayFlowCalendarProps {
  app: ICalendarApp;
  className?: string;
  style?: React.CSSProperties;
  /** Custom event content renderer (React) */
  eventContent?: (args: { event: any; isAllDay: boolean; isMobile: boolean }) => React.ReactNode;
  /** Custom event detail panel content (React) */
  eventDetailContent?: (args: { event: any; position: any; onClose: () => void }) => React.ReactNode;
  /** Custom event detail dialog (React) */
  eventDetailDialog?: (args: { event: any; isOpen: boolean; onClose: () => void; onEventUpdate: any; onEventDelete: any; isAllDay: boolean; app: any }) => React.ReactNode;
  /** Custom calendar header content (React) */
  headerContent?: (args: any) => React.ReactNode;
  /** Custom create calendar dialog (React) */
  createCalendarDialog?: (args: { onClose: () => void; onCreate: (calendar: any) => void; colorPickerMode?: string }) => React.ReactNode;
  /** Title bar slot (React) */
  titleBarSlot?: React.ReactNode | ((context: { isCollapsed: boolean; toggleCollapsed: () => void }) => React.ReactNode);
  /** Custom color picker renderer (React) */
  colorPicker?: (args: any) => React.ReactNode;
  /** Custom color picker wrapper renderer (React) */
  colorPickerWrapper?: (args: any) => React.ReactNode;
}

export const DayFlowCalendar: React.FC<DayFlowCalendarProps> = ({
  app,
  className,
  style,
  ...renderProps
}) => {
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
    return Array.from(customRenderings.values()).map((rendering) => {
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
