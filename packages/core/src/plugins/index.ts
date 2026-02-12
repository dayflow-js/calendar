// Plugin module export file
import { createEventsPlugin } from './eventsPlugin';
import { createDragPlugin } from './dragPlugin';

export * from './eventsPlugin';
export * from './dragPlugin';

// Convenient plugin package creation function
export function createStandardPlugins(config?: {
  events?: Partial<import('../types').EventsPluginConfig>;
  drag?: Partial<import('../types').DragPluginConfig>;
}) {
  return [createEventsPlugin(config?.events), createDragPlugin(config?.drag)];
}
