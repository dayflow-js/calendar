import {
  CalendarPlugin,
  ICalendarApp,
  CalendarType,
  Event,
  TNode,
  CreateCalendarDialogProps,
  SidebarHeaderSlotArgs,
  registerSidebarImplementation,
  SidebarBridgeReturn,
  normalizeCssWidth,
  getCalendarColorsForHex,
  generateUniKey,
  useLocale,
  ContentSlot,
  CreateCalendarDialog,
} from '@dayflow/core';
import { h } from 'preact';
import { useState, useCallback, useMemo, useEffect } from 'preact/hooks';

import DefaultCalendarSidebar from './DefaultCalendarSidebar';

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

export type { SidebarHeaderSlotArgs };

export interface CalendarSidebarRenderProps {
  app: ICalendarApp;
  calendars: CalendarType[];
  toggleCalendarVisibility: (calendarId: string, visible: boolean) => void;
  toggleAll: (visible: boolean) => void;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  showEventDots?: boolean;
  renderCalendarContextMenu?: (
    calendar: CalendarType,
    onClose: () => void
  ) => TNode;
  renderSidebarHeader?: (args: SidebarHeaderSlotArgs) => TNode;
  createCalendarMode?: 'inline' | 'modal';
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => TNode;
  editingCalendarId?: string | null;
  setEditingCalendarId?: (id: string | null) => void;
  onCreateCalendar?: (source?: string) => void;
  onSubscribeCalendar?: (
    calendar: CalendarType,
    events: Event[]
  ) => Promise<void>;
  onLoadSubscription?: (calendar: CalendarType) => Promise<void>;
  onReorder?: (calendars: CalendarType[]) => void | Promise<void>;
  groups?: string[];
  onGroupCreate?: (groupName: string) => void | Promise<void>;
  onGroupRename?: (
    previousName: string,
    nextName: string,
    calendars: CalendarType[]
  ) => void | Promise<void>;
  onGroupDelete?: (
    groupName: string,
    calendars: CalendarType[]
  ) => void | Promise<void>;
  onGroupReorder?: (groups: string[]) => void | Promise<void>;
  componentsOrder?: ('calendarList' | 'miniCalendar')[];
  groupStatus?: Record<string, { isLoading: boolean }>;
}
export interface SidebarPluginConfig {
  width?: number | string;
  miniWidth?: string;
  initialCollapsed?: boolean;
  showEventDots?: boolean;
  createCalendarMode?: 'inline' | 'modal';
  render?: (props: CalendarSidebarRenderProps) => TNode;
  renderCalendarContextMenu?: (
    calendar: CalendarType,
    onClose: () => void
  ) => TNode;
  renderSidebarHeader?: (args: SidebarHeaderSlotArgs) => TNode;
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => TNode;
  onSubscribeCalendar?: (
    calendar: CalendarType,
    events: Event[]
  ) => Promise<void>;
  onLoadSubscription?: (calendar: CalendarType) => Promise<void>;
  onReorder?: (calendars: CalendarType[]) => void | Promise<void>;
  groups?: string[];
  onGroupCreate?: (groupName: string) => void | Promise<void>;
  onGroupRename?: (
    previousName: string,
    nextName: string,
    calendars: CalendarType[]
  ) => void | Promise<void>;
  onGroupDelete?: (
    groupName: string,
    calendars: CalendarType[]
  ) => void | Promise<void>;
  onGroupReorder?: (groups: string[]) => void | Promise<void>;
  componentsOrder?: ('calendarList' | 'miniCalendar')[];
  groupStatus?: Record<string, { isLoading: boolean }>;
}

/** Control handle written by the Preact bridge on every render cycle. */
interface SidebarControlRef {
  setCollapsed: ((collapsed: boolean) => void) | null;
  currentCollapsed: boolean;
}

/**
 * Programmatic API returned by `app.getPlugin<SidebarService>('sidebar')`.
 *
 * @example
 * const sidebar = app.getPlugin<SidebarService>('sidebar');
 * sidebar?.collapse();
 */
export interface SidebarService {
  /** Collapse the sidebar. No-ops if the sidebar has not yet rendered. */
  collapse: () => void;
  /** Expand the sidebar. No-ops if the sidebar has not yet rendered. */
  expand: () => void;
  /** Set collapsed state explicitly. */
  setCollapsed: (collapsed: boolean) => void;
  /** Returns the current collapsed state. */
  isCollapsed: () => boolean;
}

/**
 * One control handle per app. The bridge below is registered once for the
 * whole page, so anything instance-specific has to be looked up from the app
 * it is called with — never captured from the plugin that registered it.
 */
const controlRefs = new WeakMap<ICalendarApp, SidebarControlRef>();

const getSidebarConfig = (app: ICalendarApp): SidebarPluginConfig =>
  app.getPluginConfig('sidebar') as SidebarPluginConfig;

