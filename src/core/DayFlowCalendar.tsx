import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  UseCalendarAppReturn,
  CalendarSidebarRenderProps,
  CalendarType,
} from '../types';
import DefaultCalendarSidebar from '../components/sidebar/DefaultCalendarSidebar';
import DefaultEventDetailDialog from '../components/common/DefaultEventDetailDialog';
import CalendarHeader from '../components/common/CalendarHeader';
import { CreateCalendarDialog } from '../components/common/CreateCalendarDialog';
import SearchDrawer from '../components/search/SearchDrawer';
import MobileSearchDialog from '../components/search/MobileSearchDialog';
import { QuickCreateEventPopup } from '../components/common/QuickCreateEventPopup';
import { MobileEventDrawer } from '../components/mobileEventDrawer';
import { CalendarSearchProps, CalendarSearchEvent } from '../types/search';
import { normalizeCssWidth } from '../utils/styleUtils';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ThemeMode } from '../types/calendarTypes';
import { LocaleProvider } from '../locale/LocaleProvider';
import { useLocale } from '../locale/useLocale';
import { LocaleMessages, LocaleCode, Locale } from '../locale/types';
import { getCalendarColorsForHex } from './calendarRegistry';
import { generateUniKey } from '../utils/helpers';
import { temporalToDate, dateToZonedDateTime } from '../utils/temporal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const DEFAULT_SIDEBAR_WIDTH = '240px';

const COLORS = [
  '#ea426b',
  '#f19a38',
  '#f7cf46',
  '#83d754',
  '#51aaf2',
  '#b672d0',
  '#957e5e',
];

interface DayFlowCalendarProps {
  calendar: UseCalendarAppReturn;
  className?: string;
  style?: React.CSSProperties | undefined;
  /** Custom event detail content component (content only, will be wrapped in default panel) */
  customDetailPanelContent?: EventDetailContentRenderer;
  /** Custom event detail dialog component (Dialog mode) */
  customEventDetailDialog?: EventDetailDialogRenderer;
  meta?: Record<string, any>; // Additional metadata
  /** Custom localization messages to override defaults */
  customMessages?: LocaleMessages;
  /** Search configuration */
  search?: CalendarSearchProps;
  /** Render slot for the top-left overlay area (e.g., Electron title bar icons next to native traffic lights).
   *  Render function variant provides sidebar state for toggle functionality. */
  titleBarSlot?: React.ReactNode | ((context: {
    isCollapsed: boolean;
    toggleCollapsed: () => void;
  }) => React.ReactNode);
  /** Header left padding (px) when sidebar is collapsed.
   *  Also causes sidebar to collapse fully to 0px instead of the default 50px mini sidebar. */
  collapsedSafeAreaLeft?: number;
}

const CalendarInternalLocaleProvider: React.FC<{
  locale: LocaleCode | Locale;
  messages?: LocaleMessages;
  children: React.ReactNode;
}> = ({ locale, messages, children }) => {
  const context = useLocale();

  // If already wrapped by an external LocaleProvider, don't wrap again
  if (!context.isDefault) {
    return <>{children}</>;
  }

  return (
    <LocaleProvider locale={locale} messages={messages}>
      {children}
    </LocaleProvider>
  );
};

