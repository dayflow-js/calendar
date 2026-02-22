import { h } from 'preact';
import { useState, useCallback, useMemo, useEffect } from 'preact/hooks';
import {
  CalendarPlugin,
  ICalendarApp,
  CalendarType,
  TNode,
  CreateCalendarDialogProps,
  registerSidebarImplementation,
  SidebarBridgeReturn,
  normalizeCssWidth,
  getCalendarColorsForHex,
  generateUniKey,
  useLocale,
  ContentSlot,
  CreateCalendarDialog,
} from '@dayflow/core';
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

export interface CalendarSidebarRenderProps {
  app: ICalendarApp;
  calendars: CalendarType[];
  toggleCalendarVisibility: (calendarId: string, visible: boolean) => void;
  toggleAll: (visible: boolean) => void;
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  renderCalendarContextMenu?: (
    calendar: CalendarType,
    onClose: () => void
  ) => TNode;
  createCalendarMode?: 'inline' | 'modal';
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => TNode;
  editingCalendarId?: string | null;
  setEditingCalendarId?: (id: string | null) => void;
  onCreateCalendar?: () => void;
  colorPickerMode?: 'default' | 'custom';
}

export interface SidebarPluginConfig {
  width?: number | string;
  miniWidth?: string;
  initialCollapsed?: boolean;
  createCalendarMode?: 'inline' | 'modal';
  colorPickerMode?: 'default' | 'custom';
  render?: (props: CalendarSidebarRenderProps) => TNode;
  renderCalendarContextMenu?: (
    calendar: CalendarType,
    onClose: () => void
  ) => TNode;
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => TNode;
  [key: string]: unknown;
}

export function createSidebarPlugin(
  config: SidebarPluginConfig = {}
): CalendarPlugin {
  return {
    name: 'sidebar',
    config,
    install(_app: ICalendarApp) {
      const sidebarWidth = normalizeCssWidth(
        config.width,
        DEFAULT_SIDEBAR_WIDTH
      );

      registerSidebarImplementation(
        (app: ICalendarApp): SidebarBridgeReturn => {
          const { t } = useLocale();

          const [isCollapsed, setIsCollapsed] = useState(
            config.initialCollapsed ?? false
          );
          const [sidebarVersion, setSidebarVersion] = useState(0);
          const [editingCalendarId, setEditingCalendarId] = useState<
            string | null
          >(null);
          const [showCreateDialog, setShowCreateDialog] = useState(false);

          const refreshSidebar = useCallback(() => {
            setSidebarVersion(prev => prev + 1);
          }, []);

          useEffect(() => {
            return app.subscribe(() => {
              refreshSidebar();
            });
          }, [app, refreshSidebar]);

          const calendars = useMemo(
            () => app.getCalendars(),
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

          const handleCreateCalendar = useCallback(() => {
            const createMode = config.createCalendarMode || 'inline';

            if (createMode === 'modal') {
              setShowCreateDialog(true);
              return;
            }

            const randomColor =
              COLORS[Math.floor(Math.random() * COLORS.length)];
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
            refreshSidebar();
          }, [app, t, refreshSidebar]);

          const sidebarProps: CalendarSidebarRenderProps = useMemo(
            () => ({
              app,
              calendars,
              toggleCalendarVisibility: handleToggleCalendarVisibility,
              toggleAll: handleToggleAllCalendars,
              isCollapsed,
              setCollapsed: setIsCollapsed,
              renderCalendarContextMenu: config.renderCalendarContextMenu,
              createCalendarMode: config.createCalendarMode,
              renderCreateCalendarDialog: config.renderCreateCalendarDialog,
              editingCalendarId,
              setEditingCalendarId,
              onCreateCalendar: handleCreateCalendar,
              colorPickerMode: config.colorPickerMode,
            }),
            [
              app,
              calendars,
              handleToggleCalendarVisibility,
              handleToggleAllCalendars,
              isCollapsed,
              handleCreateCalendar,
              editingCalendarId,
              config,
            ]
          );

          const renderContent = () => {
            if (config.render) {
              return h(ContentSlot, {
                generatorName: 'sidebar',
                generatorArgs: sidebarProps,
              });
            }
            return h(DefaultCalendarSidebar, {
              ...sidebarProps,
              colorPickerMode:
                config.colorPickerMode ?? sidebarProps.colorPickerMode,
            });
          };

          const renderExtraContent = () => {
            if (!showCreateDialog) return null;

            const onClose = () => setShowCreateDialog(false);
            const onCreate = (newCalendar: any) => {
              app.createCalendar(newCalendar);
              setShowCreateDialog(false);
              refreshSidebar();
            };

            const generatorArgs = {
              onClose,
              onCreate,
              colorPickerMode: config.colorPickerMode,
            };

            return h(ContentSlot, {
              generatorName: 'createCalendarDialog',
              generatorArgs,
              defaultContent: h(CreateCalendarDialog, {
                onClose,
                onCreate,
                colorPickerMode: config.colorPickerMode,
              }),
            });
          };

          return {
            enabled: true,
            width: sidebarWidth,
            isCollapsed,
            toggleCollapsed: () => setIsCollapsed(prev => !prev),
            miniWidth: config.miniWidth ?? '50px',
            content: renderContent(),
            extraContent: renderExtraContent(),
            safeAreaLeft: 0,
          };
        }
      );
    },
  };
}