function useSidebar(app: ICalendarApp): SidebarBridgeReturn {
  const { t } = useLocale();

  const [isCollapsed, setIsCollapsed] = useState(
    () => getSidebarConfig(app).initialCollapsed ?? false
  );

  // Keep the programmatic API in sync with the current render state.
  const controlRef = controlRefs.get(app);
  if (controlRef) {
    controlRef.setCollapsed = setIsCollapsed;
    controlRef.currentCollapsed = isCollapsed;
  }

  const [sidebarVersion, setSidebarVersion] = useState(0);
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(
    null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createCalendarSource, setCreateCalendarSource] = useState<
    string | undefined
  >();
  const isEditable = app.canMutateFromUI();

  const refreshSidebar = useCallback(() => {
    setSidebarVersion(prev => prev + 1);
  }, []);

  useEffect(
    () =>
      app.subscribe(() => {
        refreshSidebar();
      }),
    [app, refreshSidebar]
  );

  const calendars = useMemo(() => app.getCalendars(), [app, sidebarVersion]);

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

  const handleCreateCalendar = useCallback(
    (source?: string) => {
      if (!isEditable) return;

      const createMode = getSidebarConfig(app).createCalendarMode || 'inline';

      if (createMode === 'modal') {
        setCreateCalendarSource(source);
        setShowCreateDialog(true);
        return;
      }

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
        ...(source ? { source } : {}),
      };

      app.createCalendar(newCalendar);
      setEditingCalendarId(newId);
      refreshSidebar();
    },
    [app, isEditable, t, refreshSidebar]
  );

  useEffect(() => {
    if (isEditable) return;

    setShowCreateDialog(false);
    setCreateCalendarSource(undefined);
    setEditingCalendarId(null);
  }, [isEditable]);

  const sidebarProps: CalendarSidebarRenderProps = useMemo(() => {
    const currentConfig = getSidebarConfig(app);
    return {
      app,
      calendars,
      toggleCalendarVisibility: handleToggleCalendarVisibility,
      toggleAll: handleToggleAllCalendars,
      isCollapsed,
      setCollapsed: setIsCollapsed,
      showEventDots: currentConfig.showEventDots,
      renderCalendarContextMenu: currentConfig.renderCalendarContextMenu,
      renderSidebarHeader: currentConfig.renderSidebarHeader,
      createCalendarMode: currentConfig.createCalendarMode,
      renderCreateCalendarDialog: currentConfig.renderCreateCalendarDialog,
      editingCalendarId,
      setEditingCalendarId,
      onCreateCalendar: handleCreateCalendar,
      onSubscribeCalendar: currentConfig.onSubscribeCalendar,
      onLoadSubscription: currentConfig.onLoadSubscription,
      onReorder: currentConfig.onReorder,
      groups: currentConfig.groups,
      onGroupCreate: currentConfig.onGroupCreate,
      onGroupRename: currentConfig.onGroupRename,
      onGroupDelete: currentConfig.onGroupDelete,
      onGroupReorder: currentConfig.onGroupReorder,
      componentsOrder: currentConfig.componentsOrder,
      groupStatus: currentConfig.groupStatus,
    };
  }, [
    app,
    calendars,
    handleToggleCalendarVisibility,
    handleToggleAllCalendars,
    isCollapsed,
    handleCreateCalendar,
    editingCalendarId,
    sidebarVersion, // Depend on sidebarVersion to refresh when config updates trigger notify()
  ]);

  const renderContent = () => {
    const currentConfig = getSidebarConfig(app);
    if (currentConfig.render || app.state.overrides.includes('sidebar')) {
      return h(ContentSlot, {
        generatorName: 'sidebar',
        generatorArgs: sidebarProps,
      });
    }
    return h(DefaultCalendarSidebar, {
      ...sidebarProps,
    });
  };

  const renderExtraContent = () => {
    if (!isEditable || !showCreateDialog) return null;

    const onClose = () => {
      setShowCreateDialog(false);
      setCreateCalendarSource(undefined);
    };
    const onCreate = async (newCalendar: unknown) => {
      const calendar = newCalendar as CalendarType;
      await app.createCalendar(
        createCalendarSource
          ? { ...calendar, source: createCalendarSource }
          : calendar
      );
      setShowCreateDialog(false);
      setCreateCalendarSource(undefined);
      refreshSidebar();
    };

    const generatorArgs = {
      onClose,
      onCreate,
      app,
    };

    return h(ContentSlot, {
      generatorName: 'createCalendarDialog',
      generatorArgs,
      defaultContent: h(CreateCalendarDialog, {
        onClose,
        onCreate,
        app,
      }),
    });
  };

  const currentConfig = getSidebarConfig(app);
  return {
    enabled: true,
    width: normalizeCssWidth(currentConfig.width, DEFAULT_SIDEBAR_WIDTH),
    isCollapsed,
    toggleCollapsed: () => setIsCollapsed(prev => !prev),
    miniWidth: currentConfig.miniWidth ?? '50px',
    content: renderContent(),
    extraContent: renderExtraContent(),
    safeAreaLeft: 0,
  };
}

export function createSidebarPlugin(
  config: SidebarPluginConfig = {}
): CalendarPlugin {
  const controlRef: SidebarControlRef = {
    setCollapsed: null,
    currentCollapsed: config.initialCollapsed ?? false,
  };

  const sidebarService: SidebarService = {
    collapse: () => controlRef.setCollapsed?.(true),
    expand: () => controlRef.setCollapsed?.(false),
    setCollapsed: (collapsed: boolean) => controlRef.setCollapsed?.(collapsed),
    isCollapsed: () => controlRef.currentCollapsed,
  };

  return {
    name: 'sidebar',
    config,
    api: sidebarService,
    install(app: ICalendarApp) {
      controlRefs.set(app, controlRef);
      registerSidebarImplementation(useSidebar);
    },
  };
}
