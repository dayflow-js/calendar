import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  UseCalendarAppReturn,
} from '@/types';
import DefaultCalendarSidebar from '@/components/sidebar/DefaultCalendarSidebar';
import DefaultEventDetailDialog from '@/components/common/DefaultEventDetailDialog';
import { CalendarSidebarRenderProps } from '@/types';
import { normalizeCssWidth } from '@/utils/styleUtils';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ThemeMode } from '@/types/calendarTypes';

const DEFAULT_SIDEBAR_WIDTH = '240px';

interface DayFlowCalendarProps {
  calendar: UseCalendarAppReturn;
  className?: string;
  style?: React.CSSProperties | undefined;
  /** Custom event detail content component (content only, will be wrapped in default panel) */
  customDetailPanelContent?: EventDetailContentRenderer;
  /** Custom event detail dialog component (Dialog mode) */
  customEventDetailDialog?: EventDetailDialogRenderer;
  meta?: Record<string, any>; // Additional metadata
}

export const DayFlowCalendar: React.FC<DayFlowCalendarProps> = ({
  calendar,
  className,
  style,
  customDetailPanelContent,
  customEventDetailDialog,
  meta,
}) => {
  const app = calendar.app;
  const currentView = app.getCurrentView();
  const ViewComponent = currentView.component;
  const sidebarConfig = app.getSidebarConfig();
  const sidebarEnabled = sidebarConfig?.enabled ?? false;
  const [sidebarVersion, setSidebarVersion] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(
    sidebarConfig?.initialCollapsed ?? false
  );

  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => app.getTheme());

  useEffect(() => {
    setIsCollapsed(sidebarConfig?.initialCollapsed ?? false);
  }, [sidebarConfig?.initialCollapsed]);

  // Subscribe to theme changes from CalendarApp
  useEffect(() => {
    const unsubscribe = app.subscribeThemeChange((newTheme) => {
      setTheme(newTheme);
    });

    return () => {
      unsubscribe();
    };
  }, [app]);

  // Sync theme changes from ThemeProvider back to CalendarApp
  const handleThemeChange = useCallback((newTheme: ThemeMode) => {
    app.setTheme(newTheme);
  }, [app]);

  const refreshSidebar = useCallback(() => {
    setSidebarVersion(prev => prev + 1);
  }, []);

  const calendars = useMemo(
    () => app.getCalendars(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, sidebarVersion]
  );

  const handleToggleCalendarVisibility = useCallback(
    (calendarId: string, visible: boolean) => {
      app.setCalendarVisibility(calendarId, visible);
      refreshSidebar();
    },
    [app, refreshSidebar]
  );

  const handleToggleAllCalendars = useCallback(
    (visible: boolean) => {
      app.setAllCalendarsVisibility(visible);
      refreshSidebar();
    },
    [app, refreshSidebar]
  );

  // DOM reference for the entire calendar
  const calendarRef = useRef<HTMLDivElement>(null!);

  // Determine which event detail dialog to use
  // Priority: customEventDetailDialog > useEventDetailDialog (built-in) > undefined (use panel)
  const effectiveEventDetailDialog: EventDetailDialogRenderer | undefined =
    customEventDetailDialog ||
    (app.getUseEventDetailDialog() ? DefaultEventDetailDialog : undefined);

  // Prepare props to pass to view component
  const viewProps = {
    app: app,
    config: currentView.config || {},
    customDetailPanelContent,
    customEventDetailDialog: effectiveEventDetailDialog,
    switcherMode: app.state.switcherMode,
    calendarRef,
    meta,
  };

  const sidebarProps: CalendarSidebarRenderProps = {
    app: app,
    calendars,
    toggleCalendarVisibility: handleToggleCalendarVisibility,
    toggleAll: handleToggleAllCalendars,
    isCollapsed,
    setCollapsed: setIsCollapsed,
  };

  const renderSidebarContent = () => {
    if (!sidebarEnabled) return null;

    if (sidebarConfig.render) {
      return sidebarConfig.render(sidebarProps);
    }

    return <DefaultCalendarSidebar {...sidebarProps} />;
  };

  const collapsedWidth = '60px';
  const resolvedSidebarWidth = isCollapsed
    ? collapsedWidth
    : normalizeCssWidth(sidebarConfig?.width, DEFAULT_SIDEBAR_WIDTH);
  const contentClassName = 'flex flex-col flex-1 h-full';


  return (
    <ThemeProvider initialTheme={theme} onThemeChange={handleThemeChange}>
      <div
        className={`calendar-container ${className ?? ''}`}
        style={{ height: 800, ...style }}
      >
        <div className="flex h-full" >
          {sidebarEnabled && (
            <aside
              className="shrink-0"
              style={{ width: resolvedSidebarWidth }}
            >
              {renderSidebarContent()}
            </aside>
          )}
          <div className={contentClassName} ref={calendarRef}>
            <div className="calendar-renderer h-full">
              <ViewComponent {...viewProps} />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default DayFlowCalendar;
