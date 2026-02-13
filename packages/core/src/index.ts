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
export { createDragPlugin } from './plugins/dragPlugin';
export { createEventsPlugin } from './plugins/eventsPlugin';

// Styles
import './styles/tailwind.css';
// Note: consumers should import '@dayflow/core/dist/styles.css'