const CalendarLayout: React.FC<DayFlowCalendarProps> = ({
  calendar,
  className,
  style,
  customDetailPanelContent,
  customEventDetailDialog,
  meta,
  search: searchConfig,
  titleBarSlot,
  collapsedSafeAreaLeft,
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
  const { t } = useLocale();

  // Create Calendar State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(
    null
  );

  // Quick Create Popup State
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const quickCreateAnchorRef = useRef<HTMLElement>(null);

  // Mobile Drawer State
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mobileDraftEvent, setMobileDraftEvent] = useState<Event | null>(null);

  // Global Selection State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(null);

  // Enable Keyboard Shortcuts
  useKeyboardShortcuts({
    app,
    selectedEventId,
    setSelectedEventId,
    detailPanelEventId,
    setDetailPanelEventId,
    isDrawerOpen: isMobileDrawerOpen,
    setIsDrawerOpen: setIsMobileDrawerOpen,
  });

  // Sync highlighting from search results to selection
  useEffect(() => {
    if (app.state.highlightedEventId) {
      setSelectedEventId(app.state.highlightedEventId);
    }
  }, [app.state.highlightedEventId]);

  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => app.getTheme());

  // Search State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CalendarSearchEvent[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Search Logic
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setIsSearchOpen(false);
      setSearchResults([]);
      app.highlightEvent(null);
      return;
    }

    const debounceDelay = searchConfig?.debounceDelay ?? 300;

    const performSearch = async () => {
      setSearchLoading(true);
      setIsSearchOpen(true);

      try {
        let results: CalendarSearchEvent[] = [];

        if (searchConfig?.customSearch) {
          // If custom search is provided, we might need all events first or just pass empty if it fetches its own
          // The interface says: (params: { keyword, events }) => ...
          // So we should pass current events
          const currentEvents = app.getEvents().map(e => ({
            ...e,
            color:
              app.getCalendarRegistry().get(e.calendarId || '')?.colors
                .lineColor ||
              app.getCalendarRegistry().resolveColors().lineColor,
          }));
          results = searchConfig.customSearch({
            keyword: searchKeyword,
            events: currentEvents,
          });
        } else if (searchConfig?.onSearch) {
          results = await searchConfig.onSearch(searchKeyword);
        } else {
          // Default search: title or description
          const keywordLower = searchKeyword.toLowerCase();
          results = app
            .getEvents()
            .filter(e => {
              return (
                e.title.toLowerCase().includes(keywordLower) ||
                (e.description &&
                  e.description.toLowerCase().includes(keywordLower))
              );
            })
            .map(e => ({
              ...e,
              color:
                app.getCalendarRegistry().get(e.calendarId || '')?.colors
                  .lineColor ||
                app.getCalendarRegistry().resolveColors().lineColor,
            }));
        }

        setSearchResults(results);
        searchConfig?.onSearchStateChange?.({
          keyword: searchKeyword,
          loading: false,
          results,
        });
      } catch (error) {
        console.error('Search failed', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timer = setTimeout(performSearch, debounceDelay);
    return () => clearTimeout(timer);
  }, [searchKeyword, searchConfig, app]);

  useEffect(() => {
    if (!isSearchOpen) {
      app.highlightEvent(null);
    }
  }, [isSearchOpen, app]);

  const handleSearchResultClick = (event: CalendarSearchEvent) => {
    // Navigate to event date
    let date: Date;
    if (event.start instanceof Date) {
      date = event.start;
    } else if (typeof event.start === 'string') {
      date = new Date(event.start);
    } else {
      date = temporalToDate(event.start as any);
    }
    app.setCurrentDate(date);

    // Highlight the event
    app.highlightEvent(event.id);

    if (isMobileSearchOpen) {
      setIsMobileSearchOpen(false);
    }

    // TODO(mobile view)
  };

  useEffect(() => {
    setIsCollapsed(sidebarConfig?.initialCollapsed ?? false);
  }, [sidebarConfig?.initialCollapsed]);

  // Subscribe to theme changes from CalendarApp
  useEffect(() => {
    const unsubscribe = app.subscribeThemeChange(newTheme => {
      setTheme(newTheme);
    });

    return () => {
      unsubscribe();
    };
  }, [app]);

  // Sync theme changes from ThemeProvider back to CalendarApp
  const handleThemeChange = useCallback(
    (newTheme: ThemeMode) => {
      app.setTheme(newTheme);
    },
    [app]
  );

  const refreshSidebar = useCallback(() => {
    setSidebarVersion(prev => prev + 1);
  }, []);

  const calendars = useMemo(
    () => app.getCalendars(),
    [app, sidebarVersion, calendar]
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

  const handleCreateCalendar = useCallback(() => {
    const createMode = sidebarConfig.createCalendarMode || 'inline';

    if (createMode === 'modal') {
      setShowCreateDialog(true);
      return;
    }

    // Inline mode
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const { colors, darkColors } = getCalendarColorsForHex(randomColor);
    const newId = generateUniKey();

    const newCalendar: CalendarType = {
      id: newId,
      name: t('untitled'),
      colors,
      darkColors,
      isVisible: true,
      isDefault: false,
    };

    app.createCalendar(newCalendar);
    setEditingCalendarId(newId);
    refreshSidebar(); // Refresh sidebar to show new calendar
  }, [app, sidebarConfig.createCalendarMode, t, refreshSidebar]);

  const handleAddButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const isEditable = !app.state.readOnly;
    if (!isEditable) {
      if (sidebarEnabled) return; // Cannot create events
      return;
    }

    if (isMobile) {
      // Mobile: Open Event Drawer
      const now = new Date();
      // Round to nearest next hour
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);

      const end = new Date(now);
      end.setHours(end.getHours() + 1);

      const draft: Event = {
        id: generateUniKey(),
        title: '',
        start: dateToZonedDateTime(now),
        end: dateToZonedDateTime(end),
        calendarId: app.getCalendars().find(c => c.isVisible !== false)?.id || app.getCalendars()[0]?.id,
      };
      setMobileDraftEvent(draft);
      setIsMobileDrawerOpen(true);
      return;
    }

    if (sidebarEnabled) {
      // Desktop: Toggle popup
      if (isQuickCreateOpen) {
        setIsQuickCreateOpen(false);
      } else {
        (quickCreateAnchorRef as any).current = e.currentTarget;
        setIsQuickCreateOpen(true);
      }
    } else {
      // Sidebar disabled -> Add Button creates calendar
      handleCreateCalendar();
    }
  }, [sidebarEnabled, isMobile, isQuickCreateOpen, handleCreateCalendar, app]);


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
    selectedEventId,
    onEventSelect: setSelectedEventId,
    detailPanelEventId,
    onDetailPanelToggle: setDetailPanelEventId,
  };

  const sidebarProps: CalendarSidebarRenderProps = {
    app: app,
    calendars,
    toggleCalendarVisibility: handleToggleCalendarVisibility,
    toggleAll: handleToggleAllCalendars,
    isCollapsed,
    setCollapsed: setIsCollapsed,
    renderCalendarContextMenu: sidebarConfig.renderCalendarContextMenu,
    createCalendarMode: sidebarConfig.createCalendarMode,
    renderCreateCalendarDialog: sidebarConfig.renderCreateCalendarDialog,
    editingCalendarId,
    setEditingCalendarId,
    onCreateCalendar: handleCreateCalendar,
    colorPickerMode: sidebarConfig.colorPickerMode,
  };

  const renderSidebarContent = () => {
    if (!sidebarEnabled) return null;

    if (sidebarConfig.render) {
      return sidebarConfig.render(sidebarProps);
    }

    return <DefaultCalendarSidebar {...sidebarProps} />;
  };

  const sidebarWidth = normalizeCssWidth(
    sidebarConfig?.width,
    DEFAULT_SIDEBAR_WIDTH
  );
  const miniSidebarWidth = collapsedSafeAreaLeft != null ? '0px' : '50px';

  const headerConfig = app.getCalendarHeaderConfig();

  const safeAreaLeft = collapsedSafeAreaLeft != null && isCollapsed ? collapsedSafeAreaLeft : 0;

  const headerProps = {
    calendar: app,
    switcherMode: app.state.switcherMode,
    onAddCalendar: handleAddButtonClick,
    onSearchChange: setSearchKeyword,
    onSearchClick: () => {
      setSearchKeyword('');
      setIsMobileSearchOpen(true);
    },
    searchValue: searchKeyword,
    isSearchOpen: isSearchOpen,
    isEditable: !app.state.readOnly,
    ...(safeAreaLeft > 0 ? { safeAreaLeft } : {}),
  };

  const renderHeader = () => {
    if (headerConfig === false) return null;
    if (typeof headerConfig === 'function') {
      return headerConfig(headerProps);
    }
    return <CalendarHeader {...headerProps} />;
  };

  const MobileEventDrawerComponent = app.getCustomMobileEventRenderer() || MobileEventDrawer;

  return (
    <ThemeProvider initialTheme={theme} onThemeChange={handleThemeChange}>
      <div
        className={`calendar-container relative flex flex-row h-full overflow-hidden select-none ${className ?? ''}`}
        style={{ height: 800, ...style }}
      >
        {titleBarSlot && (
          typeof titleBarSlot === 'function'
            ? titleBarSlot({
                isCollapsed,
                toggleCollapsed: () => setIsCollapsed(prev => !prev),
              })
            : titleBarSlot
        )}

        {sidebarEnabled && (
          <aside
            className={`absolute top-0 bottom-0 left-0 z-0 h-full`}
            style={{
              width: sidebarWidth,
            }}
          >
            {renderSidebarContent()}
          </aside>
        )}

        <div
          className={`flex flex-col flex-1 h-full overflow-hidden relative z-10 bg-white dark:bg-gray-900 transition-all duration-250 ease-in-out border-l ${isCollapsed ? 'border-gray-200 dark:border-gray-700 shadow-xl' : 'border-transparent'}`}
          style={{
            marginLeft: sidebarEnabled
              ? isCollapsed
                ? miniSidebarWidth
                : sidebarWidth
              : 0,
          }}
        >
          {renderHeader()}

          <div className="flex-1 overflow-hidden relative" ref={calendarRef}>
            <div className="calendar-renderer h-full relative flex flex-row">
              <div className="flex-1 h-full overflow-hidden">
                <ViewComponent {...viewProps} />
              </div>

              <SearchDrawer
                isOpen={isSearchOpen}
                onClose={() => {
                  setIsSearchOpen(false);
                  setSearchKeyword(''); // Clear search on close
                  app.highlightEvent(null); // Clear highlight on close
                }}
                loading={searchLoading}
                results={searchResults}
                keyword={searchKeyword}
                onResultClick={handleSearchResultClick}
                emptyText={searchConfig?.emptyText}
              />
            </div>

            <MobileSearchDialog
              isOpen={isMobileSearchOpen}
              onClose={() => {
                setIsMobileSearchOpen(false);
                setSearchKeyword('');
                app.highlightEvent(null);
              }}
              keyword={searchKeyword}
              onSearchChange={setSearchKeyword}
              results={searchResults}
              loading={searchLoading}
              onResultClick={handleSearchResultClick}
              emptyText={searchConfig?.emptyText}
            />
          </div>
        </div>

        <QuickCreateEventPopup
          app={app}
          anchorRef={quickCreateAnchorRef}
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
        />

        <MobileEventDrawerComponent
          isOpen={isMobileDrawerOpen}
          onClose={() => {
            setIsMobileDrawerOpen(false);
            setMobileDraftEvent(null);
          }}
          onSave={(event) => {
            app.addEvent(event);
            setIsMobileDrawerOpen(false);
            setMobileDraftEvent(null);
          }}
          draftEvent={mobileDraftEvent}
          app={app}
        />

        {showCreateDialog &&
          (sidebarConfig.renderCreateCalendarDialog ? (
            sidebarConfig.renderCreateCalendarDialog({
              onClose: () => setShowCreateDialog(false),
              onCreate: newCalendar => {
                app.createCalendar(newCalendar);
                setShowCreateDialog(false);
                refreshSidebar();
              },
              colorPickerMode: sidebarConfig.colorPickerMode,
            })
          ) : (
            <CreateCalendarDialog
              onClose={() => setShowCreateDialog(false)}
              onCreate={newCalendar => {
                app.createCalendar(newCalendar);
                setShowCreateDialog(false);
                refreshSidebar();
              }}
              colorPickerMode={sidebarConfig.colorPickerMode}
            />
          ))}
      </div>
    </ThemeProvider>
  );
};

export const DayFlowCalendar: React.FC<DayFlowCalendarProps> = props => {
  const { calendar, customMessages } = props;
  const app = calendar.app;

  return (
    <CalendarInternalLocaleProvider
      locale={app.state.locale}
      messages={customMessages}
    >
      <CalendarLayout {...props} />
    </CalendarInternalLocaleProvider>
  );
};

export default DayFlowCalendar;