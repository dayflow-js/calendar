import { ViewType, Event, ICalendarApp, ViewMode } from '@/types';
import MultiDayEvent from '../../monthView/MultiDayEvent';
import MonthRegularContent from './MonthRegularContent';
import MonthAllDayContent from './MonthAllDayContent';
import AllDayContent from './AllDayContent';
import RegularEventContent from './RegularEventContent';
import YearEventContent from './YearEventContent';
import { ContentSlot } from '../../../renderer/ContentSlot';
import { MultiDayEventSegment } from '../../monthView/WeekComponent';
import { YearMultiDaySegment } from '../../yearView/utils';

interface EventContentProps {
  event: Event;
  viewType: ViewType;
  isAllDay: boolean;
  isMultiDay: boolean;
  segment?: MultiDayEventSegment;
  yearSegment?: YearMultiDaySegment;
  segmentIndex: number;
  isBeingDragged: boolean;
  isBeingResized: boolean;
  isEventSelected: boolean;
  isPopping: boolean;
  isEditable: boolean;
  isDraggable: boolean;
  canOpenDetail: boolean;
  isTouchEnabled: boolean;
  hideTime?: boolean;
  isMobile: boolean;
  mode?: ViewMode;
  isCompact?: boolean;
  mobilePageStart?: Date;
  app?: ICalendarApp;
  onResizeStart?: (e: any, event: Event, direction: string) => void;
  multiDaySegmentInfo?: any;
  customRenderingStore: any;
  eventContentSlotArgs: any;
  layout?: any;
}

export const EventContent = ({
  event,
  viewType,
  isAllDay,
  isMultiDay,
  segment,
  yearSegment,
  segmentIndex,
  isBeingDragged,
  isBeingResized,
  isEventSelected,
  isPopping,
  isEditable,
  isDraggable,
  canOpenDetail,
  isTouchEnabled,
  hideTime,
  isMobile,
  mode = 'standard',
  isCompact,
  mobilePageStart,
  app,
  onResizeStart,
  multiDaySegmentInfo,
  customRenderingStore,
  eventContentSlotArgs,
  layout,
}: EventContentProps) => {
  const isMonthView = viewType === ViewType.MONTH;
  const isYearView = viewType === ViewType.YEAR;

  let defaultContent;
  if (isYearView && yearSegment) {
    defaultContent = (
      <YearEventContent
        event={event}
        segment={yearSegment}
        isEditable={isEditable}
        onResizeStart={onResizeStart}
      />
    );
  } else if (isMonthView) {
    if (isMultiDay && segment) {
      defaultContent = (
        <MultiDayEvent
          segment={segment}
          segmentIndex={segmentIndex ?? 0}
          isDragging={isBeingDragged || isEventSelected}
          isResizing={isBeingResized}
          isSelected={isEventSelected}
          onMoveStart={() => {}} // Note: onMoveStart is handled via onMouseDown in CalendarEvent
          onResizeStart={onResizeStart}
          isMobile={isMobile}
          isDraggable={isDraggable}
          isEditable={isEditable}
          viewable={canOpenDetail}
          isPopping={isPopping}
        />
      );
    } else {
      defaultContent = event.allDay ? (
        <MonthAllDayContent event={event} isEventSelected={isEventSelected} />
      ) : (
        <MonthRegularContent
          event={event}
          app={app}
          isEventSelected={isEventSelected}
          hideTime={hideTime}
          isMobile={isMobile}
        />
      );
    }
  } else {
    defaultContent = event.allDay ? (
      <AllDayContent
        event={event}
        isEditable={isEditable}
        onResizeStart={onResizeStart}
        isMultiDay={isMultiDay}
        segment={segment}
        mode={mode}
        isCompact={isCompact}
      />
    ) : (
      <RegularEventContent
        event={event}
        app={app}
        multiDaySegmentInfo={multiDaySegmentInfo}
        isEditable={isEditable}
        isTouchEnabled={isTouchEnabled}
        isEventSelected={isEventSelected}
        onResizeStart={onResizeStart}
      />
    );
  }

  return (
    <ContentSlot
      store={customRenderingStore}
      generatorName="eventContent"
      generatorArgs={eventContentSlotArgs}
      defaultContent={defaultContent}
    />
  );
};
