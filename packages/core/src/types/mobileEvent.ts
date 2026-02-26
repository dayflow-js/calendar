import { ICalendarApp } from './core';
import { Event } from './event';

/**
 * Mobile event drawer/dialog Props
 */
export interface MobileEventProps {
  /** Whether the drawer/dialog is open */
  isOpen: boolean;
  /** Callback to close the drawer/dialog */
  onClose: () => void;
  /** Callback to save the event (creates or updates) */
  onSave: (event: Event) => void;
  /** Callback to delete an existing event by id */
  onEventDelete?: (id: string) => void;
  /** Current event data (newly created template or existing event) */
  draftEvent: Event | null;
  /** The ICalendarApp instance providing built-in services */
  app: ICalendarApp;
  /** Time format for event display */
  timeFormat?: '12h' | '24h';
}
