import { h, Fragment } from 'preact';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useContext,
} from 'preact/hooks';
import {
  Event,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
  TNode,
} from '../types';
import DefaultEventDetailDialog from '../components/common/DefaultEventDetailDialog';
import CalendarHeader from '../components/common/CalendarHeader';
import SearchDrawer from '../components/search/SearchDrawer';
import MobileSearchDialog from '../components/search/MobileSearchDialog';
import { QuickCreateEventPopup } from '../components/common/QuickCreateEventPopup';
import { MobileEventDrawer } from '../components/mobileEventDrawer';
import { CalendarSearchProps, CalendarSearchEvent } from '../types/search';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ThemeMode } from '../types/calendarTypes';
import { LocaleProvider } from '../locale/LocaleProvider';
import { useLocale } from '../locale/useLocale';
import { LocaleCode, Locale, LocaleMessages } from '../locale/types';
import { generateUniKey } from '../utils/helpers';
import { temporalToDate, dateToZonedDateTime, isPlainDate } from '../utils/temporal';
import { createPortal } from 'preact/compat';
import { ContentSlot } from './ContentSlot';
import { CustomRenderingContext } from './CustomRenderingContext';
import { useSidebarBridge } from '../plugins/sidebarBridge';

interface CalendarRootProps {
  app: ICalendarApp;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  meta?: Record<string, any>;
  customMessages?: LocaleMessages;
  search?: CalendarSearchProps;
  titleBarSlot?:
    | TNode
    | ((context: {
        isCollapsed: boolean;
        toggleCollapsed: () => void;
      }) => TNode);
  collapsedSafeAreaLeft?: number;
}

const CalendarInternalLocaleProvider = ({
  locale,
  messages,
  children,
}: {
  locale: LocaleCode | Locale;
  messages?: LocaleMessages;
  children: any;
}) => {
  const context = useLocale();

  if (!context.isDefault) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <LocaleProvider locale={locale} messages={messages}>
      {children}
    </LocaleProvider>
  );
};

