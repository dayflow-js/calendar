import type { ICalendarApp, TNode } from '../types';

export interface SidebarBridgeReturn {
  enabled: boolean;
  width: string;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  miniWidth: string;
  content: TNode | null;
  extraContent: TNode | null;
  safeAreaLeft: number;
}

type SidebarBridgeFn = (app: ICalendarApp) => SidebarBridgeReturn;

let impl: SidebarBridgeFn | null = null;

export function registerSidebarImplementation(fn: SidebarBridgeFn) {
  impl = fn;
}

const NO_OP: SidebarBridgeReturn = {
  enabled: false,
  width: '0px',
  isCollapsed: false,
  toggleCollapsed: () => {},
  miniWidth: '0px',
  content: null,
  extraContent: null,
  safeAreaLeft: 0,
};

export function useSidebarBridge(app: ICalendarApp): SidebarBridgeReturn {
  if (impl && app.hasPlugin('sidebar')) return impl(app);
  return NO_OP;
}
