import { h, ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useContext,
  useState,
} from 'preact/hooks';

import CalendarHeader from '@/components/common/CalendarHeader';
import { CreateCalendarDialog } from '@/components/common/CreateCalendarDialog';
import DefaultEventDetailDialog from '@/components/common/DefaultEventDetailDialog';
import { QuickCreateEventPopup } from '@/components/common/QuickCreateEventPopup';
import { MobileEventDrawer } from '@/components/mobileEventDrawer';
import MobileSearchDialog from '@/components/search/MobileSearchDialog';
import SearchDrawer from '@/components/search/SearchDrawer';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/locale/LocaleProvider';
import { LocaleCode, Locale, LocaleMessages } from '@/locale/types';
import { useLocale } from '@/locale/useLocale';
import { useSidebarBridge } from '@/plugins/sidebarBridge';
import {
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
  TNode,
  Event as CalendarEvent,
} from '@/types';
import { ThemeMode } from '@/types/calendarTypes';
import { CalendarSearchProps } from '@/types/search';

import { ContentSlot } from './ContentSlot';
import { CustomRenderingContext } from './CustomRenderingContext';
import { useAppSubscription } from './hooks/useAppSubscription';
import { useEventDialogController } from './hooks/useEventDialogController';
import { useQuickCreateController } from './hooks/useQuickCreateController';
import { useResponsive } from './hooks/useResponsive';
import { useSearchController } from './hooks/useSearchController';