export const CalendarRoot = ({
  app,
  customDetailPanelContent,
  customEventDetailDialog,
  meta,
  customMessages,
  search: searchConfig,
  titleBarSlot,
  collapsedSafeAreaLeft,
}: CalendarRootProps) => {
  const customRenderingStore = useContext(CustomRenderingContext);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return app.subscribe(() => {
      setTick(t => t + 1);
    });
  }, [app]);

  const currentView = app.getCurrentView();
  const ViewComponent = currentView.component;

  const sidebar = useSidebarBridge(app);

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const quickCreateAnchorRef = useRef<HTMLElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mobileDraftEvent, setMobileDraftEvent] = useState<Event | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailPanelEventId, setDetailPanelEventId] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Sync local selectedEventId with app state
    const unsubscribe = app.subscribe(appInstance => {
      if (appInstance.state.selectedEventId !== selectedEventId) {
        setSelectedEventId(appInstance.state.selectedEventId || null);
      }
    });
    return unsubscribe;
  }, [app, selectedEventId]);

  // Handle Dismiss UI signal from app
  useEffect(() => {
    const originalCallbacks = (app as any).callbacks;
    const prevDismiss = originalCallbacks.onDismissUI;

    originalCallbacks.onDismissUI = () => {
      if (detailPanelEventId) {
        setDetailPanelEventId(null);
      }
      if (isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
      prevDismiss?.();
    };

    return () => {
      originalCallbacks.onDismissUI = prevDismiss;
    };
  }, [app, detailPanelEventId, isMobileDrawerOpen]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      app.setCurrentDate(date);
      app.selectEvent(null);
    },
    [app]
  );

  useEffect(() => {
    if (app.state.highlightedEventId) {
      app.selectEvent(app.state.highlightedEventId);
    }
  }, [app.state.highlightedEventId, app]);

  const [theme, setTheme] = useState<ThemeMode>(() => app.getTheme());

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

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setIsSearchOpen(false);
      setSearchResults([]);
      if (app.state.highlightedEventId !== null) {
        app.highlightEvent(null);
      }
      return;
    }

    const debounceDelay = searchConfig?.debounceDelay ?? 300;

    const performSearch = async () => {
      setSearchLoading(true);
      setIsSearchOpen(true);

      try {
        let results: CalendarSearchEvent[] = [];

        if (searchConfig?.customSearch) {
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
      if (app.state.highlightedEventId !== null) {
        app.highlightEvent(null);
      }
    }
  }, [isSearchOpen, app]);

  const handleSearchResultClick = (event: CalendarSearchEvent) => {
    let date: Date;
    if (event.start instanceof Date) {
      date = event.start;
    } else if (typeof event.start === 'string') {
      date = new Date(event.start);
    } else {
      date = temporalToDate(event.start as any);
    }
    app.setCurrentDate(date);
    app.highlightEvent(event.id);

    if (isMobileSearchOpen) {
      setIsMobileSearchOpen(false);
    }
  };

  useEffect(() => {
    const unsubscribe = app.subscribeThemeChange(newTheme => {
      setTheme(newTheme);
    });

    return () => {
      unsubscribe();
    };
  }, [app]);

  const handleThemeChange = useCallback(
    (newTheme: ThemeMode) => {
      app.setTheme(newTheme);
    },
    [app]
  );

  const handleAddButtonClick = useCallback(
    (e: any) => {
      const isEditable = !app.state.readOnly;
      if (!isEditable) return;

      if (isMobile) {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);

        const end = new Date(now);
        end.setHours(end.getHours() + 1);

        const draft: Event = {
          id: generateUniKey(),
          title: '',
          start: dateToZonedDateTime(now),
          end: dateToZonedDateTime(end),
          calendarId:
            app.getCalendars().find(c => c.isVisible !== false)?.id ||
            app.getCalendars()[0]?.id,
        };
        setMobileDraftEvent(draft);
        setIsMobileDrawerOpen(true);
        return;
      }

      if (isQuickCreateOpen) {
        setIsQuickCreateOpen(false);
      } else {
        (quickCreateAnchorRef as any).current = e.currentTarget;
        setIsQuickCreateOpen(true);
      }
    },
    [isMobile, isQuickCreateOpen, app]
  );

  const calendarRef = useRef<HTMLDivElement>(null!);

  const effectiveEventDetailDialog: EventDetailDialogRenderer | undefined =
    customEventDetailDialog ||
    (app.getUseEventDetailDialog() ? DefaultEventDetailDialog : undefined);

  const viewProps = {
    app: app,
    config: currentView.config || {},
    customDetailPanelContent,
    customEventDetailDialog: effectiveEventDetailDialog,
    switcherMode: app.state.switcherMode,
    calendarRef,
    meta,
    selectedEventId,
    onEventSelect: (id: string | null) => app.selectEvent(id),
    onDateChange: handleDateSelect,
    detailPanelEventId,
    onDetailPanelToggle: setDetailPanelEventId,
  };

  const renderEventDetailDialog = () => {
    if (!effectiveEventDetailDialog || !detailPanelEventId) return null;

    const rawEventId = detailPanelEventId.split('::')[0];
    const selectedEvent = app.getEvents().find((e: Event) => e.id === rawEventId);
    if (!selectedEvent) return null;

    const DialogComponent = effectiveEventDetailDialog;
    const portalTarget = typeof document !== 'undefined' ? document.body : null;
    if (!portalTarget) return null;

    const isAllDay = isPlainDate(selectedEvent.start);

    const handleDialogClose = () => {
      setDetailPanelEventId(null);
      app.selectEvent(null);
    };

    const dialogProps = {
      event: selectedEvent,
      isOpen: true,
      isAllDay,
      onEventUpdate: (evt: Event) => app.updateEvent(evt.id, evt),
      onEventDelete: (id: string) => {
        app.deleteEvent(id);
        setDetailPanelEventId(null);
        app.selectEvent(null);
      },
      onClose: handleDialogClose,
      app,
    };

    return (
      <ContentSlot
        store={customRenderingStore}
        generatorName="eventDetailDialog"
        generatorArgs={dialogProps}
        defaultContent={createPortal(
          h(DialogComponent, dialogProps),
          portalTarget
        )}
      />
    );
  };

  const miniSidebarWidth =
    collapsedSafeAreaLeft != null ? '0px' : sidebar.miniWidth;

  const headerConfig = app.getCalendarHeaderConfig();

  const safeAreaLeft =
    collapsedSafeAreaLeft != null && sidebar.isCollapsed
      ? collapsedSafeAreaLeft
      : sidebar.safeAreaLeft;

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
    return h(CalendarHeader, headerProps);
  };

  const MobileEventDrawerComponent =
    app.getCustomMobileEventRenderer() || MobileEventDrawer;

  return (
    <ThemeProvider initialTheme={theme} onThemeChange={handleThemeChange}>
      <CalendarInternalLocaleProvider
        locale={app.state.locale}
        messages={customMessages}
      >
        <div className="df-calendar-container relative flex flex-row overflow-hidden select-none">
          <ContentSlot
            store={customRenderingStore}
            generatorName="titleBarSlot"
            generatorArgs={{
              isCollapsed: sidebar.isCollapsed,
              toggleCollapsed: sidebar.toggleCollapsed,
            }}
            defaultContent={
              titleBarSlot &&
              (typeof titleBarSlot === 'function'
                ? titleBarSlot({
                    isCollapsed: sidebar.isCollapsed,
                    toggleCollapsed: sidebar.toggleCollapsed,
                  })
                : titleBarSlot)
            }
          />
          {sidebar.enabled && (
            <aside
              className={`absolute top-0 bottom-0 left-0 z-0 h-full`}
              style={{
                width: sidebar.width,
              }}
            >
              {sidebar.content}
            </aside>
          )}

          <div
            className={`flex flex-col flex-1 h-full overflow-hidden relative z-10 bg-white dark:bg-gray-900 transition-all duration-250 ease-in-out border-l ${sidebar.isCollapsed ? 'border-gray-200 dark:border-gray-700 shadow-xl' : 'border-transparent'}`}
            style={{
              marginLeft: sidebar.enabled
                ? sidebar.isCollapsed
                  ? miniSidebarWidth
                  : sidebar.width
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
                    setSearchKeyword('');
                    app.highlightEvent(null);
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
            onSave={(event: any) => {
              app.addEvent(event);
              setIsMobileDrawerOpen(false);
              setMobileDraftEvent(null);
            }}
            draftEvent={mobileDraftEvent}
            app={app}
          />

          {sidebar.extraContent}
          {renderEventDetailDialog()}
        </div>
      </CalendarInternalLocaleProvider>
    </ThemeProvider>
  );
};
