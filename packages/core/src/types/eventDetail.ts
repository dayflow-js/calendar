// oxlint-disable typescript/no-explicit-any
import { AnyComponent, RefObject } from 'preact';

import { ICalendarApp } from '@/types';

import { EventDetailPosition } from './dragIndicator';
import { Event } from './event';

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
  panelRef: RefObject<HTMLDivElement>;
  /** Whether the event is all-day */
  isAllDay: boolean;
  /** Event visibility state */
  eventVisibility: 'visible' | 'sticky-top' | 'sticky-bottom';
  /** Calendar container reference */
  calendarRef: RefObject<HTMLDivElement>;
  /** Selected event element reference */
  selectedEventElementRef: RefObject<HTMLElement | null>;
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
export type EventDetailPanelRenderer = AnyComponent<EventDetailPanelProps, any>;

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
  app?: ICalendarApp;
}

/**
 * Custom event detail content renderer (content only, will be wrapped in default panel)
 */
export type EventDetailContentRenderer = AnyComponent<
  EventDetailContentProps,
  any
>;

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
  app?: ICalendarApp;
}

/**
 * Custom event detail dialog renderer (Dialog/Modal mode)
 */
export type EventDetailDialogRenderer = AnyComponent<
  EventDetailDialogProps,
  any
>;
