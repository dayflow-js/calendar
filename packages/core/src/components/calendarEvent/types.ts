import {
  Event,
  EventLayout,
  EventDetailContentRenderer,
  EventDetailDialogRenderer,
  ICalendarApp,
  ViewType,
  ViewMode,
} from '@/types';
import { MultiDayEventSegment } from '../monthView/WeekComponent';
import { YearMultiDaySegment } from '../yearView/utils';

export interface CalendarEventProps {
  event: Event;
  layout?: EventLayout;
  isAllDay?: boolean;
  allDayHeight?: number;
  calendarRef: any;
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
  onMoveStart?: (e: any, event: Event) => void;
  onResizeStart?: (e: any, event: Event, direction: string) => void;
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
  /** View display mode */
  mode?: ViewMode;
  /** Whether the current view is in mobile 2-column mode */
  isCompact?: boolean;
  /** The start date of the mobile page (for 2-column mode) */
  mobilePageStart?: Date;
  /** Force enable touch interactions regardless of isMobile */
  enableTouch?: boolean;
  /** Whether to hide the time in the event display (Month view regular events only) */
  hideTime?: boolean;
}
