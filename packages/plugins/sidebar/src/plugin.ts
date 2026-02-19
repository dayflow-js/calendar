import { h } from 'preact';
import {
  CalendarPlugin,
  ICalendarApp,
  CalendarType,
  TNode,
  CreateCalendarDialogProps,
} from '@dayflow/core';
import DefaultCalendarSidebar from './DefaultCalendarSidebar';

export interface SidebarPluginConfig {
  width?: number | string;
  initialCollapsed?: boolean;
  createCalendarMode?: 'inline' | 'modal';
  colorPickerMode?: 'blossom' | 'default';
  renderCalendarContextMenu?: (
    calendar: CalendarType,
    onClose: () => void
  ) => TNode;
  renderCreateCalendarDialog?: (props: CreateCalendarDialogProps) => TNode;
}

export function createSidebarPlugin(
  config: SidebarPluginConfig = {}
): CalendarPlugin {
  return {
    name: 'sidebar',
    install(app: ICalendarApp) {
      app.updateConfig({
        useSidebar: {
          enabled: true,
          width: config.width,
          initialCollapsed: config.initialCollapsed,
          createCalendarMode: config.createCalendarMode,
          colorPickerMode: config.colorPickerMode,
          renderCalendarContextMenu: config.renderCalendarContextMenu,
          renderCreateCalendarDialog: config.renderCreateCalendarDialog,
          render: (props) =>
            h(DefaultCalendarSidebar, {
              ...props,
              colorPickerMode: config.colorPickerMode ?? props.colorPickerMode,
            }),
        },
      });
    },
  };
}
