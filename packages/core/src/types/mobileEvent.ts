import { Event } from './event';
import { ICalendarApp } from './core';

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
  /** Current event data (newly created template or existing event) */
  draftEvent: Event | null;
  /** The ICalendarApp instance providing built-in services */
  app: ICalendarApp;
}

/**
 * Custom mobile event renderer (Drawer or Dialog)
 */
export type MobileEventRenderer = any;
