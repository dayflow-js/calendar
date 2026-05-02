import { ComponentChildren, RefObject } from 'preact';

import { MultiDayEventSegment } from '@/components/monthView/util';
import { YearMultiDaySegment } from '@/components/yearView/utils';
import { Event, EventLayout, ICalendarApp, ViewType } from '@/types';

export interface CalendarEventProps {
  event: Event;
  layout?: EventLayout;
  isAllDay?: boolean;
  allDayHeight?: number;
  calendarRef: RefObject<HTMLDivElement>;
  isBeingDragged?: boolean;
  isBeingResized?: boolean;
  viewType: ViewType;
  isMultiDay?: boolean;
  segment?: MultiDayEventSegment;
  yearSegment?: YearMultiDaySegment;
  columnsPerRow?: number;
  segmentIndex?: number;
  hourHeight: number;
  firstHour: number;
  newlyCreatedEventId?: string | null;
  selectedEventId?: string | null;
  detailPanelEventId?: string | null;
  onMoveStart?: (e: MouseEvent | TouchEvent, event: Event) => void;
  onResizeStart?: (
    e: MouseEvent | TouchEvent,
    event: Event,
    direction: string
  ) => void;
  onEventUpdate: (updatedEvent: Event) => void;
  onEventDelete: (eventId: string) => void;
  onDetailPanelOpen?: () => void;
  onEventSelect?: (eventId: string | null) => void;
  onEventLongPress?: (eventId: string) => void;
  onDetailPanelToggle?: (eventId: string | null) => void;
  /** When false, suppresses the floating event detail panel entirely */
  useEventDetailPanel?: boolean;
  /** Multi-day regular event segment information */
  multiDaySegmentInfo?: {
    startHour: number;
    endHour: number;
    isFirst: boolean;
    isLast: boolean;
    dayIndex?: number;
  };
  app?: ICalendarApp;
  /** Whether the current view is in mobile mode */
  isMobile?: boolean;
  /** Whether the current view is in mobile sliding mode */
  isSlidingView?: boolean;
  /** Force enable touch interactions regardless of isMobile */
  enableTouch?: boolean;
  /** Whether to hide the time in the event display (Month view regular events only) */
  hideTime?: boolean;
  /** Time format for event display */
  timeFormat?: '12h' | '24h';
  /** Optional style override for custom view layouts */
  styleOverride?: Record<string, string | number>;
  /** Optional additional class names */
  className?: string;
  /** Disable built-in layout calculation and rely on styleOverride */
  disableDefaultStyle?: boolean;
  /**
   * Override the visual content rendered inside the event shell.
   * The function receives the built-in default content as its argument,
   * which can be wrapped, replaced, or ignored entirely.
   */
  renderVisualContent?: (
    defaultContent: ComponentChildren
  ) => ComponentChildren;
  /** Override resize handle orientation for custom views */
  resizeHandleOrientation?: 'vertical' | 'horizontal';
  /** App-level timezone used to project event times for display (Month/Year view). */
  appTimeZone?: string;
}
