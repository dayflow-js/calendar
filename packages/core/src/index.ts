// Core library entry file

// Calendar App and Registry
export { CalendarApp } from './core/CalendarApp';
export type { ICalendarApp } from './types';
export { CalendarRegistry } from './core/calendarRegistry';

// Renderer
export { CalendarRenderer } from './renderer/CalendarRenderer';
export { CustomRenderingStore } from './renderer/CustomRenderingStore';
export type { CustomRendering } from './renderer/CustomRenderingStore';

// Types
export * from './types';

// Utils
export * from './utils';

// Locale
export * from './locale';

// Factories
export * from './factories';

// Plugins
export { createEventsPlugin } from './plugins/eventsPlugin';
export { registerDragImplementation, useDragForView } from './plugins/dragBridge';
export { registerSidebarImplementation, useSidebarBridge } from './plugins/sidebarBridge';
export type { SidebarBridgeReturn } from './plugins/sidebarBridge';

// Context Menu Primitives
export {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuColorPicker,
} from './components/contextMenu';

// Calendar Registry helpers
export { getCalendarColorsForHex } from './core/calendarRegistry';

// Common Components
export { BlossomColorPicker } from './components/common/BlossomColorPicker';
export { DefaultColorPicker } from './components/common/DefaultColorPicker';
export { MiniCalendar } from './components/common/MiniCalendar';
export { CreateCalendarDialog } from './components/common/CreateCalendarDialog';
export { ContentSlot } from './renderer/ContentSlot';

// Icons
export {
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Plus,
} from './components/common/Icons';

// Sidebar classNames
export {
  sidebarContainer,
  sidebarHeader,
  sidebarHeaderToggle,
  sidebarHeaderTitle,
  cancelButton,
  calendarPickerDropdown,
} from './styles/classNames';

// Preact interop (re-export so plugins use the same preact instance as core)
export { createPortal } from 'preact/compat';

// Styles
import './styles/tailwind.css';
// Note: consumers should import '@dayflow/core/dist/styles.css'