interface CalendarRootProps {
  app: ICalendarApp;
  customDetailPanelContent?: EventDetailContentRenderer;
  customEventDetailDialog?: EventDetailDialogRenderer;
  meta?: Record<string, unknown>;
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

// Internal locale gate — only wraps with LocaleProvider when no parent
// provider is already present (e.g. when used inside a Vue/Angular adapter
// that sets up its own locale context).
const CalendarInternalLocaleProvider = ({
  locale,
  messages,
  children,
}: {
  locale: LocaleCode | Locale;
  messages?: LocaleMessages;
  children: ComponentChildren;
}) => {
  const context = useLocale();

  if (!context.isDefault) {
    return children;
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
  // App subscription & sync
  const { tick, selectedEventId } = useAppSubscription(app);
  // Responsive breakpoint
  const { isMobile } = useResponsive();
  // Search
  const search = useSearchController(app, searchConfig);
  // Event detail dialog / panel
  const effectiveEventDetailDialog: EventDetailDialogRenderer | undefined =
    customEventDetailDialog ||
    (app.getUseEventDetailDialog() ? DefaultEventDetailDialog : undefined);

  const eventDialog = useEventDialogController(
    app,
    effectiveEventDetailDialog,
    tick
  );
  // Sidebar
  const sidebar = useSidebarBridge(app);
  // Quick-create (desktop popup + mobile drawer)
  const quickCreate = useQuickCreateController(app, isMobile, sidebar.enabled);
  // Theme
  const [theme, setTheme] = useState<ThemeMode>(() => app.getTheme());

  useEffect(
    () => app.subscribeThemeChange(newTheme => setTheme(newTheme)),
    [app]
  );

  const handleThemeChange = useCallback(
    (newTheme: ThemeMode) => app.setTheme(newTheme),
    [app]
  );
  // Cross-cutting: dismiss UI
  // Patches the app callback so that app.dismissUI() collapses any open
  // UI layer (detail panel or mobile drawer) and chains the previous handler.
  useEffect(() => {
    const callbacks = (
      app as unknown as { callbacks: { onDismissUI?: () => void } }
    ).callbacks;
    const prevDismiss = callbacks.onDismissUI;

    callbacks.onDismissUI = () => {
      if (eventDialog.detailPanelEventId) {
        eventDialog.setDetailPanelEventId(null);
      }
      if (quickCreate.isMobileDrawerOpen) {
        quickCreate.setIsMobileDrawerOpen(false);
      }
      prevDismiss?.();
    };

    return () => {
      callbacks.onDismissUI = prevDismiss;
    };
  }, [app, eventDialog, quickCreate]);

  // On mobile, route event-tap detail requests to the MobileEventDrawer instead
  // of the floating desktop panel. detailPanelEventId is set by handleTouchEnd
  // (via onDetailPanelToggle) when canOpenDetail is true.
  useEffect(() => {
    if (!isMobile || !eventDialog.detailPanelEventId) return;

    const rawEventId = eventDialog.detailPanelEventId.split('::')[0];
    const event = app
      .getEvents()
      .find((e: CalendarEvent) => e.id === rawEventId);
    if (event) {
      quickCreate.setMobileDraftEvent(event);
      quickCreate.setIsMobileDrawerOpen(true);
    }
    eventDialog.setDetailPanelEventId(null);
  }, [eventDialog.detailPanelEventId, isMobile]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      app.setCurrentDate(date);
      app.selectEvent(null);
    },
    [app]
  );

  const handleEventSelect = useCallback(
    (id: string | null) => app.selectEvent(id),
    [app]
  );

  // Layout helpers
  const calendarRef = useRef<HTMLDivElement>(null!);

  const viewProps = {
    app,
    config: app.getCurrentView().config || {},
    customDetailPanelContent,
    customEventDetailDialog: effectiveEventDetailDialog,
    switcherMode: app.state.switcherMode,
    calendarRef,
    meta,
    selectedEventId,
    onEventSelect: handleEventSelect,
    onDateChange: handleDateSelect,
    detailPanelEventId: eventDialog.detailPanelEventId,
    onDetailPanelToggle: eventDialog.setDetailPanelEventId,
  };

  // Stable args object so the titleBarSlot ContentSlot does not re-register
  // on every CalendarRoot render.
  const titleBarSlotArgs = useMemo(
    () => ({
      isCollapsed: sidebar.isCollapsed,
      toggleCollapsed: sidebar.toggleCollapsed,
    }),
    [sidebar.isCollapsed, sidebar.toggleCollapsed]
  );

  const miniSidebarWidth =
    collapsedSafeAreaLeft === null ? sidebar.miniWidth : '0px';

  const effectiveCollapsedSafeAreaLeft = collapsedSafeAreaLeft ?? null;
  const safeAreaLeft =
    effectiveCollapsedSafeAreaLeft === null || !sidebar.isCollapsed
      ? sidebar.safeAreaLeft
      : effectiveCollapsedSafeAreaLeft;

  const headerConfig = app.getCalendarHeaderConfig();

  const headerProps = {
    calendar: app,
    switcherMode: app.state.switcherMode,
    onAddCalendar: quickCreate.handleAddButtonClick,
    onSearchChange: search.setSearchKeyword,
    onSearchClick: search.handleSearchClick,
    searchValue: search.searchKeyword,
    isSearchOpen: search.isSearchOpen,
    isEditable: !app.state.readOnly,
    ...(safeAreaLeft > 0 ? { safeAreaLeft } : {}),
  };

  const renderHeader = () => {
    if (headerConfig === false) return null;
    if (typeof headerConfig === 'function') return headerConfig(headerProps);
    return h(CalendarHeader, headerProps);
  };

  // Only create the Preact fallback portal when the slot is NOT yet overridden
  // by a framework adapter, to prevent a brief flash of the default dialog
  // while React/Vue sets up its override via setOverrides().
  const renderEventDetailDialog = () => {
    if (!eventDialog.dialogProps) return null;

    const DialogComponent = effectiveEventDetailDialog!;
    const portalTarget = typeof document === 'undefined' ? null : document.body;
    if (!portalTarget) return null;

    const isOverridden =
      customRenderingStore?.isOverridden('eventDetailDialog');

    return (
      <ContentSlot
        store={customRenderingStore}
        generatorName='eventDetailDialog'
        generatorArgs={eventDialog.dialogProps}
        defaultContent={
          isOverridden
            ? null
            : createPortal(
                h(DialogComponent, eventDialog.dialogProps),
                portalTarget
              )
        }
      />
    );
  };

  const ViewComponent = app.getCurrentView().component;
  const MobileEventDrawerComponent =
    app.getCustomMobileEventRenderer() || MobileEventDrawer;

  return (
    <ThemeProvider initialTheme={theme} onThemeChange={handleThemeChange}>
      <CalendarInternalLocaleProvider
        locale={app.state.locale}
        messages={customMessages}
      >
        <div className='df-calendar-container relative flex flex-row overflow-hidden select-none'>
          <ContentSlot
            store={customRenderingStore}
            generatorName='titleBarSlot'
            generatorArgs={titleBarSlotArgs}
            defaultContent={
              titleBarSlot &&
              (typeof titleBarSlot === 'function'
                ? titleBarSlot(titleBarSlotArgs)
                : titleBarSlot)
            }
          />

          {sidebar.enabled && (
            <aside
              className='absolute top-0 bottom-0 left-0 z-0 h-full'
              style={{ width: sidebar.width }}
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

            <div className='flex-1 overflow-hidden relative' ref={calendarRef}>
              <div className='calendar-renderer h-full relative flex flex-row'>
                <div className='flex-1 h-full overflow-hidden'>
                  <ViewComponent {...viewProps} />
                </div>

                <SearchDrawer
                  isOpen={search.isSearchOpen}
                  onClose={search.handleSearchClose}
                  loading={search.searchLoading}
                  results={search.searchResults}
                  keyword={search.searchKeyword}
                  onResultClick={search.handleSearchResultClick}
                  emptyText={searchConfig?.emptyText}
                />
              </div>

              <MobileSearchDialog
                isOpen={search.isMobileSearchOpen}
                onClose={search.handleMobileSearchClose}
                keyword={search.searchKeyword}
                onSearchChange={search.setSearchKeyword}
                results={search.searchResults}
                loading={search.searchLoading}
                onResultClick={search.handleSearchResultClick}
                emptyText={searchConfig?.emptyText}
              />
            </div>
          </div>

          <QuickCreateEventPopup
            app={app}
            anchorRef={quickCreate.quickCreateAnchorRef}
            isOpen={quickCreate.isQuickCreateOpen}
            onClose={() => quickCreate.setIsQuickCreateOpen(false)}
          />

          <MobileEventDrawerComponent
            isOpen={quickCreate.isMobileDrawerOpen}
            onClose={() => {
              quickCreate.setIsMobileDrawerOpen(false);
              quickCreate.setMobileDraftEvent(null);
            }}
            onSave={(event: CalendarEvent) => {
              const exists = app
                .getEvents()
                .some((e: CalendarEvent) => e.id === event.id);
              if (exists) {
                app.updateEvent(event.id, event);
              } else {
                app.addEvent(event);
              }
              quickCreate.setIsMobileDrawerOpen(false);
              quickCreate.setMobileDraftEvent(null);
            }}
            onEventDelete={(id: string) => {
              app.deleteEvent(id);
              quickCreate.setIsMobileDrawerOpen(false);
              quickCreate.setMobileDraftEvent(null);
            }}
            draftEvent={quickCreate.mobileDraftEvent}
            app={app}
          />

          {sidebar.extraContent}
          {quickCreate.isCreateCalendarOpen && (
            <CreateCalendarDialog
              onClose={() => quickCreate.setIsCreateCalendarOpen(false)}
              onCreate={calendar => {
                app.createCalendar(calendar);
                quickCreate.setIsCreateCalendarOpen(false);
              }}
            />
          )}
          {renderEventDetailDialog()}
        </div>
      </CalendarInternalLocaleProvider>
    </ThemeProvider>
  );
};
