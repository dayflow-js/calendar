// Plugin module export file
import { createEventsPlugin } from './eventsPlugin';

export * from './eventsPlugin';
export * from './dragBridge';

// Convenient plugin package creation function
export function createStandardPlugins(config?: {
  events?: Partial<import('../types').EventsPluginConfig>;
}) {
  return [createEventsPlugin(config?.events)];
}
