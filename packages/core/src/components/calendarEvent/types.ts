import {
  Event,
  EventLayout,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
} from '@/types';
import { MultiDayEventSegment } from '../monthView/WeekComponent';

export interface CalendarEventProps {
  event: Event;
  layout?: EventLayout;
  isAllDay?: boolean;
  allDayHeight?: number;
  calendarRef: any;
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
  onMoveStart?: (e: any | any, event: Event) => void;
  onResizeStart?: (e: any | any, event: Event, direction: string) => void;
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
  /** Force enable touch interactions regardless of isMobile */
  enableTouch?: boolean;
  /** Whether to hide the time in the event display (Month view regular events only) */
  hideTime?: boolean;
}
