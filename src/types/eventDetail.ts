// Event detail panel related type definitions

import { Event } from './event';
import { EventDetailPosition } from './dragIndicator';
import { CalendarApp } from '../types';

// Re-export EventDetailPosition for convenience
export type { EventDetailPosition } from './dragIndicator';

/**
 * Event detail panel Props
 */
export interface EventDetailPanelProps {
  /** Current event data */
  event: Event;
  /** Panel position information */
  position: EventDetailPosition;
  /** Panel DOM reference */
  panelRef: React.RefObject<HTMLDivElement>;
  /** Whether the event is all-day */
  isAllDay: boolean;
  /** Event visibility state */
  eventVisibility: 'visible' | 'sticky-top' | 'sticky-bottom';
  /** Calendar container reference */
  calendarRef: React.RefObject<HTMLDivElement>;
  /** Selected event element reference */
  selectedEventElementRef: React.RefObject<HTMLDivElement>;
  /** Event update callback */
  onEventUpdate: (updatedEvent: Event) => void;
  /** Event delete callback */
  onEventDelete: (eventId: string) => void;
  /** Close panel callback (optional) */
  onClose?: () => void;
}

/**
 * Custom event detail panel renderer (full panel including positioning and styling)
 */
export type EventDetailPanelRenderer =
  React.ComponentType<EventDetailPanelProps>;

/**
 * Event detail content Props (excluding panel container, content only)
 */
export interface EventDetailContentProps {
  /** Current event data */
  event: Event;
  /** Whether the event is all-day */
  isAllDay: boolean;
  /** Event update callback */
  onEventUpdate: (updatedEvent: Event) => void;
  /** Event delete callback */
  onEventDelete: (eventId: string) => void;
  /** Close panel callback (optional) */
  onClose?: () => void;
}

/**
 * Custom event detail content renderer (content only, will be wrapped in default panel)
 */
export type EventDetailContentRenderer =
  React.ComponentType<EventDetailContentProps>;

/**
 * Event detail dialog Props
 */
export interface EventDetailDialogProps {
  /** Current event data */
  event: Event;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Whether the event is all-day */
  isAllDay: boolean;
  /** Event update callback */
  onEventUpdate: (updatedEvent: Event) => void;
  /** Event delete callback */
  onEventDelete: (eventId: string) => void;
  /** Close dialog callback */
  onClose: () => void;
  app?: CalendarApp;
}

/**
 * Custom event detail dialog renderer (Dialog/Modal mode)
 */
export type EventDetailDialogRenderer =
  React.ComponentType<EventDetailDialogProps>;
