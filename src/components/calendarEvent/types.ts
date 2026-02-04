import {
  Event,
  EventLayout,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
} from '@/types';
import { CalendarApp } from '@/core';
import { MultiDayEventSegment } from '../monthView/WeekComponent';

export interface CalendarEventProps {
  event: Event;
  layout?: EventLayout;
  isAllDay?: boolean;
  allDayHeight?: number;
  calendarRef: React.RefObject<HTMLDivElement>;
  isBeingDragged?: boolean;
  isBeingResized?: boolean;
  isDayView?: boolean;
  isMonthView?: boolean;
  isMultiDay?: boolean;
  segment?: MultiDayEventSegment;
  segmentIndex?: number;
  hourHeight: number;
  firstHour: number;
  newlyCreatedEventId?: string | null;
  selectedEventId?: string | null;
  detailPanelEventId?: string | null;
  onMoveStart?: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.TouchEvent<HTMLDivElement>,
    event: Event
  ) => void;
  onResizeStart?: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.TouchEvent<HTMLDivElement>,
    event: Event,
    direction: string
  ) => void;
  onEventUpdate: (updatedEvent: Event) => void;
  onEventDelete: (eventId: string) => void;
  onDetailPanelOpen?: () => void;
  onEventSelect?: (eventId: string | null) => void;
  onEventLongPress?: (eventId: string) => void;
  onDetailPanelToggle?: (eventId: string | null) => void;
  /** Custom event detail content component (content only, will be wrapped in default panel) */
  customDetailPanelContent?: EventDetailContentRenderer;
  /** Custom event detail dialog component (Dialog mode) */
  customEventDetailDialog?: EventDetailDialogRenderer;
  /** Multi-day regular event segment information */
  multiDaySegmentInfo?: { startHour: number; endHour: number; isFirst: boolean; isLast: boolean; dayIndex?: number };
  app?: CalendarApp;
  /** Whether the current view is in mobile mode */
  isMobile?: boolean;
  /** Force enable touch interactions regardless of isMobile */
  enableTouch?: boolean;
  /** Whether to hide the time in the event display (Month view regular events only) */
  hideTime?: boolean;
}
